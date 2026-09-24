import { getInvoiceWithLines } from "@/server/services/invoices";
import { getCompanySettings, listActivitySettings } from "@/server/services/settings";
import { renderInvoicePdf } from "@/lib/pdf/render";
import { activities } from "@/lib/nav";

const activityLabel: Record<string, string> = {
  BA_MARAICHAGE: "Maraîchage",
  BIC_FRUITS_LEGUMES: "Revente Fruits/Légumes",
  BIC_PHOTOBOOTH: "Kerbooth 360",
};

const activitySlugByDb: Record<string, string> = {
  BA_MARAICHAGE: "maraichage",
  BIC_FRUITS_LEGUMES: "fruits-legumes",
  BIC_PHOTOBOOTH: "photobooth",
};

function accentHex(activity: string): string {
  switch (activity) {
    case "BA_MARAICHAGE":
      return "#2f7d4f";
    case "BIC_FRUITS_LEGUMES":
      return "#c9762c";
    case "BIC_PHOTOBOOTH":
      return "#7a4fc9";
    default:
      return "#1e293b";
  }
}

/**
 * Régénère le PDF d'une facture/devis à partir des données en base (source
 * de vérité — voir app/api/invoices/[id]/pdf/route.ts, qui appelle cette
 * même fonction). Réutilisée par le dossier de clôture d'exercice pour
 * inclure chaque facture encaissée dans l'année comme pièce source.
 */
export async function renderInvoicePdfBuffer(
  invoiceId: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  const invoice = await getInvoiceWithLines(invoiceId);
  if (!invoice) return null;

  const [company, activitySettingsList] = await Promise.all([
    getCompanySettings(),
    listActivitySettings(),
  ]);
  const activitySettings = activitySettingsList.find((s) => s.activity === invoice.activity);
  const navEntry = activities.find((a) => a.slug === activitySlugByDb[invoice.activity]);

  const buffer = await renderInvoicePdf({
    activityLabel: activityLabel[invoice.activity] ?? invoice.activity,
    accentColorHex: navEntry ? accentHex(invoice.activity) : "#1e293b",
    documentTitle: invoice.type === "DEVIS" ? "Devis" : invoice.type === "AVOIR" ? "Facture d'avoir" : "Facture",
    creditNoteFor: invoice.creditedInvoice
      ? `Annule la facture n° ${invoice.creditedInvoice.number} du ${invoice.creditedInvoice.issueDate.toLocaleDateString("fr-FR")}`
      : undefined,
    number: invoice.number,
    issueDate: invoice.issueDate.toLocaleDateString("fr-FR"),
    dueDate: invoice.dueDate?.toLocaleDateString("fr-FR"),
    company: {
      legalName: company?.legalName ?? "(identité non renseignée — voir Réglages)",
      address: company?.address ?? "",
      siren: company?.siren ?? "",
      vatNumber: company?.vatNumber ?? undefined,
      contactEmail: activitySettings?.contactEmail ?? company?.contactEmail ?? undefined,
    },
    client: { name: invoice.clientName, address: invoice.clientAddress ?? undefined },
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate: Number(l.vatRate),
      lineTotal: Number(l.lineTotal),
      unit: l.unit ?? undefined,
    })),
    totalHt: Number(invoice.totalHt),
    totalVat: Number(invoice.totalVat),
    totalTtc: Number(invoice.totalTtc),
    vatApplicable: invoice.vatApplicable,
    logoUrl: activitySettings?.logoUrl,
    abMentionText:
      activitySettings?.abLogoEnabled && activitySettings.abCertificationCode
        ? `Certifié Agriculture Biologique — ${activitySettings.abCertificationCode}`
        : undefined,
    extraLegalMentions: activitySettings?.legalMentions ?? undefined,
  });

  return { buffer, filename: `${invoice.number}.pdf` };
}
