import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import {
  markSoldePaid,
  KerboothBookingNotFoundError,
  KerboothBookingStateError,
} from "@/server/services/kerbooth/bookings";

// Appelé par n8n depuis le webhook Stripe "solde prélevé" (déclencheur 9,
// le lendemain de la fin de la location).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const paidAt = typeof body.paidAt === "string" ? new Date(body.paidAt) : new Date();

  try {
    const booking = await markSoldePaid(id, paidAt);
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
