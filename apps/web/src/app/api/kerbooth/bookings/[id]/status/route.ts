import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { getBooking } from "@/server/services/kerbooth/bookings";

// Appelé par n8n (webhook public kerbooth-booking-status) pour transmettre au
// site, pendant qu'il fait patienter le client sur la page après signature,
// uniquement les deux champs nécessaires pour afficher l'étape suivante —
// jamais les coordonnées ni le montant, contrairement à GET /bookings/[id].
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const booking = await getBooking(id);
  if (!booking) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }
  return NextResponse.json({
    status: booking.status,
    stripeCheckoutClientSecret: booking.stripeCheckoutClientSecret,
  });
}
