import { getBooking } from "@/server/services/kerbooth/bookings";
import { getCompanySettings } from "@/server/services/settings";
import { renderContractPdf } from "@/lib/pdf/render";
import type { KerboothFormula } from "@prisma/client";

const FORMULA_LABEL: Record<KerboothFormula, string> = {
  ESSENTIEL: "Essentiel (1 jour)",
  POPULAIRE: "Populaire (weekend)",
  ENTREPRISE: "Entreprise",
};

/**
 * Génère le PDF du contrat de location Kerbooth 360° pour une réservation
 * donnée, à partir des données en base (source de vérité, même principe que
 * renderInvoicePdfBuffer) — c'est ce PDF qu'un futur nœud n8n téléchargera
 * pour l'attacher à la demande de signature Yousign (voir
 * kerbooth360/architecture-decision.md).
 */
export async function renderKerboothContractPdfBuffer(
  bookingId: string
): Promise<{ buffer: Buffer; filename: string } | null> {
  const booking = await getBooking(bookingId);
  if (!booking) return null;

  const company = await getCompanySettings();

  const buffer = await renderContractPdf({
    loueur: {
      legalName: company?.legalName ?? "(identité non renseignée — voir Réglages)",
      address: company?.address ?? "",
      siren: company?.siren ?? "",
    },
    client: { name: booking.clientName },
    bookingId: booking.id,
    formulaLabel: FORMULA_LABEL[booking.formula],
    eventDateStart: booking.eventDateStart.toLocaleDateString("fr-FR"),
    eventDateEnd: booking.eventDateEnd.toLocaleDateString("fr-FR"),
    eventLocation: booking.eventLocation,
    totalAmount: Number(booking.totalAmount),
  });

  return { buffer, filename: `contrat-kerbooth-${booking.id}.pdf` };
}
