import { z } from "zod";
import { chatJson, ocrExtract } from "@/lib/mistral/client";

// ---------------------------------------------------------------------------
// Agent de veille email : filtre le bruit (newsletters, spam) avant extraction.
// ---------------------------------------------------------------------------

const emailTriageSchema = z.object({
  relevant: z.boolean(),
  reason: z.string(),
});

export async function classifyEmailRelevance(params: {
  subject: string;
  from: string;
}): Promise<z.infer<typeof emailTriageSchema>> {
  const raw = await chatJson({
    system:
      "Tu tries les emails d'une boîte dédiée à la réception de factures et reçus " +
      "pour une micro-entreprise agricole. Réponds uniquement en JSON avec les clés " +
      '"relevant" (booléen : true si cet email contient probablement une facture, un reçu ' +
      "ou une pièce comptable à traiter) et \"reason\" (courte explication en français).",
    user: `Expéditeur : ${params.from}\nObjet : ${params.subject}`,
  });

  return emailTriageSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Agent d'extraction : OCR du document + structuration des champs comptables.
// ---------------------------------------------------------------------------

const extractedFieldsSchema = z.object({
  date: z.string().nullable(), // format ISO 8601 (YYYY-MM-DD) si trouvée
  amountHt: z.number().nullable(),
  amountVat: z.number().nullable(),
  amountTtc: z.number().nullable(),
  counterpartyName: z.string().nullable(),
  nature: z.string().nullable(),
  documentType: z.enum(["facture", "recu", "devis", "autre"]),
});

export type ExtractedFields = z.infer<typeof extractedFieldsSchema>;

export async function extractDocumentFields(
  buffer: Buffer,
  mimeType: string
): Promise<{ ocrText: string; fields: ExtractedFields }> {
  const ocr = await ocrExtract(buffer, mimeType);

  const raw = await chatJson({
    system:
      "Tu extrais les champs comptables d'une facture, d'un reçu ou d'un devis à partir " +
      "de son texte OCR. Réponds uniquement en JSON avec les clés : " +
      '"date" (YYYY-MM-DD ou null), "amountHt" (nombre ou null), "amountVat" (nombre ou null), ' +
      '"amountTtc" (nombre ou null), "counterpartyName" (nom du fournisseur ou client, ou null), ' +
      '"nature" (courte description de la nature de l\'achat/vente, ou null), ' +
      '"documentType" ("facture", "recu", "devis" ou "autre"). ' +
      "Si un montant TTC est visible mais pas le HT/TVA, calcule-les seulement si le taux de TVA est explicite, sinon laisse-les à null.",
    user: ocr.fullText.slice(0, 12000),
  });

  return { ocrText: ocr.fullText, fields: extractedFieldsSchema.parse(raw) };
}

// ---------------------------------------------------------------------------
// Agent de classement/ventilation : détermine l'activité et le type d'écriture.
// ---------------------------------------------------------------------------

const classificationSchema = z.object({
  activity: z.enum(["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"]),
  entryType: z.enum(["RECETTE", "ACHAT", "IMMOBILISATION"]),
  confidence: z.number().min(0).max(1),
});

export type Classification = z.infer<typeof classificationSchema>;

export async function classifyActivityAndType(params: {
  fields: ExtractedFields;
  ocrText: string;
}): Promise<Classification> {
  const raw = await chatJson({
    system:
      "Tu ventiles une pièce comptable pour un exploitant qui a 3 activités dans la même " +
      "micro-entreprise sauf le maraîchage qui est une exploitation agricole distincte (micro-BA) : " +
      "1) BA_MARAICHAGE : maraîchage bio (semences, matériel agricole, ventes de légumes en direct, marchés) ; " +
      "2) BIC_FRUITS_LEGUMES : revente de fruits/légumes achetés à des grossistes ; " +
      "3) BIC_PHOTOBOOTH : location d'un photobooth \"Kerbooth 360°\" pour événements (mariages, entreprises). " +
      "Détermine aussi le type d'écriture : RECETTE (vente), ACHAT (dépense courante) ou " +
      "IMMOBILISATION (matériel durable de valeur significative). " +
      'Réponds uniquement en JSON avec les clés "activity", "entryType" et "confidence" (0 à 1).',
    user: `Champs extraits : ${JSON.stringify(params.fields)}\n\nTexte du document :\n${params.ocrText.slice(0, 4000)}`,
  });

  return classificationSchema.parse(raw);
}
