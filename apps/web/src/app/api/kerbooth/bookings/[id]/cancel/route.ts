import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import {
  cancelBooking,
  KerboothBookingNotFoundError,
  KerboothBookingStateError,
} from "@/server/services/kerbooth/bookings";

// Appelé par n8n : contrat non signé sous 48h (déclencheur 5bis) ou
// annulation manuelle. Aucun remboursement automatique (voir CGV article 5
// et server/services/kerbooth/bookings.ts) — un remboursement éventuel
// reste un geste manuel de Benoît, hors du périmètre de cette route.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const booking = await cancelBooking(id);
    return NextResponse.json(booking);
  } catch (err) {
    if (err instanceof KerboothBookingNotFoundError) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    if (err instanceof KerboothBookingStateError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
