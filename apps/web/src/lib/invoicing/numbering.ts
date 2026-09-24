import type { Activity, InvoiceType, Prisma } from "@prisma/client";

// Numérotation légale des factures : chronologique et continue, sans trou
// ni réattribution (mention obligatoire, art. 242 nonies A de l'annexe II au
// CGI — règle connue, non relue sur le texte depuis l'outil). Une suite par
// ENTREPRISE (SIRET) : "BA" pour le Maraîchage (exploitation agricole), "BIC"
// pour Revente + Kerbooth (une seule micro-entreprise → une seule suite).
// Format choisi par Benoît : FA2026-001 (facture), AV2026-001 (avoir),
// DE2026-001 (devis, pas d'obligation légale mais même logique).

export type InvoiceSeries = "BA" | "BIC";

export function seriesOf(activity: Activity): InvoiceSeries {
  return activity === "BA_MARAICHAGE" ? "BA" : "BIC";
}

const KIND: Record<InvoiceType, "FA" | "AV" | "DE"> = { FACTURE: "FA", AVOIR: "AV", DEVIS: "DE" };

export function formatInvoiceNumber(type: InvoiceType, year: number, sequence: number): string {
  return `${KIND[type]}${year}-${String(sequence).padStart(3, "0")}`;
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
  return { series, number: formatInvoiceNumber(type, year, seq.lastNumber) };
}
