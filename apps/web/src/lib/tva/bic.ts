import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import {
  LEGAL_THRESHOLDS,
  currentYearRange,
  sumCashJournalTotal,
  sumInvoicedTotal,
} from "@/lib/thresholds";
import { ca12aDeadline, vatFromTtc, TVA_INSTALLMENT_THRESHOLD } from "@/lib/tva";

// ---------------------------------------------------------------------------
// TVA de la micro-BIC (Revente Fruits/Légumes + Kerbooth 360°, une seule
// micro-entreprise) : détection de la fin de franchise en base, puis
// déclaration annuelle CA12 (3517-S-SD, régime réel simplifié) une fois
// assujetti.
//
// Règle de sortie de franchise (art. 293 B du CGI, depuis la loi de finances
// 2025 — l'ancienne tolérance "deux années de suite" est supprimée) :
//   - CA de l'année précédente > seuil de base  → TVA due dès le 1er janvier
//     de l'année en cours ;
//   - CA de l'année en cours > seuil de base    → TVA due au 1er janvier de
//     l'année suivante ;
//   - CA de l'année en cours > seuil majoré     → TVA due dès l'opération qui
//     fait franchir ce seuil.
// Activité mixte : le seuil "ventes" (85 000 / 93 500 €) porte sur le CA
// GLOBAL, le seuil "services" (37 500 / 41 250 €) sur la part Kerbooth — un
// seul dépassement suffit pour toute la micro-entreprise.
// À faire confirmer par Cerfrance le jour venu : cas de l'année de création
// (seuils éventuellement proratisés), retour en franchise.
// ---------------------------------------------------------------------------

export const BIC_VAT_RATE_SERVICES = 0.2; // location Kerbooth 360°
export const BIC_VAT_RATE_FRUITS_LEGUMES = 0.055;

const BIC_ACTIVITIES = ["BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"] as const;

export type BicVatPricing = "INCLUDED" | "ADDED";

export interface BicVatSettings {
  liableFrom: Date | null;
  pricing: BicVatPricing;
  vatNumber: string | null;
}

export async function getBicVatSettings(): Promise<BicVatSettings> {
  const tenantId = await getDefaultTenantId();
  const company = await prisma.companySettings.findUnique({
    where: { tenantId },
    select: { bicVatLiableFrom: true, bicVatPricing: true, vatNumber: true },
  });
  return {
    liableFrom: company?.bicVatLiableFrom ?? null,
    pricing: company?.bicVatPricing === "ADDED" ? "ADDED" : "INCLUDED",
    vatNumber: company?.vatNumber ?? null,
  };
}

export function isBicLiableOn(settings: BicVatSettings, date: Date): boolean {
  return settings.liableFrom !== null && date >= settings.liableFrom;
}

export type BicVatDetection =
  | { status: "franchise" }
  | { status: "liable"; effectiveDate: Date; reason: string; ca: number; seuil: number }
  | { status: "liable_next_year"; effectiveDate: Date; reason: string; ca: number; seuil: number };

/**
 * Date à partir de laquelle la micro-BIC n'est plus en franchise, d'après
 * ses recettes encaissées (année précédente ET année en cours) — ne modifie
 * rien : c'est une proposition, confirmée ensuite par l'exploitant.
 */
