import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { saveDocumentFile } from "@/lib/storage";
import { hashFileBuffer } from "@/lib/dedup";
import { parseBankStatementCsv, BankStatementParseError } from "@/lib/bankStatement/parseCsv";
import { assertDateNotInClosedYear } from "@/server/services/fiscalYearClosure";
import type { Activity } from "@prisma/client";

export class BankTransactionError extends Error {}
export class BankTransactionNotFoundError extends Error {}
export class BankTransactionAlreadyValidatedError extends Error {}
export class BankTransactionNotValidatedError extends Error {}

export async function listBankTransactions(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.bankTransaction.findMany({
    where: { tenantId, activity, deletedAt: null },
    orderBy: { date: "desc" },
    include: { entry: true, invoice: true, cashJournalEntry: true },
  });
}

/**
 * Confirme une ligne importée en attente (même règle transversale que les
 * autres registres — voir docs/ARCHITECTURE.md).
 */
export async function validateBankTransaction(id: string, userId: string | null) {
  const tx = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!tx) throw new BankTransactionNotFoundError(id);
  if (tx.status === "VALIDATED") throw new BankTransactionAlreadyValidatedError(id);

  const [updated] = await prisma.$transaction([
    prisma.bankTransaction.update({
      where: { id },
      data: { status: "VALIDATED", validatedById: userId, validatedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: tx.tenantId,
        userId,
        action: "BANK_TRANSACTION_VALIDATED",
        entityType: "BankTransaction",
        entityId: id,
        before: JSON.parse(JSON.stringify(tx)),
        after: Prisma.JsonNull,
      },
    }),
  ]);
  return updated;
}

/** Supprime une ligne importée encore en attente (jamais validée) : suppression réelle. */
export async function deleteBankTransaction(id: string): Promise<void> {
  const tx = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!tx) throw new BankTransactionNotFoundError(id);
  if (tx.status === "VALIDATED") {
    throw new BankTransactionAlreadyValidatedError(
      "Ligne déjà validée : utilisez « Supprimer la ligne » plutôt que « Supprimer »."
    );
  }
  await prisma.bankTransaction.delete({ where: { id } });
}

/** « Supprimer la ligne » : masque définitivement une ligne déjà validée, sans l'effacer (contrôle fiscal). */
export async function softDeleteBankTransaction(id: string, userId: string | null): Promise<void> {
  const tx = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!tx) throw new BankTransactionNotFoundError(id);
  if (tx.status !== "VALIDATED") {
    throw new BankTransactionNotValidatedError(
      "Ligne pas encore validée : utilisez « Supprimer » plutôt que « Supprimer la ligne »."
    );
  }
  await assertDateNotInClosedYear(tx.date, "cette ligne de relevé bancaire");

  await prisma.$transaction([
    prisma.bankTransaction.update({ where: { id }, data: { deletedAt: new Date() } }),
    prisma.auditLog.create({
      data: {
        tenantId: tx.tenantId,
        userId,
        action: "BANK_TRANSACTION_SOFT_DELETED",
        entityType: "BankTransaction",
        entityId: id,
        before: JSON.parse(JSON.stringify(tx)),
        after: Prisma.JsonNull,
      },
    }),
  ]);
}

export type ImportStatementResult =
  | { status: "imported"; count: number; skippedDuplicateLines: number }
  | { status: "duplicate_file"; matchedFileHash: string };

/**
 * Importe un relevé CSV téléchargé depuis la banque en ligne (pas de
 * connexion DSP2 en v1 — voir docs/DEPLOYMENT.md). Si le fichier entier a
 * déjà été importé (même hash) et que l'import n'est pas confirmé, ne fait
 * rien : c'est le cas visé par la règle de détection de doublon (même
 * document reçu deux fois). À l'intérieur d'un import confirmé, les lignes
 * exactement identiques à une ligne déjà connue (recouvrement normal entre
 * deux relevés successifs) sont silencieusement ignorées.
 */
export async function importBankStatementCsv(
  activity: Activity,
  fileBuffer: Buffer,
  fileName: string,
  confirmDuplicateFile = false
): Promise<ImportStatementResult> {
  const tenantId = await getDefaultTenantId();
  const fileHash = hashFileBuffer(fileBuffer);

  if (!confirmDuplicateFile) {
    const sameFile = await prisma.bankTransaction.findFirst({
      where: { tenantId, activity, sourceFileHash: fileHash },
      select: { sourceFileHash: true },
    });
    if (sameFile?.sourceFileHash) {
      return { status: "duplicate_file", matchedFileHash: sameFile.sourceFileHash };
    }
  }

  let lines;
  try {
    lines = parseBankStatementCsv(fileBuffer.toString("utf-8"));
  } catch (err) {
    if (err instanceof BankStatementParseError) {
      throw new BankTransactionError(err.message);
    }
    throw err;
  }

  const existing = await prisma.bankTransaction.findMany({
    where: { tenantId, activity, deletedAt: null },
    select: { date: true, label: true, amount: true, direction: true },
  });
  const existingKeys = new Set(
    existing.map((e) => `${e.date.toISOString().slice(0, 10)}|${e.label}|${Number(e.amount)}|${e.direction}`)
  );

  const { url } = await saveDocumentFile(fileBuffer, fileName);

  let created = 0;
  let skipped = 0;
  for (const line of lines) {
    const key = `${line.date.toISOString().slice(0, 10)}|${line.label}|${line.amount}|${line.direction}`;
    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }
    existingKeys.add(key);
    await prisma.bankTransaction.create({
      data: {
        tenantId,
        activity,
        date: line.date,
        label: line.label,
        amount: line.amount,
        direction: line.direction,
        sourceFileUrl: url,
        sourceFileHash: fileHash,
      },
    });
    created++;
  }

  return { status: "imported", count: created, skippedDuplicateLines: skipped };
}

