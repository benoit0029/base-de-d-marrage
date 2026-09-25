import { prisma } from "@/server/db/client";
import { getCompanySettings } from "@/server/services/settings";
import { getKerboothQuote } from "@/server/services/kerbooth/quotes";
import { renderInvoicePdfBuffer } from "@/server/services/invoicePdf";
import { renderBusinessContractPdf } from "@/lib/pdf/render";
import { KERBOOTH_DEPOSIT_PER_UNIT, formatPeriod } from "@/lib/kerbooth/quotes";

// Documents d'un devis entreprise, régénérés à chaque demande depuis la base
// (même principe que les factures) : devis et contrat pour la demande de
// signature Yousign, facture pour le mail envoyé après signature.

export async function renderQuoteDocument(
  quoteId: string,
  kind: "devis" | "contract" | "invoice"
): Promise<{ buffer: Buffer; filename: string } | null> {
  const quote = await getKerboothQuote(quoteId);
  if (!quote) return null;
  if (kind === "devis") return renderInvoicePdfBuffer(quote.quoteInvoiceId);
  if (kind === "invoice") return quote.invoiceId ? renderInvoicePdfBuffer(quote.invoiceId) : null;

  const [devis, company] = await Promise.all([
    prisma.invoice.findUniqueOrThrow({ where: { id: quote.quoteInvoiceId } }),
    getCompanySettings(),
  ]);
  const buffer = await renderBusinessContractPdf({
    loueur: {
      legalName: company?.legalName ?? "(identité non renseignée — voir Réglages)",
      address: company?.address ?? "",
      siren: company?.siren ?? "",
    },
    client: {
      name: devis.clientName,
      address: devis.clientAddress ?? undefined,
      siren: devis.clientSiren ?? undefined,
    },
    devisNumber: devis.number,
    formulaLabel: quote.formulaLabel,
    photoboothCount: quote.photoboothCount,
    periods: quote.periods.map((p) => formatPeriod(p.start, p.end)),
    eventLocation: quote.eventLocation,
    totalTtc: Number(devis.totalTtc),
    vatApplicable: devis.vatApplicable,
    paymentTermDays: quote.paymentTermDays,
    depositPerUnit: KERBOOTH_DEPOSIT_PER_UNIT,
  });
  return { buffer, filename: `contrat-${devis.number}.pdf` };
}
