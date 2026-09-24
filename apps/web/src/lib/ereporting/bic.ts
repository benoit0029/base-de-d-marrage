import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { currentYearRange } from "@/lib/thresholds";
import { vatFromTtc } from "@/lib/tva";
import { BIC_VAT_RATE_FRUITS_LEGUMES, getBicVatSettings, isBicLiableOn } from "@/lib/tva/bic";

// E-reporting de la micro-BIC : totaux par jour des ventes aux particuliers
// (Revente, journal de caisse validé) et des prestations encaissées
// (Kerbooth, factures et avoirs remboursés), avec la TVA seulement après la
// sortie de franchise. Préparation seulement : rien n'est transmis, format
// et fréquence exacts à confirmer (obligation au 1er septembre 2027, via
// Abby). Les réservations Kerbooth de clients professionnels relèveront de
// la facture électronique plutôt que de l'e-reporting.

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BicEReportingTotals {
  ventesTtc: number;
  ventesVat: number;
  servicesTtc: number;
  servicesVat: number;
}

export interface BicEReportingDay extends BicEReportingTotals {
  date: string; // AAAA-MM-JJ
}

export interface BicEReportingMonth extends BicEReportingTotals {
  month: number;
  days: BicEReportingDay[];
}

const empty = (): BicEReportingTotals => ({ ventesTtc: 0, ventesVat: 0, servicesTtc: 0, servicesVat: 0 });
const add = (a: BicEReportingTotals, b: BicEReportingTotals): BicEReportingTotals => ({
  ventesTtc: round2(a.ventesTtc + b.ventesTtc),
  ventesVat: round2(a.ventesVat + b.ventesVat),
  servicesTtc: round2(a.servicesTtc + b.servicesTtc),
  servicesVat: round2(a.servicesVat + b.servicesVat),
});

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function computeBicEReporting(year: number): Promise<{ months: BicEReportingMonth[]; total: BicEReportingTotals }> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);
  const [vat, days, invoices] = await Promise.all([
    getBicVatSettings(),
    prisma.cashJournalEntry.findMany({
      where: { tenantId, activity: "BIC_FRUITS_LEGUMES", status: "VALIDATED", deletedAt: null, date: { gte: start, lte: end } },
      select: { date: true, cashAmount: true, exceptionalSales: true },
    }),
    prisma.invoice.findMany({
      where: {
        tenantId,
        activity: "BIC_PHOTOBOOTH",
        type: { in: ["FACTURE", "AVOIR"] },
        status: { in: ["SENT", "PAID"] },
        paidAt: { gte: start, lte: end },
      },
      select: { paidAt: true, totalTtc: true, totalVat: true },
    }),
  ]);

  const byDay = new Map<string, BicEReportingTotals>();
  const bump = (key: string, t: Partial<BicEReportingTotals>) => byDay.set(key, add(byDay.get(key) ?? empty(), { ...empty(), ...t }));

  for (const d of days) {
    const exceptional = Array.isArray(d.exceptionalSales)
      ? d.exceptionalSales.reduce((s: number, sale) => {
          const amount = sale && typeof sale === "object" && "amountTtc" in sale ? Number((sale as { amountTtc: unknown }).amountTtc) : 0;
          return s + (Number.isFinite(amount) ? amount : 0);
        }, 0)
      : 0;
    const ttc = Number(d.cashAmount) + exceptional;
    const tax = isBicLiableOn(vat, d.date) ? round2(vatFromTtc(ttc, BIC_VAT_RATE_FRUITS_LEGUMES)) : 0;
    bump(isoDay(d.date), { ventesTtc: round2(ttc), ventesVat: tax });
  }
  for (const inv of invoices) {
    bump(isoDay(inv.paidAt!), { servicesTtc: round2(Number(inv.totalTtc)), servicesVat: round2(Number(inv.totalVat)) });
  }

  const months: BicEReportingMonth[] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, days: [], ...empty() }));
  for (const date of [...byDay.keys()].sort()) {
    const t = byDay.get(date)!;
    const m = months[Number(date.slice(5, 7)) - 1];
    m.days.push({ date, ...t });
    Object.assign(m, add(m, t));
  }
  return { months, total: months.reduce<BicEReportingTotals>((acc, m) => add(acc, m), empty()) };
}

export function bicEReportingCsv(months: BicEReportingMonth[]): string {
  const num = (n: number) => n.toFixed(2).replace(".", ",");
  const lines = ["Date;Ventes TTC (Revente);TVA ventes;Prestations TTC (Kerbooth);TVA prestations"];
  for (const m of months) {
    for (const d of m.days) {
      const [y, mo, da] = d.date.split("-");
      lines.push([`${da}/${mo}/${y}`, num(d.ventesTtc), num(d.ventesVat), num(d.servicesTtc), num(d.servicesVat)].join(";"));
    }
  }
  return lines.join("\r\n") + "\r\n";
}
