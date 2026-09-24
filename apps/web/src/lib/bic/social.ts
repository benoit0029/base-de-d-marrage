// Régime social de la micro-BIC (voir CompanySettings.bicSocialRegime).
export const BIC_SOCIAL_REGIMES = ["MSA", "URSSAF_MENSUEL", "URSSAF_TRIMESTRIEL"] as const;
export type BicSocialRegime = (typeof BIC_SOCIAL_REGIMES)[number];

export const BIC_SOCIAL_LABEL: Record<BicSocialRegime, string> = {
  MSA: "Rattachée à mon activité principale agricole (MSA)",
  URSSAF_MENSUEL: "Micro-entrepreneur — déclaration URSSAF mensuelle",
  URSSAF_TRIMESTRIEL: "Micro-entrepreneur — déclaration URSSAF trimestrielle",
};

// Taux de cotisations sociales du micro-entrepreneur (hors versement
// libératoire) et contribution à la formation professionnelle (CFP) —
// vérifiés par Benoît le 24/09/2026. Ils changent de temps en temps : les
// mettre à jour ici.
export const URSSAF_RATE_VENTES = 0.123;
export const URSSAF_RATE_SERVICES = 0.212;
export const CFP_RATE = 0.001;
// Total prélevé (cotisations + CFP), écrit tel quel pour éviter les
// arrondis de virgule flottante.
export const URSSAF_TOTAL_VENTES = 0.124;
export const URSSAF_TOTAL_SERVICES = 0.213;

// Abattements forfaitaires du régime micro-BIC (sans versement
// libératoire), minimum 305 € — vérifiés par Benoît le 24/09/2026.
export const ABATTEMENT_VENTES = 0.71;
export const ABATTEMENT_SERVICES = 0.5;
export const ABATTEMENT_MIN = 305;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Revenu imposable estimé : chiffre d'affaires moins l'abattement. */
export function bicTaxable(ca: number, rate: number): number {
  if (ca <= 0) return 0;
  return round2(ca - Math.min(ca, Math.max(ca * rate, ABATTEMENT_MIN)));
}

/** Cotisations sociales + CFP estimées sur un chiffre d'affaires. */
export function urssafDue(revenue: { ventes: number; services: number }): number {
  return round2(revenue.ventes * URSSAF_TOTAL_VENTES + revenue.services * URSSAF_TOTAL_SERVICES);
}

/** 0.213 → "21,3" */
export function pct(rate: number): string {
  return String(Math.round(rate * 1000) / 10).replace(".", ",");
}

export function asBicSocialRegime(value: string | null | undefined): BicSocialRegime | null {
  return BIC_SOCIAL_REGIMES.find((r) => r === value) ?? null;
}
