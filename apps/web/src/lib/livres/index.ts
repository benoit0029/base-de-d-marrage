import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { currentYearRange } from "@/lib/thresholds";
import { vatFromTtc } from "@/lib/tva";

// Livre des recettes et livre des achats du Maraîchage (micro-BA) : simple
// LECTURE des saisies déjà faites (journal de caisse, factures encaissées,
// autres recettes et Dépenses validées), présentées comme les registres
// légaux — jamais de ressaisie. Contenu repris du document « Obligations
// micro-BA » de Benoît (BOI-BA-DECLA-15, BOI-TVA-SECT-80-30-50-10, non relus
// directement depuis l'outil) : ordre chronologique à la date
// d'encaissement, espèces séparées des autres paiements, référence du
// justificatif, ventes ≤ 76 € regroupées par jour, ventilation par taux de
// TVA, totaux trimestriels et annuels ; achats ventilés entre
// immobilisations et autres achats.

const round2 = (n: number) => Math.round(n * 100) / 100;

export const RECEIPT_RATES = [5.5, 10, 20] as const;
export type ReceiptRate = (typeof RECEIPT_RATES)[number];

export interface RateAmounts {
  ht: number;
  vat: number;
}

export interface ReceiptRow {
  date: Date;
  label: string;
  reference: string; // justificatif
  cash: number; // espèces
  check: number;
  card: number;
  other: number; // virement / autre (factures, autres recettes)
  ttc: number;
  byRate: Record<ReceiptRate, RateAmounts>;
}

export interface ReceiptTotals {
  cash: number;
  check: number;
  card: number;
  other: number;
  ttc: number;
  byRate: Record<ReceiptRate, RateAmounts>;
}

export interface Quarter<Row, Totals> {
  quarter: 1 | 2 | 3 | 4;
  rows: Row[];
  totals: Totals;
}

function emptyByRate(): Record<ReceiptRate, RateAmounts> {
  return { 5.5: { ht: 0, vat: 0 }, 10: { ht: 0, vat: 0 }, 20: { ht: 0, vat: 0 } };
}

function emptyReceiptTotals(): ReceiptTotals {
  return { cash: 0, check: 0, card: 0, other: 0, ttc: 0, byRate: emptyByRate() };
}

function addReceipt(t: ReceiptTotals, r: ReceiptRow | ReceiptTotals): ReceiptTotals {
  const byRate = emptyByRate();
  for (const rate of RECEIPT_RATES) {
    byRate[rate] = { ht: round2(t.byRate[rate].ht + r.byRate[rate].ht), vat: round2(t.byRate[rate].vat + r.byRate[rate].vat) };
  }
  return {
    cash: round2(t.cash + r.cash),
    check: round2(t.check + r.check),
    card: round2(t.card + r.card),
    other: round2(t.other + r.other),
    ttc: round2(t.ttc + r.ttc),
    byRate,
  };
}

// Taux le plus proche parmi ceux du livre (TVA / HT d'une pièce saisie).
function nearestRate(ht: number, vat: number): ReceiptRate {
  const rate = ht > 0 ? (vat / ht) * 100 : 5.5;
  return RECEIPT_RATES.reduce((best, r) => (Math.abs(r - rate) < Math.abs(best - rate) ? r : best), 5.5 as ReceiptRate);
}

// Répartit un TTC encaissé entre 5,5 % et 10 % (plants), TVA arrondie au centime.
function splitTtc(reducedTtc: number, plantsTtc: number): Record<ReceiptRate, RateAmounts> {
  const byRate = emptyByRate();
  const reducedVat = round2(vatFromTtc(reducedTtc, 0.055));
  const plantsVat = round2(vatFromTtc(plantsTtc, 0.1));
  byRate[5.5] = { ht: round2(reducedTtc - reducedVat), vat: reducedVat };
  byRate[10] = { ht: round2(plantsTtc - plantsVat), vat: plantsVat };
  return byRate;
}

const METHOD_LABEL: Record<string, string> = { especes: "espèces", cheque: "chèque", cb: "CB" };