export async function detectBicVatLiability(referenceDate = new Date()): Promise<BicVatDetection> {
  const tenantId = await getDefaultTenantId();
  const year = referenceDate.getFullYear();
  const { VENTE, SERVICE } = LEGAL_THRESHOLDS;

  // 1. Année précédente au-dessus du seuil de base → TVA depuis le 1er janvier.
  const prev = currentYearRange(year - 1);
  const [prevGoods, prevServices] = await Promise.all([
    sumCashJournalTotal("BIC_FRUITS_LEGUMES", prev.start, prev.end),
    sumInvoicedTotal("BIC_PHOTOBOOTH", prev.start, prev.end),
  ]);
  const prevTotal = prevGoods + prevServices;
  if (prevServices > SERVICE.franchiseTva || prevTotal > VENTE.franchiseTva) {
    const servicesOver = prevServices > SERVICE.franchiseTva;
    return {
      status: "liable",
      effectiveDate: new Date(year, 0, 1),
      ca: servicesOver ? prevServices : prevTotal,
      seuil: servicesOver ? SERVICE.franchiseTva : VENTE.franchiseTva,
      reason:
        servicesOver
          ? `CA Kerbooth ${year - 1} supérieur à ${SERVICE.franchiseTva} € (seuil de base services)`
          : `CA global ${year - 1} supérieur à ${VENTE.franchiseTva} € (seuil de base)`,
    };
  }

  // 2. Année en cours : opérations dans l'ordre chronologique, pour trouver
  //    celle qui fait franchir un seuil majoré.
  const { start, end } = currentYearRange(year);
  const [invoices, cashEntries] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        tenantId,
        activity: "BIC_PHOTOBOOTH",
        type: "FACTURE",
        status: { in: ["SENT", "PAID"] },
        paidAt: { gte: start, lte: end },
      },
      select: { paidAt: true, totalHt: true },
    }),
    prisma.cashJournalEntry.findMany({
      where: {
        tenantId,
        activity: "BIC_FRUITS_LEGUMES",
        status: "VALIDATED",
        deletedAt: null,
        date: { gte: start, lte: end },
      },
      select: { date: true, cashAmount: true, checkAmount: true, cardAmount: true, exceptionalSales: true },
    }),
  ]);

  const operations = [
    ...invoices.map((i) => ({ date: i.paidAt as Date, amount: Number(i.totalHt), service: true })),
    ...cashEntries.map((e) => ({ date: e.date, amount: cashEntryTotal(e), service: false })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumTotal = 0;
  let cumServices = 0;
  for (const op of operations) {
    cumTotal += op.amount;
    if (op.service) cumServices += op.amount;
    if (cumServices > SERVICE.franchiseTvaTolerance || cumTotal > VENTE.franchiseTvaTolerance) {
      const servicesOver = cumServices > SERVICE.franchiseTvaTolerance;
      return {
        status: "liable",
        effectiveDate: op.date,
        ca: servicesOver ? cumServices : cumTotal,
        seuil: servicesOver ? SERVICE.franchiseTvaTolerance : VENTE.franchiseTvaTolerance,
        reason:
          servicesOver
            ? `CA Kerbooth ${year} supérieur au seuil majoré de ${SERVICE.franchiseTvaTolerance} €`
            : `CA global ${year} supérieur au seuil majoré de ${VENTE.franchiseTvaTolerance} €`,
      };
    }
  }

  // 3. Année en cours au-dessus du seuil de base seulement → au 1er janvier suivant.
  if (cumServices > SERVICE.franchiseTva || cumTotal > VENTE.franchiseTva) {
    const servicesOver = cumServices > SERVICE.franchiseTva;
    return {
      status: "liable_next_year",
      effectiveDate: new Date(year + 1, 0, 1),
      ca: servicesOver ? cumServices : cumTotal,
      seuil: servicesOver ? SERVICE.franchiseTva : VENTE.franchiseTva,
      reason:
        servicesOver
          ? `CA Kerbooth ${year} supérieur à ${SERVICE.franchiseTva} € (seuil de base services)`
          : `CA global ${year} supérieur à ${VENTE.franchiseTva} € (seuil de base)`,
    };
  }

  return { status: "franchise" };
}

function cashEntryTotal(e: {
  cashAmount: unknown;
  checkAmount: unknown;
  cardAmount: unknown;
  exceptionalSales: unknown;
}): number {
  const exceptional = Array.isArray(e.exceptionalSales)
    ? e.exceptionalSales.reduce((s: number, sale) => {
        const amount =
          sale && typeof sale === "object" && "amountTtc" in sale
            ? Number((sale as { amountTtc: unknown }).amountTtc)
            : 0;
        return s + (Number.isFinite(amount) ? amount : 0);
      }, 0)
    : 0;
  return Number(e.cashAmount) + Number(e.checkAmount) + Number(e.cardAmount) + exceptional;
}

// ---------------------------------------------------------------------------
// Déclaration annuelle CA12 (3517-S-SD) — micro-BIC assujettie.
// ---------------------------------------------------------------------------

export interface BicAnnualVatDeclaration {
  year: number;
  liableFrom: Date | null;
  liableThisYear: boolean;
  periodStart: Date | null; // début de la période déclarée (1er janvier ou date de bascule)
  collectedKerbooth: number;
  collectedFruitsLegumes: number;
  collected: number;
  deductibleAutres: number;
  deductibleImmobilisations: number;
  deductibleTotal: number;
  netVat: number;
  deadline: Date;
  // Acomptes semestriels de l'année suivante (juillet 55 %, décembre 40 %),
  // dus seulement si la TVA nette de l'année atteint 1 000 €.
  nextYearInstallments: { july: number; december: number } | null;
}

export async function computeBicAnnualVat(year: number): Promise<BicAnnualVatDeclaration> {
  const tenantId = await getDefaultTenantId();
  const settings = await getBicVatSettings();
  const { start: yearStart, end } = currentYearRange(year);

  const empty: BicAnnualVatDeclaration = {
    year,
    liableFrom: settings.liableFrom,
    liableThisYear: false,
    periodStart: null,
    collectedKerbooth: 0,
    collectedFruitsLegumes: 0,
    collected: 0,
    deductibleAutres: 0,
    deductibleImmobilisations: 0,
    deductibleTotal: 0,
    netVat: 0,
    deadline: ca12aDeadline(year),
    nextYearInstallments: null,
  };
  if (!settings.liableFrom || settings.liableFrom > end) return empty;

  const start = settings.liableFrom > yearStart ? settings.liableFrom : yearStart;
  const paidInPeriod = { gte: start, lte: end };

  const [kerboothAgg, cashEntries, autresAgg, immoAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        tenantId,
        activity: { in: [...BIC_ACTIVITIES] },
        type: "FACTURE",
        status: { in: ["SENT", "PAID"] },
        vatApplicable: true,
        paidAt: paidInPeriod,
      },
      _sum: { totalVat: true },
    }),
    prisma.cashJournalEntry.findMany({
      where: { tenantId, activity: "BIC_FRUITS_LEGUMES", status: "VALIDATED", deletedAt: null, date: paidInPeriod },
      select: { cashAmount: true, checkAmount: true, cardAmount: true, exceptionalSales: true },
    }),
    prisma.entry.aggregate({
      where: {
        tenantId,
        activity: { in: [...BIC_ACTIVITIES] },
        type: "ACHAT",
        status: "VALIDATED",
        deletedAt: null,
        paidAt: paidInPeriod,
      },
      _sum: { amountVat: true },
    }),
    prisma.entry.aggregate({
      where: {
        tenantId,
        activity: { in: [...BIC_ACTIVITIES] },
        type: "IMMOBILISATION",
        status: "VALIDATED",
        deletedAt: null,
        paidAt: paidInPeriod,
      },
      _sum: { amountVat: true },
    }),
  ]);

  const collectedKerbooth = Number(kerboothAgg._sum.totalVat ?? 0);
  const fruitsLegumesTtc = cashEntries.reduce((s, e) => s + cashEntryTotal(e), 0);
  const collectedFruitsLegumes = vatFromTtc(fruitsLegumesTtc, BIC_VAT_RATE_FRUITS_LEGUMES);
  const collected = collectedKerbooth + collectedFruitsLegumes;
  const deductibleAutres = Number(autresAgg._sum.amountVat ?? 0);
  const deductibleImmobilisations = Number(immoAgg._sum.amountVat ?? 0);
  const deductibleTotal = deductibleAutres + deductibleImmobilisations;
  const netVat = collected - deductibleTotal;

  return {
    ...empty,
    liableThisYear: true,
    periodStart: start,
    collectedKerbooth,
    collectedFruitsLegumes,
    collected,
    deductibleAutres,
    deductibleImmobilisations,
    deductibleTotal,
    netVat,
    nextYearInstallments:
      netVat >= TVA_INSTALLMENT_THRESHOLD ? { july: netVat * 0.55, december: netVat * 0.4 } : null,
  };
}
