import path from "node:path";
import archiver, { type Archiver } from "archiver";
import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { currentYearRange } from "@/lib/thresholds";
import { saveDocumentFile, readDocumentFile } from "@/lib/storage";
import { renderClosureRecapPdf } from "@/lib/pdf/render";
import { generateClosingReportPdf } from "@/server/services/reports";
import { renderInvoicePdfBuffer } from "@/server/services/invoicePdf";
import type { Activity } from "@prisma/client";

const activityLabel: Record<Activity, string> = {
  BA_MARAICHAGE: "Maraîchage",
  BIC_FRUITS_LEGUMES: "Revente Fruits/Légumes",
  BIC_PHOTOBOOTH: "Kerbooth 360",
};

const activityFolder: Record<Activity, string> = {
  BA_MARAICHAGE: "maraichage",
  BIC_FRUITS_LEGUMES: "fruits-legumes",
  BIC_PHOTOBOOTH: "photobooth",
};

export class FiscalYearClosureError extends Error {}
export class FiscalYearAlreadyClosedError extends FiscalYearClosureError {}
export class FiscalYearClosedError extends FiscalYearClosureError {}

export interface PendingBlocker {
  label: string;
  count: number;
}

export class FiscalYearBlockedError extends FiscalYearClosureError {
  blockers: PendingBlocker[];
  constructor(blockers: PendingBlocker[]) {
    super(
      "Des lignes sont encore en attente de validation quelque part dans l'application : impossible de clôturer tant qu'elles n'ont pas été traitées (validées ou supprimées)."
    );
    this.blockers = blockers;
  }
}

export class FiscalYearOrderError extends FiscalYearClosureError {
  expectedYear: number;
  constructor(expectedYear: number) {
    super(
      `Clôturez d'abord l'exercice ${expectedYear} : les exercices doivent être clôturés dans l'ordre chronologique.`
    );
    this.expectedYear = expectedYear;
  }
}

/**
 * Lignes encore en attente, tous registres et toutes activités confondus —
 * bloque toute clôture tant qu'elles existent (voir docs/ARCHITECTURE.md,
 * Module Clôture d'exercice) : une ligne non validée pourrait encore changer
 * d'exercice une fois traitée.
 */
export async function listPendingBlockers(): Promise<PendingBlocker[]> {
  const tenantId = await getDefaultTenantId();
  const blockers: PendingBlocker[] = [];

  const entryGroups = await prisma.entry.groupBy({
    by: ["activity"],
    where: { tenantId, status: "PENDING", deletedAt: null },
    _count: { _all: true },
  });
  for (const g of entryGroups) {
    blockers.push({ label: `${activityLabel[g.activity]} — Dépenses`, count: g._count._all });
  }

  const cashGroups = await prisma.cashJournalEntry.groupBy({
    by: ["activity"],
    where: { tenantId, status: "PENDING", deletedAt: null },
    _count: { _all: true },
  });
  for (const g of cashGroups) {
    blockers.push({
      label: `${activityLabel[g.activity]} — Recettes (journal de caisse)`,
      count: g._count._all,
    });
  }

  const bankGroups = await prisma.bankTransaction.groupBy({
    by: ["activity"],
    where: { tenantId, status: "PENDING", deletedAt: null },
    _count: { _all: true },
  });
  for (const g of bankGroups) {
    blockers.push({ label: `${activityLabel[g.activity]} — Relevé bancaire`, count: g._count._all });
  }

  const simpleImportCount = await prisma.simpleImport.count({
    where: { tenantId, status: "PENDING", deletedAt: null },
  });
  if (simpleImportCount > 0) {
    blockers.push({ label: "Maraîchage — Tesa+ / Cotisations non salarié", count: simpleImportCount });
  }

  const tvaCount = await prisma.tvaInstallment.count({
    where: { tenantId, status: "PENDING", deletedAt: null },
  });
  if (tvaCount > 0) {
    blockers.push({ label: "Acompte TVA", count: tvaCount });
  }

  return blockers;
}

