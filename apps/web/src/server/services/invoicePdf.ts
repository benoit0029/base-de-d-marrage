import { getInvoiceWithLines } from "@/server/services/invoices";
import { getCompanySettings, listActivitySettings } from "@/server/services/settings";
import { renderInvoicePdf } from "@/lib/pdf/render";
import { activities } from "@/lib/nav";
import { formatIban } from "@/lib/invoicing/iban";
import { KERBOOTH_DEPOSIT_PER_UNIT, formatPeriod } from "@/lib/kerbooth/quotes";
import { prisma } from "@/server/db/client";

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
  const kerboothQuote =
    invoice.type === "DEVIS"
      ? await prisma.kerboothQuote.findUnique({
          where: { quoteInvoiceId: invoice.id },
          include: { periods: { orderBy: { position: "asc" } } },
        })
      : null;
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
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
      abCertificationCode: activitySettings?.abCertificationCode ?? undefined,
    },
    client: {
      name: invoice.clientName,
      address: invoice.clientAddress ?? undefined,
      siren: invoice.clientSiren ?? undefined,
      vatNumber: invoice.clientVatNumber ?? undefined,
    },
    bank: activitySettings?.bankIban
      ? {
          holder: company?.legalName ?? "",
          iban: formatIban(activitySettings.bankIban),
          bic: activitySettings.bankBic ?? undefined,
        }
      : undefined,
    paidOnIssueDate:
      invoice.type === "FACTURE" && invoice.paidAt && sameDay(invoice.paidAt, invoice.issueDate)
        ? invoice.paidAt.toLocaleDateString("fr-FR")
        : undefined,
    validUntil: kerboothQuote?.expiresAt?.toLocaleDateString("fr-FR"),
    kerboothQuote: kerboothQuote
      ? {
          formulaLabel: kerboothQuote.formulaLabel,
          photoboothCount: kerboothQuote.photoboothCount,
          periods: kerboothQuote.periods.map((p) => formatPeriod(p.start, p.end)),
          eventLocation: kerboothQuote.eventLocation,
          depositPerUnit: KERBOOTH_DEPOSIT_PER_UNIT,
          paymentTermDays: kerboothQuote.paymentTermDays,
        }
      : undefined,
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
    // Le code du certificateur AB figure désormais dans les coordonnées
    // (abCertificationCode ci-dessus) ; abMentionText reste réservé au futur
    // logo AB (case « Afficher le logo AB » dans Réglages).
    extraLegalMentions: activitySettings?.legalMentions ?? undefined,
  });

  return { buffer, filename: `${invoice.number}.pdf` };
}
