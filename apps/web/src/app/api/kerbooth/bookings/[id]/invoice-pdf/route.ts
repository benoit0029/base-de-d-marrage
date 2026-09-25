import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { getBooking } from "@/server/services/kerbooth/bookings";
import { renderInvoicePdfBuffer } from "@/server/services/invoicePdf";

// Facture d'une réservation du site, pour n8n (workflow
// kerbooth-stripe-payment-received) qui la joint au mail de confirmation.
// Remplace l'ancien lien /api/invoices/<id>/pdf, qui demandait de se
// connecter à l'appli : le client ne pouvait pas l'ouvrir.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const booking = await getBooking(id);
  const result = booking?.invoiceId ? await renderInvoicePdfBuffer(booking.invoiceId) : null;
  if (!result) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
    },
  });
}