export async function listClosedYears(): Promise<number[]> {
  const tenantId = await getDefaultTenantId();
  const rows = await prisma.fiscalYearClosure.findMany({
    where: { tenantId },
    orderBy: { year: "asc" },
    select: { year: true, createdAt: true, zipFileUrl: true },
  });
  return rows.map((r) => r.year);
}

export interface ClosureRecord {
  year: number;
  closedAt: Date;
  zipFileUrl: string | null;
}

export async function listClosures(): Promise<ClosureRecord[]> {
  const tenantId = await getDefaultTenantId();
  const rows = await prisma.fiscalYearClosure.findMany({
    where: { tenantId },
    orderBy: { year: "desc" },
  });
  return rows.map((r) => ({ year: r.year, closedAt: r.createdAt, zipFileUrl: r.zipFileUrl }));
}

/**
 * Années portant des données réglées (encaissées/payées, ou saisies de
 * caisse/acomptes validés) — seules ces années comptent pour l'ordre
 * chronologique de clôture. Une année sans aucun mouvement réglé n'a pas
 * besoin d'être clôturée avant une année suivante.
 */
async function settledYears(tenantId: string): Promise<number[]> {
  const [entries, invoices, cashJournal, tvaInstallments] = await Promise.all([
    prisma.entry.findMany({ where: { tenantId, paidAt: { not: null } }, select: { paidAt: true } }),
    prisma.invoice.findMany({ where: { tenantId, paidAt: { not: null } }, select: { paidAt: true } }),
    prisma.cashJournalEntry.findMany({
      where: { tenantId, status: "VALIDATED", deletedAt: null },
      select: { date: true },
    }),
    prisma.tvaInstallment.findMany({
      where: { tenantId, status: "VALIDATED", deletedAt: null },
      select: { paidAt: true },
    }),
  ]);
  const years = new Set<number>();
  for (const e of entries) if (e.paidAt) years.add(e.paidAt.getFullYear());
  for (const i of invoices) if (i.paidAt) years.add(i.paidAt.getFullYear());
  for (const c of cashJournal) years.add(c.date.getFullYear());
  for (const t of tvaInstallments) years.add(t.paidAt.getFullYear());
  return [...years].sort((a, b) => a - b);
}

/** Prochain exercice clôturable dans l'ordre chronologique, ou `null` si aucune donnée réglée n'attend de clôture. */
export async function suggestNextClosableYear(): Promise<number | null> {
  const tenantId = await getDefaultTenantId();
  const closed = new Set(await listClosedYears());
  const years = await settledYears(tenantId);
  const open = years.filter((y) => !closed.has(y));
  return open.length > 0 ? Math.min(...open) : null;
}

export async function isYearClosed(year: number): Promise<boolean> {
  const tenantId = await getDefaultTenantId();
  const found = await prisma.fiscalYearClosure.findUnique({
    where: { tenantId_year: { tenantId, year } },
  });
  return !!found;
}

/**
 * À appeler avant toute modification qui effacerait ou déplacerait une
 * information déjà comptée dans un exercice clôturé (suppression douce d'une
 * ligne payée, annulation d'un rapprochement bancaire). Ne s'applique
 * jamais à une créance/dette encore en cours (paidAt vide) : elle n'est
 * rattachée à aucun exercice tant qu'elle n'est pas réglée, voir
 * docs/ARCHITECTURE.md, Module Clôture d'exercice.
 */
export async function assertDateNotInClosedYear(
  date: Date | null | undefined,
  context: string
): Promise<void> {
  if (!date) return;
  if (await isYearClosed(date.getFullYear())) {
    throw new FiscalYearClosedError(
      `Exercice ${date.getFullYear()} déjà clôturé : ${context} n'est plus modifiable.`
    );
  }
}

function slug(input: string): string {
  const cleaned = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return cleaned || "piece";
}

