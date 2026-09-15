import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { saveDocumentFile } from "@/lib/storage";
import { hashFileBuffer, findProbableDuplicate } from "@/lib/dedup";
import { assertDateNotInClosedYear } from "@/server/services/fiscalYearClosure";
import type { TvaInstallment } from "@prisma/client";

export class TvaInstallmentNotFoundError extends Error {}
export class TvaInstallmentAlreadyValidatedError extends Error {}
export class TvaInstallmentNotValidatedError extends Error {}
export class TvaInstallmentLockedError extends Error {}

export async function listTvaInstallments() {
  const tenantId = await getDefaultTenantId();
  return prisma.tvaInstallment.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: { paidAt: "desc" },
  });
}

export interface CreateTvaInstallmentInput {
  dueLabel: string;
  amountPaid: number;
  paidAt: Date;
  fileBuffer?: Buffer;
  fileName?: string;
  confirmDuplicate?: boolean;
}

export type CreateTvaInstallmentResult =
  | { status: "created"; id: string }
  | { status: "duplicate"; matchedId: string; reason: "same_file" | "same_date_amount" };

/** Enregistre un paiement d'acompte TVA (après paiement, justificatif à l'appui), en attente de validation. */
export async function createTvaInstallment(
  input: CreateTvaInstallmentInput
): Promise<CreateTvaInstallmentResult> {
  const tenantId = await getDefaultTenantId();
  const fileHash = input.fileBuffer ? hashFileBuffer(input.fileBuffer) : null;

  if (fileHash && !input.confirmDuplicate) {
    const candidates = await prisma.tvaInstallment.findMany({
      where: { tenantId, deletedAt: null, fileHash: { not: null } },
      select: { id: true, fileHash: true, paidAt: true, amountPaid: true },
    });
    const duplicate = findProbableDuplicate(
      fileHash,
      input.paidAt,
      Number(input.amountPaid),
      candidates.map((c) => ({
        id: c.id,
        fileHash: c.fileHash as string,
        date: c.paidAt,
        amountTtc: Number(c.amountPaid),
      }))
    );
    if (duplicate) {
      return { status: "duplicate", matchedId: duplicate.matchedId, reason: duplicate.reason };
    }
  }

  let justificatifUrl: string | undefined;
  if (input.fileBuffer && input.fileName) {
    const { url } = await saveDocumentFile(input.fileBuffer, input.fileName);
    justificatifUrl = url;
  }

  const created = await prisma.tvaInstallment.create({
    data: {
      tenantId,
      dueLabel: input.dueLabel,
      amountPaid: input.amountPaid,
      paidAt: input.paidAt,
      justificatifUrl,
      fileHash,
      status: "PENDING",
    },
  });

  return { status: "created", id: created.id };
}

export async function validateTvaInstallment(id: string, userId: string | null): Promise<TvaInstallment> {
  const item = await prisma.tvaInstallment.findUnique({ where: { id } });
  if (!item) throw new TvaInstallmentNotFoundError(id);
  if (item.status === "VALIDATED") throw new TvaInstallmentAlreadyValidatedError(id);

  const [updated] = await prisma.$transaction([
    prisma.tvaInstallment.update({
      where: { id },
      data: { status: "VALIDATED", validatedById: userId, validatedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: item.tenantId,
        userId,
        action: "TVA_INSTALLMENT_VALIDATED",
        entityType: "TvaInstallment",
        entityId: id,
        before: JSON.parse(JSON.stringify(item)),
        after: Prisma.JsonNull,
      },
    }),
  ]);
  return updated;
}

export async function deleteTvaInstallment(id: string): Promise<void> {
  const item = await prisma.tvaInstallment.findUnique({ where: { id } });
  if (!item) throw new TvaInstallmentNotFoundError(id);
  if (item.status === "VALIDATED") {
    throw new TvaInstallmentLockedError(
      "Paiement déjà validé : utilisez « Supprimer la ligne » plutôt que « Supprimer »."
    );
  }
  await prisma.tvaInstallment.delete({ where: { id } });
}

export async function softDeleteTvaInstallment(id: string, userId: string | null): Promise<void> {
  const item = await prisma.tvaInstallment.findUnique({ where: { id } });
  if (!item) throw new TvaInstallmentNotFoundError(id);
  if (item.status !== "VALIDATED") {
    throw new TvaInstallmentNotValidatedError(
      "Paiement pas encore validé : utilisez « Supprimer » plutôt que « Supprimer la ligne »."
    );
  }
  await assertDateNotInClosedYear(item.paidAt, "ce paiement d'acompte TVA");

  await prisma.$transaction([
    prisma.tvaInstallment.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        tenantId: item.tenantId,
        userId,
        action: "TVA_INSTALLMENT_SOFT_DELETED",
        entityType: "TvaInstallment",
        entityId: id,
        before: JSON.parse(JSON.stringify(item)),
        after: Prisma.JsonNull,
      },
    }),
  ]);
}
