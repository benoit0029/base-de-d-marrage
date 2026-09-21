import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import {
  markPaymentReceived,
  KerboothBookingNotFoundError,
  KerboothBookingStateError,
} from "@/server/services/kerbooth/bookings";

// Appelé par n8n depuis le webhook Stripe "paiement reçu" (déclencheur 4,
// paiement direct en une fois — plus d'acompte/solde séparés, voir
// kerbooth360/architecture-decision.md point 4) : crée et marque payée la
// facture dans l'outil compta.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  // Stripe Checkout ne renseigne "customer" que si un compte client est créé
  // (pas notre cas — paiement unique, pas d'abonnement ni de second
  // prélèvement à mémoriser) : souvent null, purement informatif, jamais
  // bloquant.
  const stripeCustomerId = typeof body.stripeCustomerId === "string" ? body.stripeCustomerId : null;
  const paidAt = typeof body.paidAt === "string" ? new Date(body.paidAt) : new Date();

  try {
    const booking = await markPaymentReceived(id, { stripeCustomerId, paidAt });
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