function dateStr(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function addStoredFile(
  archive: Archiver,
  url: string | null | undefined,
  folder: string,
  baseName: string
): Promise<void> {
  if (!url || !url.startsWith("local://")) return; // driver S3 futur : à adapter alors, voir docs/ARCHITECTURE.md
  const filename = url.slice("local://".length);
  try {
    const buffer = await readDocumentFile(filename);
    const ext = path.extname(filename) || "";
    archive.append(buffer, { name: `${folder}/${baseName}${ext}` });
  } catch {
    // Fichier introuvable : ne bloque jamais la génération du dossier complet.
  }
}

/**
 * Pièces sources de l'exercice, organisées par activité puis par sous-onglet
 * — la structure de dossiers reprend celle des onglets registre de
 * l'application, pour rester lisible sans elle (contrôle fiscal, remise à un
 * expert-comptable).
 */
async function appendSourceDocuments(
  archive: Archiver,
  tenantId: string,
  start: Date,
  end: Date
): Promise<void> {
  const entries = await prisma.entry.findMany({
    where: {
      tenantId,
      type: { in: ["ACHAT", "IMMOBILISATION"] },
      status: "VALIDATED",
      deletedAt: null,
      paidAt: { gte: start, lte: end },
    },
    include: { sourceDocument: true },
  });
  for (const [i, e] of entries.entries()) {
    await addStoredFile(
      archive,
      e.sourceDocument?.fileUrl,
      `pieces/${activityFolder[e.activity]}/depenses`,
      `${i + 1}-${dateStr(e.date)}-${slug(e.counterpartyName)}`
    );
  }

  const cashEntries = await prisma.cashJournalEntry.findMany({
    where: { tenantId, status: "VALIDATED", deletedAt: null, date: { gte: start, lte: end } },
  });
  for (const [i, c] of cashEntries.entries()) {
    const folder = `pieces/${activityFolder[c.activity]}/recettes`;
    await addStoredFile(archive, c.depositSlipUrl, folder, `${i + 1}-bordereau-${dateStr(c.date)}`);
    await addStoredFile(archive, c.cardStatementUrl, folder, `${i + 1}-cb-${dateStr(c.date)}`);
  }

  const invoices = await prisma.invoice.findMany({
    where: { tenantId, type: { in: ["FACTURE", "AVOIR"] }, paidAt: { gte: start, lte: end } },
  });
  for (const inv of invoices) {
    const rendered = await renderInvoicePdfBuffer(inv.id);
    if (rendered) {
      archive.append(rendered.buffer, {
        name: `pieces/${activityFolder[inv.activity]}/facturation/${rendered.filename}`,
      });
    }
  }

  const bankTransactions = await prisma.bankTransaction.findMany({
    where: { tenantId, status: "VALIDATED", deletedAt: null, date: { gte: start, lte: end } },
  });
  const seenBankFiles = new Set<string>();
  for (const tx of bankTransactions) {
    if (!tx.sourceFileUrl) continue;
    const key = `${tx.activity}|${tx.sourceFileHash ?? tx.sourceFileUrl}`;
    if (seenBankFiles.has(key)) continue;
    seenBankFiles.add(key);
    await addStoredFile(
      archive,
      tx.sourceFileUrl,
      `pieces/${activityFolder[tx.activity]}/releve-bancaire`,
      `releve-${seenBankFiles.size}`
    );
  }

  const installments = await prisma.tvaInstallment.findMany({
    where: { tenantId, status: "VALIDATED", deletedAt: null, paidAt: { gte: start, lte: end } },
  });
  for (const [i, t] of installments.entries()) {
    await addStoredFile(
      archive,
      t.justificatifUrl,
      "pieces/maraichage/acompte-tva",
      `${i + 1}-${slug(t.dueLabel)}`
    );
  }

  const simpleImports = await prisma.simpleImport.findMany({
    where: { tenantId, status: "VALIDATED", deletedAt: null, date: { gte: start, lte: end } },
  });
  for (const [i, s] of simpleImports.entries()) {
    const subfolder = s.category === "COTISATION_NON_SALARIE" ? "cotisations-non-salarie" : "tesa-plus";
    await addStoredFile(
      archive,
      s.fileUrl,
      `pieces/maraichage/${subfolder}`,
      `${i + 1}-${s.category.toLowerCase()}`
    );
  }
}

async function buildClosureZip(year: number): Promise<Buffer> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);

  const archive = archiver("zip", { zlib: { level: 9 } });
  const chunks: Buffer[] = [];
  archive.on("data", (chunk: Buffer) => chunks.push(chunk));
  const done = new Promise<void>((resolve, reject) => {
    archive.on("end", () => resolve());
    archive.on("error", reject);
  });

  const synthesisPdf = await generateClosingReportPdf(year);
  archive.append(synthesisPdf, { name: `synthese-cloture-${year}.pdf` });

  const [creances, dettes] = await Promise.all([
    prisma.invoice.findMany({
      where: { tenantId, type: "FACTURE", status: "SENT", paidAt: null },
      orderBy: { issueDate: "asc" },
    }),
    prisma.entry.findMany({
      where: {
        tenantId,
        type: { in: ["ACHAT", "IMMOBILISATION"] },
        status: "VALIDATED",
        deletedAt: null,
        paidAt: null,
      },
      orderBy: { date: "asc" },
    }),
  ]);
  const recapPdf = await renderClosureRecapPdf({
    year,
    generatedAt: new Date().toLocaleDateString("fr-FR"),
    creances: creances.map((c) => ({
      activity: activityLabel[c.activity],
      number: c.number,
      clientName: c.clientName,
      issueDate: c.issueDate.toLocaleDateString("fr-FR"),
      totalTtc: Number(c.totalTtc),
    })),
    dettes: dettes.map((d) => ({
      activity: activityLabel[d.activity],
      counterpartyName: d.counterpartyName,
      date: d.date.toLocaleDateString("fr-FR"),
      amountTtc: Number(d.amountTtc),
    })),
  });
  archive.append(recapPdf, { name: `creances-dettes-en-cours-${year}.pdf` });

  await appendSourceDocuments(archive, tenantId, start, end);

  archive.finalize();
  await done;
  return Buffer.concat(chunks);
}

