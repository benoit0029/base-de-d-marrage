import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { saveDocumentFile } from "@/lib/storage";
import { hashFileBuffer, findProbableDuplicate } from "@/lib/dedup";
import type { Activity, SimpleImportCategory } from "@prisma/client";

export class SimpleImportError extends Error {}

export interface CreateSimpleImportInput {
  activity: Activity;
  category: SimpleImportCategory;
  period?: string;
  date: Date;
  fileBuffer: Buffer;
  fileName: string;
  amountTtc?: number;
  confirmDuplicate?: boolean;
}

export type CreateSimpleImportResult =
  | { status: "created"; id: string }
  | { status: "duplicate"; matchedId: string; reason: "same_file" | "same_date_amount" };

export async function listSimpleImports(activity: Activity, category?: SimpleImportCategory) {
  const tenantId = await getDefaultTenantId();
  return prisma.simpleImport.findMany({
    where: { tenantId, activity, ...(category ? { category } : {}) },
    orderBy: { date: "desc" },
  });
}

/**
 * Enregistre un import simple (Tesa+ ou cotisation non salarié). Si un
 * doublon probable est détecté (même fichier, ou même date+montant+type) et
 * que l'utilisateur n'a pas déjà confirmé vouloir l'enregistrer quand même,
 * renvoie "duplicate" sans rien écrire — voir lib/dedup.ts.
 */
export async function createSimpleImport(
  input: CreateSimpleImportInput
): Promise<CreateSimpleImportResult> {
  if (input.category === "COTISATION_NON_SALARIE" && input.amountTtc === undefined) {
    throw new SimpleImportError("Le montant est obligatoire pour une cotisation non salarié.");
  }

  const tenantId = await getDefaultTenantId();
  const fileHash = hashFileBuffer(input.fileBuffer);

  if (!input.confirmDuplicate) {
    const candidates = await prisma.simpleImport.findMany({
      where: { tenantId, activity: input.activity, category: input.category },
      select: { id: true, fileHash: true, date: true, amountTtc: true },
    });
    const duplicate = findProbableDuplicate(
      fileHash,
      input.date,
      input.amountTtc ?? null,
      candidates.map((c) => ({ ...c, amountTtc: c.amountTtc ? Number(c.amountTtc) : null }))
    );
    if (duplicate) {
      return { status: "duplicate", matchedId: duplicate.matchedId, reason: duplicate.reason };
    }
  }

  const { url } = await saveDocumentFile(input.fileBuffer, input.fileName);

  const created = await prisma.$transaction(async (tx) => {
    let linkedEntryId: string | undefined;

    if (input.category === "COTISATION_NON_SALARIE") {
      const entry = await tx.entry.create({
        data: {
          tenantId,
          activity: input.activity,
          type: "ACHAT",
          status: "PENDING",
          date: input.date,
          amountHt: input.amountTtc!,
          amountVat: 0,
          amountTtc: input.amountTtc!,
          counterpartyName: "MSA — cotisations non salarié",
          nature: "Cotisation sociale non salarié",
        },
      });
      linkedEntryId = entry.id;
    }

    return tx.simpleImport.create({
      data: {
        tenantId,
        activity: input.activity,
        category: input.category,
        period: input.period,
        date: input.date,
        fileUrl: url,
        fileHash,
        amountTtc: input.amountTtc ?? null,
        linkedEntryId,
      },
    });
  });

  return { status: "created", id: created.id };
}
