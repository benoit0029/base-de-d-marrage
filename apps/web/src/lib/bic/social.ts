// Régime social de la micro-BIC (voir CompanySettings.bicSocialRegime).
export const BIC_SOCIAL_REGIMES = ["MSA", "URSSAF_MENSUEL", "URSSAF_TRIMESTRIEL"] as const;
export type BicSocialRegime = (typeof BIC_SOCIAL_REGIMES)[number];

export const BIC_SOCIAL_LABEL: Record<BicSocialRegime, string> = {
  MSA: "Rattachée à mon activité principale agricole (MSA)",
  URSSAF_MENSUEL: "Micro-entrepreneur — déclaration URSSAF mensuelle",
  URSSAF_TRIMESTRIEL: "Micro-entrepreneur — déclaration URSSAF trimestrielle",
};

// Taux de cotisations sociales du micro-entrepreneur (hors versement
// libératoire, formation professionnelle comprise dans aucun des deux) —
// valeurs connues, NON vérifiées sur un texte officiel : à vérifier sur
// autoentrepreneur.urssaf.fr, ils changent régulièrement.
export const URSSAF_RATE_VENTES = 0.123;
export const URSSAF_RATE_SERVICES = 0.212;

export function asBicSocialRegime(value: string | null | undefined): BicSocialRegime | null {
  return BIC_SOCIAL_REGIMES.find((r) => r === value) ?? null;
}
