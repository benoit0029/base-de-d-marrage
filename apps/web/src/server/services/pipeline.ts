import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { saveDocumentFile } from "@/lib/storage";
import {
  classifyActivityAndType,
  classifyEmailRelevance,
  classifyEntryType,
  extractDocumentFields,
} from "@/lib/mistral/agents";
import type {
  Activity,
  AgentStep,
  Document,
  DocumentSource,
  Entry,
} from "@prisma/client";

export interface IngestInput {
  source: DocumentSource;
  fileBuffer: Buffer;
  mimeType: string;
  originalName: string;
  emailFrom?: string;
  emailSubject?: string;
  // Boîte mail d'origine (une par activité, voir .env.example) : indice quasi
  // certain de l'activité, à utiliser en priorité sur l'analyse du contenu.
  // Pertinent uniquement pour source = EMAIL.
  mailboxActivity?: Activity;
}

export interface IngestResult {
  document: Document;
  entry: Entry | null;
  ignoredAsNoise: boolean;
  failedStep: AgentStep | null;
  errorMessage: string | null;
}

async function runStep<T>(
  documentId: string,
  step: AgentStep,
  fn: () => Promise<T>
): Promise<{ ok: true; result: T } | { ok: false; error: string }> {
  const job = await prisma.extractionJob.create({
    data: { documentId, step, status: "RUNNING" },
  });

  try {
    const result = await fn();
    await prisma.extractionJob.update({
      where: { id: job.id },
      data: { status: "SUCCEEDED", resultJson: result as object, finishedAt: new Date() },
    });
    return { ok: true, result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.extractionJob.update({
      where: { id: job.id },
      data: { status: "FAILED", error: message, finishedAt: new Date() },
    });
    return { ok: false, error: message };
  }
}

function parseDateOrNow(value: string | null): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Pipeline complet des 4 agents (veille email → extraction → classement),
 * jusqu'à la création de l'écriture "en attente de validation".
 * Ne lève pas d'exception pour un échec d'étape : chaque échec est journalisé
 * dans ExtractionJob/Document et renvoyé dans le résultat, pour que
 * l'utilisateur voie précisément où le pipeline s'est arrêté.
 */
export async function ingestDocument(input: IngestInput): Promise<IngestResult> {
  const tenantId = await getDefaultTenantId();
  const { url } = await saveDocumentFile(input.fileBuffer, input.originalName);

  const document = await prisma.document.create({
    data: {
      tenantId,
      source: input.source,
      status: "RECEIVED",
      fileUrl: url,
      mimeType: input.mimeType,
      emailFrom: input.emailFrom,
      emailSubject: input.emailSubject,
      sourceMailboxActivity: input.mailboxActivity,
    },
  });

  if (input.source === "EMAIL") {
    await prisma.document.update({ where: { id: document.id }, data: { status: "CLASSIFYING" } });
    const triage = await runStep(document.id, "EMAIL_TRIAGE", () =>
      classifyEmailRelevance({
        subject: input.emailSubject ?? "",
        from: input.emailFrom ?? "",
      })
    );

    if (!triage.ok) {
      const failed = await prisma.document.update({
        where: { id: document.id },
        data: { status: "FAILED" },
      });
      return {
        document: failed,
        entry: null,
        ignoredAsNoise: false,
        failedStep: "EMAIL_TRIAGE",
        errorMessage: triage.error,
      };
    }

    if (!triage.result.relevant) {
      const ignored = await prisma.document.update({
        where: { id: document.id },
        data: { status: "IGNORED_NOISE" },
      });
      return {
        document: ignored,
        entry: null,
        ignoredAsNoise: true,
        failedStep: null,
        errorMessage: null,
      };
    }
  }

  await prisma.document.update({ where: { id: document.id }, data: { status: "EXTRACTING" } });
  const extraction = await runStep(document.id, "OCR_EXTRACT", () =>
    extractDocumentFields(input.fileBuffer, input.mimeType)
  );

  if (!extraction.ok) {
    const failed = await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED" },
    });
    return {
      document: failed,
      entry: null,
      ignoredAsNoise: false,
      failedStep: "OCR_EXTRACT",
      errorMessage: extraction.error,
    };
  }

  const { fields, ocrText } = extraction.result;

  // Boîte mail dédiée à une activité = indice quasi certain : on ne redemande
  // pas à l'IA de deviner l'activité, seulement le type d'écriture.
  const classification = await runStep(document.id, "ACTIVITY_CLASSIFY", async () => {
    if (input.mailboxActivity) {
      const { entryType, confidence } = await classifyEntryType({
        fields,
        ocrText,
        activityHint: input.mailboxActivity as "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH",
      });
      return { activity: input.mailboxActivity as Activity, entryType, confidence };
    }
    return classifyActivityAndType({ fields, ocrText });
  });

  if (!classification.ok) {
    const failed = await prisma.document.update({
      where: { id: document.id },
      data: { status: "FAILED", extractionJson: fields },
    });
    return {
      document: failed,
      entry: null,
      ignoredAsNoise: false,
      failedStep: "ACTIVITY_CLASSIFY",
      errorMessage: classification.error,
    };
  }

  const finalDocument = await prisma.document.update({
    where: { id: document.id },
    data: { status: "EXTRACTED", extractionJson: fields },
  });

  const amountHt = fields.amountHt ?? 0;
  const amountVat = fields.amountVat ?? 0;
  const amountTtc = fields.amountTtc ?? amountHt + amountVat;

  const entry = await prisma.entry.create({
    data: {
      tenantId,
      activity: classification.result.activity,
      type: classification.result.entryType,
      status: "PENDING",
      date: parseDateOrNow(fields.date),
      amountHt,
      amountVat,
      amountTtc,
      counterpartyName: fields.counterpartyName ?? "À compléter",
      nature: fields.nature ?? "À compléter",
      sourceDocumentId: finalDocument.id,
    },
  });

  return {
    document: finalDocument,
    entry,
    ignoredAsNoise: false,
    failedStep: null,
    errorMessage: null,
  };
}
