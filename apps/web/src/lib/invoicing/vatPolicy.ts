import type { Activity } from "@prisma/client";

/**
 * Seul le maraîchage (micro-BA) est assujetti à la TVA dans ce projet ("micro-BA
 * maraîchage avec TVA" — régime simplifié agricole). Les deux activités
 * micro-BIC (Fruits/Légumes, Kerbooth 360°) sont sous le régime de la
 * franchise en base tant que leurs seuils ne sont pas dépassés : leurs
 * factures doivent porter la mention "TVA non applicable, art. 293 B du CGI"
 * et ne peuvent facturer aucune TVA.
 */
export function isVatApplicable(activity: Activity): boolean {
  return activity === "BA_MARAICHAGE";
}
