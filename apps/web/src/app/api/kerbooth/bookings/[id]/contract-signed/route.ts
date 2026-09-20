import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import {
  confirmContractSigned,
  KerboothBookingNotFoundError,
  KerboothBookingStateError,
} from "@/server/services/kerbooth/bookings";

// Appelé par n8n depuis le webhook Yousign "contrat signé" (déclencheur 5).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const yousignRequestId = typeof body.yousignRequestId === "string" ? body.yousignRequestId : null;
  if (!yousignRequestId) {
    return NextResponse.json({ error: "yousignRequestId obligatoire" }, { status: 400 });
  }
  const signedAt = typeof body.signedAt === "string" ? new Date(body.signedAt) : new Date();

  try {
    const booking = await confirmContractSigned(id, { yousignRequestId, signedAt });
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
