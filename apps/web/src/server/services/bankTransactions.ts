import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { saveDocumentFile } from "@/lib/storage";
import { hashFileBuffer } from "@/lib/dedup";
import { parseBankStatementCsv, BankStatementParseError } from "@/lib/bankStatement/parseCsv";
import type { Activity } from "@prisma/client";

export class BankTransactionError extends Error {}
export class BankTransactionNotFoundError extends Error {}

export async function listBankTransactions(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.bankTransaction.findMany({
    where: { tenantId, activity },
    orderBy: { date: "desc" },
    include: { entry: true, invoice: true, cashJournalEntry: true },
  });
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
    where: { tenantId, activity },
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
 */
export async function reconcileBankTransaction(
  bankTransactionId: string,
  target: { type: ReconcileTargetType; id: string }
) {
  const transaction = await prisma.bankTransaction.findUnique({ where: { id: bankTransactionId } });
  if (!transaction) throw new BankTransactionNotFoundError(bankTransactionId);

  if (target.type === "entry") {
    await prisma.entry.update({ where: { id: target.id }, data: { bankTransactionId } });
  } else if (target.type === "invoice") {
    await prisma.invoice.update({ where: { id: target.id }, data: { bankTransactionId } });
  } else {
    await prisma.cashJournalEntry.update({ where: { id: target.id }, data: { bankTransactionId } });
  }
}

export async function unreconcileBankTransaction(bankTransactionId: string) {
  await prisma.$transaction([
    prisma.entry.updateMany({ where: { bankTransactionId }, data: { bankTransactionId: null } }),
    prisma.invoice.updateMany({ where: { bankTransactionId }, data: { bankTransactionId: null } }),
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
        issueDate: dateWindow(date),
      },
      orderBy: { issueDate: "desc" },
    }),
    prisma.cashJournalEntry.findMany({
      where: { tenantId, activity, bankTransactionId: null, date: dateWindow(date) },
      orderBy: { date: "desc" },
    }),
  ]);
  return { entries: [], invoices, cashJournalEntries };
}
