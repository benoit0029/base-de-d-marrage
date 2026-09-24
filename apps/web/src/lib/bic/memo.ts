import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { getBicVatSettings, isBicLiableOn } from "@/lib/tva/bic";
import { bicRevenueOfYear } from "@/lib/bic/revenue";
import { ABATTEMENT_SERVICES, ABATTEMENT_VENTES, bicTaxable, URSSAF_TOTAL_SERVICES, URSSAF_TOTAL_VENTES } from "@/lib/bic/social";

// Mémo « ce qu'il me reste réellement » de la micro-BIC, par activité :
// chiffre d'affaires encaissé, cotisations URSSAF + CFP, revenu déclaré aux
// impôts (CA − abattement), et dépenses réellement payées (onglet Dépenses)
// pour savoir si les charges restent sous l'abattement. Avant impôt sur le
// revenu, qui dépend de tout le foyer.

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface BicMemoLine {
  activity: "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH";
  ca: number;
  urssafRate: number; // cotisations + CFP
  cotisations: number;
  abattementRate: number;
  declared: number; // revenu déclaré aux impôts
  maxDepenses: number; // dépenses possibles avant de gagner moins que ce qu'on déclare
  depenses: number; // dépenses validées et payées dans l'année
  reste: number; // CA − cotisations − dépenses
}

export function memoLine(activity: BicMemoLine["activity"], ca: number, depenses: number): BicMemoLine {
  const ventes = activity === "BIC_FRUITS_LEGUMES";
  const urssafRate = ventes ? URSSAF_TOTAL_VENTES : URSSAF_TOTAL_SERVICES;
  const abattementRate = ventes ? ABATTEMENT_VENTES : ABATTEMENT_SERVICES;
  const cotisations = round2(ca * urssafRate);
  const declared = bicTaxable(ca, abattementRate);
  return {
    activity,
    ca,
    urssafRate,
    cotisations,
    abattementRate,
    declared,
    maxDepenses: round2(ca - declared - cotisations),
    depenses,
    reste: round2(ca - cotisations - depenses),
  };
}

/** Dépenses (achats et immobilisations) validées et payées dans l'année — TTC en franchise, HT une fois la TVA récupérable. */
async function depensesOfYear(activity: BicMemoLine["activity"], year: number): Promise<number> {
  const tenantId = await getDefaultTenantId();
  const [vat, entries] = await Promise.all([
    getBicVatSettings(),
    prisma.entry.findMany({
      where: {
        tenantId,
        activity,
        type: { in: ["ACHAT", "IMMOBILISATION"] },
        status: "VALIDATED",
        deletedAt: null,
        paidAt: { gte: new Date(year, 0, 1), lte: new Date(year, 11, 31, 23, 59, 59) },
      },
      select: { paidAt: true, amountHt: true, amountTtc: true },
    }),
  ]);
  return round2(entries.reduce((s, e) => s + Number(isBicLiableOn(vat, e.paidAt!) ? e.amountHt : e.amountTtc), 0));
}

export async function computeBicMemo(year: number): Promise<BicMemoLine[]> {
  const [revenue, depFl, depPb] = await Promise.all([
    bicRevenueOfYear(year),
    depensesOfYear("BIC_FRUITS_LEGUMES", year),
    depensesOfYear("BIC_PHOTOBOOTH", year),
  ]);
  return [memoLine("BIC_PHOTOBOOTH", revenue.services, depPb), memoLine("BIC_FRUITS_LEGUMES", revenue.ventes, depFl)];
}
