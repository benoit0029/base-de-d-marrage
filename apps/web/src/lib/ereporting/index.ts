import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { currentYearRange } from "@/lib/thresholds";
import { vatFromTtc } from "@/lib/tva";

// E-reporting (Maraîchage) : totaux des ventes aux particuliers, par jour et
// par taux de TVA, tels qu'ils devront être transmis à l'administration via
// la plateforme agréée (Abby) à partir du 1er septembre 2027. Préparation
// seulement : rien n'est transmis, et le format/la fréquence exacts restent à
// confirmer au moment de la mise en place. Source : journal de caisse validé
// (ventes directes), même extraction de TVA que la CA12A — plants à 10 %,
// le reste (et les ventes exceptionnelles) à 5,5 %. Les factures n'y sont pas :
// celles aux professionnels passent par la facture électronique.

const RATE_REDUCED = 0.055;
const RATE_PLANTS = 0.1;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface EReportingTotals {
  ttc: number;
  reducedHt: number; // 5,5 %
  reducedVat: number;
  plantsHt: number; // 10 %
  plantsVat: number;
}

export interface EReportingDay extends EReportingTotals {
  date: string; // AAAA-MM-JJ
}

export interface EReportingMonth extends EReportingTotals {
  month: number; // 1-12
  days: EReportingDay[];
}

function emptyTotals(): EReportingTotals {
  return { ttc: 0, reducedHt: 0, reducedVat: 0, plantsHt: 0, plantsVat: 0 };
}

function addTotals(a: EReportingTotals, b: EReportingTotals): EReportingTotals {
  return {
    ttc: round2(a.ttc + b.ttc),
    reducedHt: round2(a.reducedHt + b.reducedHt),
    reducedVat: round2(a.reducedVat + b.reducedVat),
    plantsHt: round2(a.plantsHt + b.plantsHt),
    plantsVat: round2(a.plantsVat + b.plantsVat),
  };
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function computeEReporting(year: number): Promise<{ months: EReportingMonth[]; total: EReportingTotals }> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);

  const entries = await prisma.cashJournalEntry.findMany({
    where: { tenantId, activity: "BA_MARAICHAGE", status: "VALIDATED", deletedAt: null, date: { gte: start, lte: end } },
    select: { date: true, cashAmount: true, checkAmount: true, cardAmount: true, exceptionalSales: true, plantSalesAmount: true },
    orderBy: { date: "asc" },
  });

  // Encaissements TTC du jour, par taux (plusieurs saisies le même jour sont regroupées).
  const byDay = new Map<string, { reducedTtc: number; plantsTtc: number }>();
  for (const e of entries) {
    const exceptional = Array.isArray(e.exceptionalSales)
      ? e.exceptionalSales.reduce((s: number, sale) => {
          const amount =
            sale && typeof sale === "object" && "amountTtc" in sale
              ? Number((sale as { amountTtc: unknown }).amountTtc)
              : 0;
          return s + (Number.isFinite(amount) ? amount : 0);
        }, 0)
      : 0;
    const dayTotal = Number(e.cashAmount) + Number(e.checkAmount) + Number(e.cardAmount) + exceptional;
    const plants = Number(e.plantSalesAmount ?? 0);
    const key = isoDay(e.date);
    const day = byDay.get(key) ?? { reducedTtc: 0, plantsTtc: 0 };
    day.reducedTtc += dayTotal - plants;
    day.plantsTtc += plants;
    byDay.set(key, day);
  }

  const months: EReportingMonth[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, days: [], ...emptyTotals() }));
  for (const [date, { reducedTtc, plantsTtc }] of byDay) {
    const reducedVat = round2(vatFromTtc(reducedTtc, RATE_REDUCED));
    const plantsVat = round2(vatFromTtc(plantsTtc, RATE_PLANTS));
    const day: EReportingDay = {
      date,
      ttc: round2(reducedTtc + plantsTtc),
      reducedHt: round2(reducedTtc - reducedVat),
      reducedVat,
      plantsHt: round2(plantsTtc - plantsVat),
      plantsVat,
    };
    const month = months[Number(date.slice(5, 7)) - 1];
    month.days.push(day);
    Object.assign(month, addTotals(month, day));
  }

  const total = months.reduce<EReportingTotals>((acc, m) => addTotals(acc, m), emptyTotals());
  return { months, total };
}

// Export tableur (une ligne par jour de vente), séparateur ";" et virgule
// décimale pour une ouverture directe dans un tableur français.
export function eReportingCsv(months: EReportingMonth[]): string {
  const num = (n: number) => n.toFixed(2).replace(".", ",");
  const lines = ["Date;Total TTC;HT 5,5 %;TVA 5,5 %;HT 10 %;TVA 10 %"];
  for (const m of months) {
    for (const d of m.days) {
      const [y, mo, da] = d.date.split("-");
      lines.push([`${da}/${mo}/${y}`, num(d.ttc), num(d.reducedHt), num(d.reducedVat), num(d.plantsHt), num(d.plantsVat)].join(";"));
    }
  }
  return lines.join("\r\n") + "\r\n";
}
