import type { Activity, InvoiceType, Prisma } from "@prisma/client";

// Numérotation légale des factures : chronologique et continue, sans trou
// ni réattribution (mention obligatoire, art. 242 nonies A de l'annexe II au
// CGI — règle connue, non relue sur le texte depuis l'outil). Deux suites
// sous le même SIRET : "BA" pour le Maraîchage (micro-BA), "BIC" pour
// Revente + Kerbooth (micro-BIC). Chaque suite a sa lettre dans le numéro,
// pour qu'aucun numéro ne soit en double dans l'entreprise (choix de Benoît,
// 24/09/2026) : FA-M2026-001 / FA-K2026-001 (factures), AV-M… / AV-K…
// (avoirs), DE-M… / DE-K… (devis, pas d'obligation légale mais même logique).

export type InvoiceSeries = "BA" | "BIC";

export function seriesOf(activity: Activity): InvoiceSeries {
  return activity === "BA_MARAICHAGE" ? "BA" : "BIC";
}

const KIND: Record<InvoiceType, "FA" | "AV" | "DE"> = { FACTURE: "FA", AVOIR: "AV", DEVIS: "DE" };

const SERIES_LETTER: Record<InvoiceSeries, "M" | "K"> = { BA: "M", BIC: "K" };

export function formatInvoiceNumber(type: InvoiceType, series: InvoiceSeries, year: number, sequence: number): string {
  return `${KIND[type]}-${SERIES_LETTER[series]}${year}-${String(sequence).padStart(3, "0")}`;
}

/**
 * Réserve le numéro suivant, DANS la transaction qui crée le document : le
 * compteur (InvoiceSequence) ne recule jamais — même si une facture de test
 * est effacée de la base, son numéro n'est jamais réattribué. La mise à jour
 * verrouille la ligne du compteur, donc deux créations simultanées ne peuvent
 * pas obtenir le même numéro.
 */
export async function nextInvoiceNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  activity: Activity,
  type: InvoiceType,
  issueDate: Date
): Promise<{ series: InvoiceSeries; number: string }> {
  const series = seriesOf(activity);
  const kind = KIND[type];
  const year = issueDate.getFullYear();
  const seq = await tx.invoiceSequence.upsert({
    where: { tenantId_series_kind_year: { tenantId, series, kind, year } },
    create: { tenantId, series, kind, year, lastNumber: 1 },
    update: { lastNumber: { increment: 1 } },
  });
  return { series, number: formatInvoiceNumber(type, series, year, seq.lastNumber) };
}
