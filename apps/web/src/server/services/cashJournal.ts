import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { assertDateNotInClosedYear } from "@/server/services/fiscalYearClosure";
import { resetBankTransactionValidationIfOrphaned } from "@/server/services/bankTransactions";
import type { Activity, CashJournalEntry } from "@prisma/client";

export interface ExceptionalSale {
  amountTtc: number;
  paymentMethod: string;
  description?: string;
}

export async function listCashJournalEntries(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.cashJournalEntry.findMany({
    where: { tenantId, activity, deletedAt: null },
    orderBy: { date: "desc" },
  });
}

export class CashJournalError extends Error {}
export class CashJournalEntryNotFoundError extends Error {}
export class CashJournalAlreadyValidatedError extends Error {}
export class CashJournalNotValidatedError extends Error {}

export interface CreateCashJournalEntryInput {
  date: Date;
  cashAmount: number;
  checkAmount?: number;
  cardAmount?: number;
  // Part DÉJÀ INCLUSE dans cashAmount+checkAmount+cardAmount vendue à 10%
  // (plants) plutôt qu'à 5,5% (fruits/légumes) — Maraîchage uniquement.
  plantSalesAmount?: number;
  location?: string; // lieu de vente (marché, ferme…)
  depositSlipUrl?: string;
  cardStatementUrl?: string;
  exceptionalSales?: ExceptionalSale[];
}

/**
 * Crée ou met à jour l'entrée de journal de caisse du jour pour une activité
 * de vente directe. Fruits/Légumes : espèces uniquement (chèque/CB forcés à
 * 0 quoi qu'envoyé). Maraîchage : espèces/chèques/CB tous acceptés. Une seule
 * entrée par jour et par activité (upsert) tant qu'elle n'est pas validée —
 * au-delà, verrouillée comme les autres écritures.
 */
export async function createCashJournalEntry(
  activity: Activity,
  input: CreateCashJournalEntryInput
) {
  if (activity === "BIC_PHOTOBOOTH") {
    throw new CashJournalError(
      "Kerbooth 360 est 100% facturé : pas de journal de caisse pour cette activité."
    );
  }

  const tenantId = await getDefaultTenantId();
  const cashOnly = activity === "BIC_FRUITS_LEGUMES";

  const dayTotal = input.cashAmount + (input.checkAmount ?? 0) + (input.cardAmount ?? 0);
  if (!cashOnly && (input.plantSalesAmount ?? 0) > dayTotal) {
    throw new CashJournalError(
      "La part \"vente de plants\" ne peut pas dépasser le total du jour (espèces + chèques + CB) : c'est une part DE ce total, pas un montant en plus."
    );
  }

  const existing = await prisma.cashJournalEntry.findUnique({
    where: { tenantId_activity_date: { tenantId, activity, date: input.date } },
  });
  if (existing && existing.status === "VALIDATED") {
    throw new CashJournalAlreadyValidatedError(
      "Une saisie validée existe déjà pour ce jour : elle ne peut plus être modifiée."
    );
  }

  const data = {
    tenantId,
    activity,
    date: input.date,
    cashAmount: input.cashAmount,
    checkAmount: cashOnly ? 0 : input.checkAmount ?? 0,
    cardAmount: cashOnly ? 0 : input.cardAmount ?? 0,
    plantSalesAmount: cashOnly ? 0 : input.plantSalesAmount ?? 0,
    location: input.location || null,
    depositSlipUrl: input.depositSlipUrl,
    cardStatementUrl: cashOnly ? undefined : input.cardStatementUrl,
    exceptionalSales: input.exceptionalSales?.length
      ? (input.exceptionalSales as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull,
  };

  return prisma.cashJournalEntry.upsert({
    where: { tenantId_activity_date: { tenantId, activity, date: input.date } },
    update: data,
    create: data,
  });
}

/**
 * Verrouille une saisie de journal de caisse après validation humaine (même
 * logique que validateEntry pour les écritures issues de la capture IA).
 */
export async function validateCashJournalEntry(
  id: string,
  userId: string | null
): Promise<CashJournalEntry> {
  const entry = await prisma.cashJournalEntry.findUnique({ where: { id } });
  if (!entry) throw new CashJournalEntryNotFoundError(id);
  if (entry.status === "VALIDATED") throw new CashJournalAlreadyValidatedError(id);

  const [updated] = await prisma.$transaction([
    prisma.cashJournalEntry.update({
      where: { id },
      data: { status: "VALIDATED", validatedById: userId, validatedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId,
        action: "CASH_JOURNAL_ENTRY_VALIDATED",
        entityType: "CashJournalEntry",
        entityId: id,
        before: JSON.parse(JSON.stringify(entry)),
        after: Prisma.JsonNull,
      },
    }),
  ]);

  return updated;
}

/** Supprime une saisie encore en attente (jamais validée) : suppression réelle. */
export async function deleteCashJournalEntry(id: string): Promise<void> {
  const entry = await prisma.cashJournalEntry.findUnique({ where: { id } });
  if (!entry) throw new CashJournalEntryNotFoundError(id);
  if (entry.status === "VALIDATED") {
    throw new CashJournalAlreadyValidatedError(
      "Saisie déjà validée : utilisez « Supprimer la ligne » plutôt que « Supprimer »."
    );
  }
  await prisma.cashJournalEntry.delete({ where: { id } });
  await resetBankTransactionValidationIfOrphaned(entry.bankTransactionId);
}

/** « Supprimer la ligne » : masque définitivement une saisie déjà validée, sans l'effacer (contrôle fiscal). */
export async function softDeleteCashJournalEntry(id: string, userId: string | null): Promise<void> {
  const entry = await prisma.cashJournalEntry.findUnique({ where: { id } });
  if (!entry) throw new CashJournalEntryNotFoundError(id);
  if (entry.status !== "VALIDATED") {
    throw new CashJournalNotValidatedError(
      "Saisie pas encore validée : utilisez « Supprimer » plutôt que « Supprimer la ligne »."
    );
  }
  // Une vente directe est encaissée le jour même : sa date fait toujours
  // foi (contrairement à une facture, jamais de créance en cours ici).
  await assertDateNotInClosedYear(entry.date, "cette saisie de caisse");

  await prisma.$transaction([
    prisma.cashJournalEntry.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        userId,
        action: "CASH_JOURNAL_ENTRY_SOFT_DELETED",
        entityType: "CashJournalEntry",
        entityId: id,
        before: JSON.parse(JSON.stringify(entry)),
        after: Prisma.JsonNull,
      },
    }),
  ]);
  await resetBankTransactionValidationIfOrphaned(entry.bankTransactionId);
}
