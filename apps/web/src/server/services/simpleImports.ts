import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { saveDocumentFile } from "@/lib/storage";
import { hashFileBuffer, findProbableDuplicate } from "@/lib/dedup";
import type { Activity, SimpleImportCategory, SimpleImport } from "@prisma/client";

export class SimpleImportError extends Error {}
export class SimpleImportNotFoundError extends Error {}
export class SimpleImportLockedError extends Error {}
export class SimpleImportAlreadyValidatedError extends Error {}
export class SimpleImportNotValidatedError extends Error {}

// Catégories qui génèrent automatiquement une ligne de Dépense — à la
// validation, jamais à l'import (pour ne jamais faire apparaître une
// dépense avant confirmation humaine).
const CATEGORIES_GENERATING_ENTRY: SimpleImportCategory[] = [
  "COTISATION_NON_SALARIE",
  "TESA_COTISATIONS_SALARIALES",
];

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
    where: { tenantId, activity, deletedAt: null, ...(category ? { category } : {}) },
    orderBy: { date: "desc" },
  });
}

/**
 * Enregistre un import simple (Tesa+ ou cotisation non salarié), en attente
 * de validation. Si un doublon probable est détecté (même fichier, ou même
 * date+montant+type) et que l'utilisateur n'a pas déjà confirmé vouloir
 * l'enregistrer quand même, renvoie "duplicate" sans rien écrire — voir
 * lib/dedup.ts.
 */
export async function createSimpleImport(
  input: CreateSimpleImportInput
): Promise<CreateSimpleImportResult> {
  if (CATEGORIES_GENERATING_ENTRY.includes(input.category) && input.amountTtc === undefined) {
    throw new SimpleImportError("Le montant est obligatoire pour ce type de document.");
  }

  const tenantId = await getDefaultTenantId();
  const fileHash = hashFileBuffer(input.fileBuffer);

  if (!input.confirmDuplicate) {
    const candidates = await prisma.simpleImport.findMany({
      where: { tenantId, activity: input.activity, category: input.category, deletedAt: null },
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

  const created = await prisma.simpleImport.create({
    data: {
      tenantId,
      activity: input.activity,
      category: input.category,
      period: input.period,
      date: input.date,
      fileUrl: url,
      fileHash,
      amountTtc: input.amountTtc ?? null,
      status: "PENDING",
    },
  });

  return { status: "created", id: created.id };
}

/**
 * Valide un import en attente. Pour les catégories qui alimentent les
 * Dépenses (cotisation non salarié, cotisations salariales Tesa+), crée la
 * ligne de Dépense correspondante dans la même transaction — jamais avant.
 */
export async function validateSimpleImport(id: string, userId: string | null): Promise<SimpleImport> {
  const item = await prisma.simpleImport.findUnique({ where: { id } });
  if (!item) throw new SimpleImportNotFoundError(id);
  if (item.status === "VALIDATED") throw new SimpleImportAlreadyValidatedError(id);

  const tenantId = item.tenantId;

  return prisma.$transaction(async (tx) => {
    let linkedEntryId: string | undefined;

    if (CATEGORIES_GENERATING_ENTRY.includes(item.category)) {
      const label =
        item.category === "COTISATION_NON_SALARIE"
          ? { counterpartyName: "MSA — cotisations non salarié", nature: "Cotisation sociale non salarié" }
          : { counterpartyName: "Cotisations salariales (Tesa+)", nature: "Cotisations sociales salarié" };

      const entry = await tx.entry.create({
        data: {
          tenantId,
          activity: item.activity,
          type: "ACHAT",
          status: "VALIDATED",
          date: item.date,
          amountHt: item.amountTtc ?? 0,
          amountVat: 0,
          amountTtc: item.amountTtc ?? 0,
          validatedById: userId,
          validatedAt: new Date(),
          ...label,
        },
      });
      linkedEntryId = entry.id;
    }

    const updated = await tx.simpleImport.update({
      where: { id },
      data: {
        status: "VALIDATED",
        validatedById: userId,
        validatedAt: new Date(),
        ...(linkedEntryId ? { linkedEntryId } : {}),
      },
    });

    await tx.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "SIMPLE_IMPORT_VALIDATED",
        entityType: "SimpleImport",
        entityId: id,
        before: JSON.parse(JSON.stringify(item)),
        after: Prisma.JsonNull,
      },
    });

    return updated;
  });
}

/** Supprime un import encore en attente (jamais validé) : suppression réelle. */
export async function deleteSimpleImport(id: string): Promise<void> {
  const item = await prisma.simpleImport.findUnique({ where: { id } });
  if (!item) throw new SimpleImportNotFoundError(id);
  if (item.status === "VALIDATED") {
    throw new SimpleImportLockedError(
      "Document déjà validé : utilisez « Supprimer la ligne » plutôt que « Supprimer »."
    );
  }
  await prisma.simpleImport.delete({ where: { id } });
}

/**
 * « Supprimer la ligne » : masque définitivement un import déjà validé (et,
 * le cas échéant, la Dépense qu'il a générée), sans les effacer — trace
 * conservée en base en cas de contrôle fiscal.
 */
export async function softDeleteSimpleImport(id: string, userId: string | null): Promise<void> {
  const item = await prisma.simpleImport.findUnique({ where: { id } });
  if (!item) throw new SimpleImportNotFoundError(id);
  if (item.status !== "VALIDATED") {
    throw new SimpleImportNotValidatedError(
      "Document pas encore validé : utilisez « Supprimer » plutôt que « Supprimer la ligne »."
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.simpleImport.update({ where: { id }, data: { deletedAt: new Date() } });
    if (item.linkedEntryId) {
      await tx.entry.update({ where: { id: item.linkedEntryId }, data: { deletedAt: new Date() } });
    }
    await tx.auditLog.create({
      data: {
        tenantId: item.tenantId,
        userId,
        action: "SIMPLE_IMPORT_SOFT_DELETED",
        entityType: "SimpleImport",
        entityId: id,
        before: JSON.parse(JSON.stringify(item)),
        after: Prisma.JsonNull,
      },
    });
  });
}
