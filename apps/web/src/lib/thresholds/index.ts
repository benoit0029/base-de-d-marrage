import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";

/**
 * Seuils légaux (barème 2024-2025, exercices en euros). À VÉRIFIER chaque
 * année sur impots.gouv.fr avant toute décision : ces montants sont
 * revalorisés régulièrement et ce module ne les met pas à jour automatiquement.
 *
 * - Vente de marchandises (Revente Fruits/Légumes) : franchise TVA 85 000 €
 *   (tolérance jusqu'à 93 500 € l'année du dépassement), plafond micro-BIC
 *   188 700 €.
 * - Prestations de services BIC (Kerbooth 360°) : franchise TVA 37 500 €
 *   (tolérance jusqu'à 41 250 €), plafond micro-BIC 77 700 €.
 * - Activité mixte dans une même micro-entreprise (les deux ci-dessus) :
 *   plafond global 188 700 €, à condition que la part "services" ne dépasse
 *   pas 77 700 € à l'intérieur de ce total.
 * - Micro-BA (Maraîchage) : régime distinct, bascule vers le régime réel si
 *   la moyenne des recettes HT sur les 3 dernières années dépasse le seuil
 *   (≈ 91 900 €, à reconfirmer).
 */
export const LEGAL_THRESHOLDS = {
  VENTE: { franchiseTva: 85_000, franchiseTvaTolerance: 93_500, plafond: 188_700 },
  SERVICE: { franchiseTva: 37_500, franchiseTvaTolerance: 41_250, plafond: 77_700 },
  MIXTE_PLAFOND_GLOBAL: 188_700,
  BA_MOYENNE_TRIENNALE: 91_900,
};

export type AlertLevel = "ok" | "vigilance" | "depassement";

export interface ThresholdCheck {
  label: string;
  caCumule: number;
  seuil: number;
  seuilTolerance?: number;
  level: AlertLevel;
}

function levelFor(ca: number, seuil: number, tolerance?: number): AlertLevel {
  if (ca > (tolerance ?? seuil)) return "depassement";
  if (ca >= seuil * 0.8) return "vigilance";
  return "ok";
}

async function sumValidatedRecettesHt(
  activity: "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH",
  yearStart: Date,
  yearEnd: Date
): Promise<number> {
  const tenantId = await getDefaultTenantId();
  const result = await prisma.entry.aggregate({
    where: {
      tenantId,
      activity,
      type: "RECETTE",
      status: "VALIDATED",
      date: { gte: yearStart, lte: yearEnd },
    },
    _sum: { amountHt: true },
  });
  return Number(result._sum.amountHt ?? 0);
}

function currentYearRange(year: number): { start: Date; end: Date } {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
}

export interface BicThresholdsResult {
  year: number;
  caFruitsLegumes: number;
  caPhotobooth: number;
  caTotal: number;
  franchiseVente: ThresholdCheck;
  franchiseService: ThresholdCheck;
  plafondGlobalMixte: ThresholdCheck;
}

export async function computeBicThresholds(year = new Date().getFullYear()): Promise<BicThresholdsResult> {
  const { start, end } = currentYearRange(year);
  const [caFruitsLegumes, caPhotobooth] = await Promise.all([
    sumValidatedRecettesHt("BIC_FRUITS_LEGUMES", start, end),
    sumValidatedRecettesHt("BIC_PHOTOBOOTH", start, end),
  ]);
  const caTotal = caFruitsLegumes + caPhotobooth;

  return {
    year,
    caFruitsLegumes,
    caPhotobooth,
    caTotal,
    franchiseVente: {
      label: "Franchise TVA — vente de marchandises (Fruits/Légumes)",
      caCumule: caFruitsLegumes,
      seuil: LEGAL_THRESHOLDS.VENTE.franchiseTva,
      seuilTolerance: LEGAL_THRESHOLDS.VENTE.franchiseTvaTolerance,
      level: levelFor(
        caFruitsLegumes,
        LEGAL_THRESHOLDS.VENTE.franchiseTva,
        LEGAL_THRESHOLDS.VENTE.franchiseTvaTolerance
      ),
    },
    franchiseService: {
      label: "Franchise TVA — prestations de services (Kerbooth 360°)",
      caCumule: caPhotobooth,
      seuil: LEGAL_THRESHOLDS.SERVICE.franchiseTva,
      seuilTolerance: LEGAL_THRESHOLDS.SERVICE.franchiseTvaTolerance,
      level: levelFor(
        caPhotobooth,
        LEGAL_THRESHOLDS.SERVICE.franchiseTva,
        LEGAL_THRESHOLDS.SERVICE.franchiseTvaTolerance
      ),
    },
    plafondGlobalMixte: {
      label: "Plafond micro-BIC cumulé (activité mixte)",
      caCumule: caTotal,
      seuil: LEGAL_THRESHOLDS.MIXTE_PLAFOND_GLOBAL,
      level: levelFor(caTotal, LEGAL_THRESHOLDS.MIXTE_PLAFOND_GLOBAL),
    },
  };
}

export interface BaThresholdResult {
  yearsConsidered: number[];
  recettesParAnnee: Record<number, number>;
  moyenneTriennale: number;
  check: ThresholdCheck;
}

export async function computeBaThreshold(referenceYear = new Date().getFullYear()): Promise<BaThresholdResult> {
  const years = [referenceYear - 2, referenceYear - 1, referenceYear];
  const recettesParAnnee: Record<number, number> = {};

  for (const year of years) {
    const { start, end } = currentYearRange(year);
    recettesParAnnee[year] = await sumValidatedRecettesHt("BA_MARAICHAGE", start, end);
  }

  // Moyenne sur les seules années où l'activité a généré des recettes
  // (approximation raisonnable en l'absence de date de création connue) —
  // à affiner une fois l'historique complet disponible.
  const activeYears = years.filter((y) => recettesParAnnee[y] > 0);
  const consideredYears = activeYears.length > 0 ? activeYears : years;
  const moyenneTriennale =
    consideredYears.reduce((sum, y) => sum + recettesParAnnee[y], 0) / consideredYears.length;

  return {
    yearsConsidered: consideredYears,
    recettesParAnnee,
    moyenneTriennale,
    check: {
      label: "Micro-BA — moyenne triennale des recettes (maraîchage)",
      caCumule: moyenneTriennale,
      seuil: LEGAL_THRESHOLDS.BA_MOYENNE_TRIENNALE,
      level: levelFor(moyenneTriennale, LEGAL_THRESHOLDS.BA_MOYENNE_TRIENNALE),
    },
  };
}
