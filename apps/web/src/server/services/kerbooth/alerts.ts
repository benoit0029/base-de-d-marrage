import { getCompanySettings } from "@/server/services/settings";
import { bicRevenueBetween } from "@/lib/bic/revenue";
import { asBicSocialRegime, urssafDue } from "@/lib/bic/social";

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Rappel de déclaration URSSAF de la micro-BIC (Revente + Kerbooth), selon
 * le régime social choisi dans Synthèse micro-BIC → Cotisations sociales :
 * - "MSA" (revenus rattachés à l'activité principale agricole, cas de
 *   Benoît) ou régime non choisi → aucun rappel (null) ;
 * - "URSSAF_MENSUEL" → chiffre d'affaires du mois précédent ;
 * - "URSSAF_TRIMESTRIEL" → seulement en janvier, avril, juillet et octobre,
 *   chiffre d'affaires du trimestre précédent.
 * Ventes et services séparés, chacun avec son taux (valeurs à vérifier,
 * voir lib/bic/social). Aucune télétransmission : montant à déclarer
 * soi-même sur autoentrepreneur.urssaf.fr.
 */
export async function computeUrssafReminder(referenceDate = new Date()) {
  const regime = asBicSocialRegime((await getCompanySettings())?.bicSocialRegime);
  if (regime !== "URSSAF_MENSUEL" && regime !== "URSSAF_TRIMESTRIEL") return null;

  const y = referenceDate.getFullYear();
  const m = referenceDate.getMonth();
  let periodStart: Date;
  let periodLabel: string;
  if (regime === "URSSAF_MENSUEL") {
    periodStart = new Date(y, m - 1, 1);
    periodLabel = periodStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  } else {
    if (m % 3 !== 0) return null; // pas un début de trimestre
    periodStart = new Date(y, m - 3, 1);
    const q = Math.floor(periodStart.getMonth() / 3) + 1;
    periodLabel = `${q}${q === 1 ? "er" : "e"} trimestre ${periodStart.getFullYear()}`;
  }
  const periodEnd = new Date(y, m, 0, 23, 59, 59);

  const revenue = await bicRevenueBetween(periodStart, periodEnd);
  return {
    periodLabel,
    ventes: revenue.ventes,
    services: revenue.services,
    caEncaisse: round2(revenue.ventes + revenue.services),
    cotisationsDues: urssafDue(revenue),
  };
}
