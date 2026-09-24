import { sumCashJournalTotal, sumInvoicedTotal } from "@/lib/thresholds";

// Chiffre d'affaires encaissé de la micro-BIC, séparé entre ventes de
// marchandises (Revente fruits/légumes) et prestations de services
// (Kerbooth) — les deux lignes distinctes de la déclaration de revenus et de
// l'URSSAF. Mêmes sources que les seuils (lib/thresholds) : factures
// encaissées (HT) + ventes directes validées (journal de caisse).

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BicRevenue {
  ventes: number; // Revente fruits/légumes
  services: number; // Kerbooth 360
}

export async function bicRevenueBetween(start: Date, end: Date): Promise<BicRevenue> {
  const [flInvoices, flCash, pbInvoices] = await Promise.all([
    sumInvoicedTotal("BIC_FRUITS_LEGUMES", start, end),
    sumCashJournalTotal("BIC_FRUITS_LEGUMES", start, end),
    sumInvoicedTotal("BIC_PHOTOBOOTH", start, end),
  ]);
  return { ventes: round2(flInvoices + flCash), services: round2(pbInvoices) };
}

export async function bicRevenueByMonth(year: number): Promise<(BicRevenue & { month: number })[]> {
  return Promise.all(
    Array.from({ length: 12 }, async (_, i) => ({
      month: i + 1,
      ...(await bicRevenueBetween(new Date(year, i, 1), new Date(year, i + 1, 0, 23, 59, 59))),
    }))
  );
}

export async function bicRevenueOfYear(year: number): Promise<BicRevenue> {
  return bicRevenueBetween(new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59));
}
