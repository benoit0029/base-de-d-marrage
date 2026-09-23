import type { Activity } from "@prisma/client";
import { getBicVatSettings, isBicLiableOn } from "@/lib/tva/bic";

/**
 * Le maraîchage (micro-BA, régime simplifié agricole) est toujours assujetti.
 * Les deux activités micro-BIC (Fruits/Légumes, Kerbooth 360°) sont en
 * franchise en base — factures "TVA non applicable, art. 293 B du CGI", aucune
 * TVA facturée — jusqu'à la date de bascule confirmée par l'exploitant
 * (CompanySettings.bicVatLiableFrom, voir lib/tva/bic), puis assujetties à
 * partir de cette date.
 */
export async function isVatApplicableOn(activity: Activity, date: Date): Promise<boolean> {
  if (activity === "BA_MARAICHAGE") return true;
  return isBicLiableOn(await getBicVatSettings(), date);
}
