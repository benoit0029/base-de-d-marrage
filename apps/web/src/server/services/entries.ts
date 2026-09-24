import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { assertDateNotInClosedYear } from "@/server/services/fiscalYearClosure";
import { resetBankTransactionValidationIfOrphaned } from "@/server/services/bankTransactions";
import type { Activity, Entry } from "@prisma/client";

export async function listEntries(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.entry.findMany({
    where: { tenantId, activity, deletedAt: null },
    orderBy: { date: "desc" },
    include: { sourceDocument: true },
  });
}

export class EntryAlreadyValidatedError extends Error {}
export class EntryNotFoundError extends Error {}
export class EntryNotValidatedError extends Error {}
export class EntryAlreadyPaidError extends Error {}
export class EntryNotYetValidatedForPaymentError extends Error {}

/**
 * Renseigne manuellement la date de paiement d'une Dépense (comptabilité de
 * caisse — voir BOI-BA-BASE-20-10) : tant que cette date n'est pas connue,
 * la dépense validée reste une dette en cours ("Facture reçue — dette en
 * cours"), hors TVA déductible. Réservé aux écritures déjà validées — une
 * dépense encore en attente n'a pas sa place dans ce calcul.
 */
export async function markEntryPaid(
  entryId: string,
  paidAt: Date,
  userId: string | null
): Promise<Entry> {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) throw new EntryNotFoundError(entryId);
  if (entry.status !== "VALIDATED") throw new EntryNotYetValidatedForPaymentError(entryId);
  if (entry.paidAt) throw new EntryAlreadyPaidError(entryId);

  const [updated] = await prisma.$transaction([
    prisma.entry.update({ where: { id: entryId }, data: { paidAt } }),
    prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId,
        action: "ENTRY_MARKED_PAID",
        entityType: "Entry",
        entityId: entryId,
        before: JSON.parse(JSON.stringify(entry)),
        after: Prisma.JsonNull,
      },
    }),
  ]);
  return updated;
}

/**
 * Supprime une écriture encore en attente (jamais validée) : suppression
 * réelle, rien à conserver puisqu'elle n'a jamais fait foi.
 */
export async function deleteEntry(entryId: string): Promise<void> {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) throw new EntryNotFoundError(entryId);
  if (entry.status === "VALIDATED") {
    throw new EntryAlreadyValidatedError(
      "Écriture déjà validée : utilisez « Supprimer la ligne » plutôt que « Supprimer »."
    );
  }
  await prisma.entry.delete({ where: { id: entryId } });
  await resetBankTransactionValidationIfOrphaned(entry.bankTransactionId);
}

/**
 * « Supprimer la ligne » : une écriture déjà validée n'est jamais vraiment
 * effacée (trace conservée en cas de contrôle fiscal, voir Entry.deletedAt)
 * — seulement masquée partout dans l'interface.
 */
export async function softDeleteEntry(entryId: string, userId: string | null): Promise<void> {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) throw new EntryNotFoundError(entryId);
  if (entry.status !== "VALIDATED") {
    throw new EntryNotValidatedError(
      "Écriture pas encore validée : utilisez « Supprimer » plutôt que « Supprimer la ligne »."
    );
  }
  // Une dette encore en cours (paidAt vide) n'est rattachée à aucun exercice
  // et reste donc modifiable même après clôture — voir assertDateNotInClosedYear.
  await assertDateNotInClosedYear(entry.paidAt, "cette dépense payée");

  await prisma.$transaction([
    prisma.entry.update({ where: { id: entryId }, data: { deletedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId,
        action: "ENTRY_SOFT_DELETED",
        entityType: "Entry",
        entityId: entryId,
        before: JSON.parse(JSON.stringify(entry)),
        after: Prisma.JsonNull,
      },
    }),
  ]);
  await resetBankTransactionValidationIfOrphaned(entry.bankTransactionId);
}

/**
 * Verrouille une écriture après validation humaine : plus aucune modification
 * possible ensuite (traçabilité). Toute validation est journalisée.
 */
export async function validateEntry(entryId: string, userId: string | null): Promise<Entry> {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) throw new EntryNotFoundError(entryId);
  if (entry.status === "VALIDATED") throw new EntryAlreadyValidatedError(entryId);

  const [updated] = await prisma.$transaction([
    prisma.entry.update({
      where: { id: entryId },
      data: { status: "VALIDATED", validatedById: userId, validatedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId,
        action: "ENTRY_VALIDATED",
        entityType: "Entry",
        entityId: entryId,
        before: JSON.parse(JSON.stringify(entry)),
        after: Prisma.JsonNull,
      },
    }),
  ]);

  return updated;
}

export interface EntryCorrection {
  date?: string;
  counterpartyName?: string;
  nature?: string;
  amountHt?: number;
  amountVat?: number;
  amountTtc?: number;
}

/**
 * Correction manuelle d'une écriture avant validation (l'IA se trompe parfois).
 * Refusée une fois l'écriture verrouillée.
 */
export async function correctEntry(
  entryId: string,
  userId: string | null,
  patch: EntryCorrection
): Promise<Entry> {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry) throw new EntryNotFoundError(entryId);
  if (entry.status === "VALIDATED") throw new EntryAlreadyValidatedError(entryId);

  const data = {
    ...(patch.date ? { date: new Date(patch.date) } : {}),
    ...(patch.counterpartyName !== undefined ? { counterpartyName: patch.counterpartyName } : {}),
    ...(patch.nature !== undefined ? { nature: patch.nature } : {}),
    ...(patch.amountHt !== undefined ? { amountHt: patch.amountHt } : {}),
    ...(patch.amountVat !== undefined ? { amountVat: patch.amountVat } : {}),
    ...(patch.amountTtc !== undefined ? { amountTtc: patch.amountTtc } : {}),
  };

  const [updated] = await prisma.$transaction([
    prisma.entry.update({ where: { id: entryId }, data }),
    prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId,
        action: "ENTRY_CORRECTED",
        entityType: "Entry",
        entityId: entryId,
        before: JSON.parse(JSON.stringify(entry)),
        after: JSON.parse(JSON.stringify(data)),
      },
    }),
  ]);

  return updated;
}

export class EntryNotReclassifiableError extends Error {}

/**
 * Corrige le classement d'une dépense entre achat courant et immobilisation
 * (la lecture automatique peut se tromper) — seul le type change, jamais les
 * montants, y compris sur une écriture déjà validée ; tracé dans le journal
 * d'audit. Refusé si la dépense est payée dans un exercice déjà clôturé.
 */
export async function reclassifyEntry(
  entryId: string,
  userId: string | null,
  type: "ACHAT" | "IMMOBILISATION"
): Promise<Entry> {
  const entry = await prisma.entry.findUnique({ where: { id: entryId } });
  if (!entry || entry.deletedAt) throw new EntryNotFoundError(entryId);
  if (entry.type !== "ACHAT" && entry.type !== "IMMOBILISATION") throw new EntryNotReclassifiableError(entryId);
  if (entry.type === type) return entry;
  await assertDateNotInClosedYear(entry.paidAt, "cette dépense");

  const [updated] = await prisma.$transaction([
    prisma.entry.update({ where: { id: entryId }, data: { type } }),
    prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId,
        action: "ENTRY_RECLASSIFIED",
        entityType: "Entry",
        entityId: entryId,
        before: JSON.parse(JSON.stringify(entry)),
        after: { type },
      },
    }),
  ]);
  return updated;
}