function quarterOf(d: Date): 1 | 2 | 3 | 4 {
  return (Math.floor(d.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
}

export interface ReceiptBook {
  year: number;
  quarters: Quarter<ReceiptRow, ReceiptTotals>[];
  totals: ReceiptTotals;
}

export async function computeReceiptBook(year: number): Promise<ReceiptBook> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);

  const [days, invoices, others] = await Promise.all([
    prisma.cashJournalEntry.findMany({
      where: { tenantId, activity: "BA_MARAICHAGE", status: "VALIDATED", deletedAt: null, date: { gte: start, lte: end } },
      orderBy: { date: "asc" },
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        activity: "BA_MARAICHAGE",
        type: "FACTURE",
        status: { in: ["SENT", "PAID"] },
        paidAt: { gte: start, lte: end },
      },
      include: { lines: true },
      orderBy: { paidAt: "asc" },
    }),
    prisma.entry.findMany({
      where: {
        tenantId,
        activity: "BA_MARAICHAGE",
        type: "RECETTE",
        status: "VALIDATED",
        deletedAt: null,
        paidAt: { gte: start, lte: end },
      },
      orderBy: { paidAt: "asc" },
    }),
  ]);

  const rows: ReceiptRow[] = [];

  for (const d of days) {
    const cash = Number(d.cashAmount);
    const check = Number(d.checkAmount);
    const card = Number(d.cardAmount);
    const dayTtc = cash + check + card;
    const plants = Math.min(Number(d.plantSalesAmount ?? 0), dayTtc);
    if (dayTtc > 0) {
      rows.push({
        date: d.date,
        label: `Ventes directes du jour${d.location ? ` — ${d.location}` : ""} (ventes de 76 € ou moins, regroupées)`,
        reference: d.depositSlipUrl ? "Fiche du jour (photo)" : "Saisie du jour",
        cash: round2(cash),
        check: round2(check),
        card: round2(card),
        other: 0,
        ttc: round2(dayTtc),
        byRate: splitTtc(dayTtc - plants, plants),
      });
    }
    // Ventes > 76 € : une ligne chacune, comptées à 5,5 % (comme la CA12A).
    const exceptional = Array.isArray(d.exceptionalSales) ? d.exceptionalSales : [];
    for (const sale of exceptional) {
      if (!sale || typeof sale !== "object" || !("amountTtc" in sale)) continue;
      const s = sale as { amountTtc: unknown; paymentMethod?: unknown; description?: unknown };
      const amount = Number(s.amountTtc);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      const method = typeof s.paymentMethod === "string" ? s.paymentMethod : "especes";
      rows.push({
        date: d.date,
        label: `Vente > 76 € (${METHOD_LABEL[method] ?? method})${d.location ? ` — ${d.location}` : ""}${typeof s.description === "string" && s.description ? ` — ${s.description}` : ""}`,
        reference: "Saisie du jour",
        cash: method === "especes" ? round2(amount) : 0,
        check: method === "cheque" ? round2(amount) : 0,
        card: method === "cb" ? round2(amount) : 0,
        other: 0,
        ttc: round2(amount),
        byRate: splitTtc(amount, 0),
      });
    }
  }

  for (const inv of invoices) {
    const byRate = emptyByRate();
    for (const l of inv.lines) {
      const ht = Number(l.lineTotal);
      const rate = nearestRate(ht, (ht * Number(l.vatRate)) / 100);
      byRate[rate] = {
        ht: round2(byRate[rate].ht + ht),
        vat: round2(byRate[rate].vat + round2((ht * Number(l.vatRate)) / 100)),
      };
    }
    rows.push({
      date: inv.paidAt!,
      label: `Facture ${inv.number} — ${inv.clientName}`,
      reference: `Facture ${inv.number}`,
      cash: 0,
      check: 0,
      card: 0,
      other: round2(Number(inv.totalTtc)),
      ttc: round2(Number(inv.totalTtc)),
      byRate,
    });
  }

  for (const e of others) {
    const ht = Number(e.amountHt);
    const vat = Number(e.amountVat);
    const byRate = emptyByRate();
    byRate[nearestRate(ht, vat)] = { ht: round2(ht), vat: round2(vat) };
    rows.push({
      date: e.paidAt!,
      label: `${e.nature} — ${e.counterpartyName}`,
      reference: e.sourceDocumentId ? "Document capté" : "Saisie",
      cash: 0,
      check: 0,
      card: 0,
      other: round2(Number(e.amountTtc)),
      ttc: round2(Number(e.amountTtc)),
      byRate,
    });
  }

  rows.sort((a, b) => a.date.getTime() - b.date.getTime());

  const quarters = ([1, 2, 3, 4] as const).map((q) => {
    const qRows = rows.filter((r) => quarterOf(r.date) === q);
    return { quarter: q, rows: qRows, totals: qRows.reduce(addReceipt, emptyReceiptTotals()) };
  });
  return { year, quarters, totals: quarters.reduce((t, q) => addReceipt(t, q.totals), emptyReceiptTotals()) };
}