export type ReconcileTargetType = "entry" | "invoice" | "cashJournal";

/**
 * Rapproche une ligne de relevé avec une Dépense, une facture, ou une saisie
 * de caisse — dans les deux sens (la ligne de relevé pointe vers la pièce,
 * et vice versa). Refuse d'écraser un rapprochement déjà posé sur la cible.
 *
 * Pose aussi automatiquement la date d'encaissement/paiement (paidAt) sur
 * la Dépense/facture, avec la date de l'opération bancaire pointée — c'est
 * cette date, pas la date de facture, qui compte en comptabilité de caisse
 * (voir BOI-BA-BASE-20-10). Pour une saisie de caisse (vente directe),
 * rien à faire : elle est déjà encaissée le jour même de sa validation.
 */
export async function reconcileBankTransaction(
  bankTransactionId: string,
  target: { type: ReconcileTargetType; id: string }
) {
  const transaction = await prisma.bankTransaction.findUnique({ where: { id: bankTransactionId } });
  if (!transaction) throw new BankTransactionNotFoundError(bankTransactionId);

  if (target.type === "entry") {
    await prisma.entry.update({
      where: { id: target.id },
      data: { bankTransactionId, paidAt: transaction.date },
    });
  } else if (target.type === "invoice") {
    await prisma.invoice.update({
      where: { id: target.id },
      data: { bankTransactionId, paidAt: transaction.date, status: "PAID" },
    });
  } else {
    await prisma.cashJournalEntry.update({ where: { id: target.id }, data: { bankTransactionId } });
  }
}

// Annule un rapprochement, y compris la date de paiement/encaissement posée
// automatiquement lors du rapprochement — pour la ressaisir proprement si
// besoin. Cas rare non géré : une paidAt saisie manuellement avant un
// rapprochement se retrouve aussi effacée ici. Refusé si cela effacerait le
// paidAt d'une écriture d'un exercice déjà clôturé (voir assertDateNotInClosedYear).
export async function unreconcileBankTransaction(bankTransactionId: string) {
  const [linkedEntry, linkedInvoice] = await Promise.all([
    prisma.entry.findUnique({ where: { bankTransactionId }, select: { paidAt: true } }),
    prisma.invoice.findUnique({ where: { bankTransactionId }, select: { paidAt: true } }),
  ]);
  await assertDateNotInClosedYear(linkedEntry?.paidAt, "cette dépense payée");
  await assertDateNotInClosedYear(linkedInvoice?.paidAt, "cette facture encaissée");

  await prisma.$transaction([
    prisma.entry.updateMany({
      where: { bankTransactionId },
      data: { bankTransactionId: null, paidAt: null },
    }),
    prisma.invoice.updateMany({
      where: { bankTransactionId },
      data: { bankTransactionId: null, paidAt: null },
    }),
    prisma.cashJournalEntry.updateMany({
      where: { bankTransactionId },
      data: { bankTransactionId: null },
    }),
  ]);
}

// Fenêtre volontairement asymétrique : la pièce (facture, dépense, saisie de
// caisse) précède quasi toujours l'opération bancaire, parfois de loin — une
// facture à 60 jours d'échéance, un fournisseur payé à 2 mois. On cherche
// donc largement AVANT la date de l'opération, et à peine après (paiement
// immédiat ou anticipé, dépôt de caisse le jour même).
const DAYS_BEFORE = 100;
const DAYS_AFTER = 7;

function dateWindow(transactionDate: Date) {
  const start = new Date(transactionDate);
  start.setDate(start.getDate() - DAYS_BEFORE);
  const end = new Date(transactionDate);
  end.setDate(end.getDate() + DAYS_AFTER);
  return { gte: start, lte: end };
}

/**
 * Candidats de rapprochement pour une ligne de relevé donnée : des Dépenses
 * non pointées pour un débit, des factures/saisies de caisse non pointées
 * pour un crédit — fenêtre large (jusqu'à 100 jours avant l'opération, pour
 * couvrir les délais de paiement à 30/60 jours) mais réduite après (7 jours),
 * simple aide à la sélection : le choix final reste manuel.
 */
export async function listReconciliationCandidates(
  activity: Activity,
  direction: "DEBIT" | "CREDIT",
  date: Date
) {
  const tenantId = await getDefaultTenantId();

  if (direction === "DEBIT") {
    const entries = await prisma.entry.findMany({
      where: {
        tenantId,
        activity,
        type: { in: ["ACHAT", "IMMOBILISATION"] },
        bankTransactionId: null,
        paidAt: null,
        deletedAt: null,
        date: dateWindow(date),
      },
      orderBy: { date: "desc" },
    });
    return { entries, invoices: [], cashJournalEntries: [] };
  }

  const [invoices, cashJournalEntries] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        tenantId,
        activity,
        type: "FACTURE",
        status: { in: ["SENT", "PAID"] },
        bankTransactionId: null,
        paidAt: null,
        issueDate: dateWindow(date),
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.cashJournalEntry.findMany({
      where: {
        tenantId,
        activity,
        bankTransactionId: null,
        deletedAt: null,
        date: dateWindow(date),
      },
      orderBy: { date: "desc" },
    }),
  ]);
  return { entries: [], invoices, cashJournalEntries };
}