/**
 * Clôture un exercice : vérifie l'absence de lignes en attente (partout,
 * voir listPendingBlockers) et le respect de l'ordre chronologique, génère
 * le dossier ZIP (synthèse + créances/dettes + pièces sources), puis
 * verrouille l'exercice. Irréversible depuis l'interface (aucune fonction de
 * réouverture en v1 — voir docs/ARCHITECTURE.md).
 */
export async function closeFiscalYear(
  year: number,
  userId: string | null
): Promise<{ zipFileUrl: string }> {
  const tenantId = await getDefaultTenantId();

  const already = await prisma.fiscalYearClosure.findUnique({
    where: { tenantId_year: { tenantId, year } },
  });
  if (already) throw new FiscalYearAlreadyClosedError(`Exercice ${year} déjà clôturé.`);

  const blockers = await listPendingBlockers();
  if (blockers.length > 0) throw new FiscalYearBlockedError(blockers);

  const expected = await suggestNextClosableYear();
  if (expected !== null && expected !== year) {
    throw new FiscalYearOrderError(expected);
  }

  const zipBuffer = await buildClosureZip(year);
  const { url } = await saveDocumentFile(zipBuffer, `cloture-${year}.zip`);

  await prisma.$transaction([
    prisma.fiscalYearClosure.create({
      data: { tenantId, year, closedById: userId, zipFileUrl: url },
    }),
    prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: "FISCAL_YEAR_CLOSED",
        entityType: "FiscalYearClosure",
        entityId: String(year),
        before: Prisma.JsonNull,
        after: { year },
      },
    }),
  ]);

  return { zipFileUrl: url };
}