// ---------------------------------------------------------------------------
// Livre des achats
// ---------------------------------------------------------------------------

export interface PurchaseRow {
  date: Date; // date de paiement
  supplier: string;
  nature: string;
  ht: number;
  vat: number;
  ttc: number;
}

export interface PurchaseTotals {
  ht: number;
  vat: number;
  ttc: number;
}

export interface PurchaseSection {
  quarters: Quarter<PurchaseRow, PurchaseTotals>[];
  totals: PurchaseTotals;
}

export interface PurchaseBook {
  year: number;
  immobilisations: PurchaseSection;
  autres: PurchaseSection;
  totals: PurchaseTotals;
  unpaidCount: number; // dépenses validées pas encore payées (hors livre)
}

function addPurchase(t: PurchaseTotals, r: PurchaseTotals): PurchaseTotals {
  return { ht: round2(t.ht + r.ht), vat: round2(t.vat + r.vat), ttc: round2(t.ttc + r.ttc) };
}

function buildSection(rows: PurchaseRow[]): PurchaseSection {
  const zero = { ht: 0, vat: 0, ttc: 0 };
  const quarters = ([1, 2, 3, 4] as const).map((q) => {
    const qRows = rows.filter((r) => quarterOf(r.date) === q);
    return { quarter: q, rows: qRows, totals: qRows.reduce(addPurchase, zero) };
  });
  return { quarters, totals: quarters.reduce((t, q) => addPurchase(t, q.totals), zero) };
}

export async function computePurchaseBook(year: number): Promise<PurchaseBook> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);

  const [entries, unpaidCount] = await Promise.all([
    prisma.entry.findMany({
      where: {
        tenantId,
        activity: "BA_MARAICHAGE",
        type: { in: ["ACHAT", "IMMOBILISATION"] },
        status: "VALIDATED",
        deletedAt: null,
        paidAt: { gte: start, lte: end },
      },
      orderBy: { paidAt: "asc" },
    }),
    prisma.entry.count({
      where: {
        tenantId,
        activity: "BA_MARAICHAGE",
        type: { in: ["ACHAT", "IMMOBILISATION"] },
        status: "VALIDATED",
        deletedAt: null,
        paidAt: null,
        date: { gte: start, lte: end },
      },
    }),
  ]);

  const toRow = (e: (typeof entries)[number]): PurchaseRow => ({
    date: e.paidAt!,
    supplier: e.counterpartyName,
    nature: e.nature,
    ht: round2(Number(e.amountHt)),
    vat: round2(Number(e.amountVat)),
    ttc: round2(Number(e.amountTtc)),
  });

  const immobilisations = buildSection(entries.filter((e) => e.type === "IMMOBILISATION").map(toRow));
  const autres = buildSection(entries.filter((e) => e.type === "ACHAT").map(toRow));
  return { year, immobilisations, autres, totals: addPurchase(immobilisations.totals, autres.totals), unpaidCount };
}
