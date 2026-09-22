import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { setStripeCheckoutClientSecret, KerboothBookingNotFoundError } from "@/server/services/kerbooth/bookings";

// Appelé par n8n juste après la création de la session Stripe Checkout
// embarquée (ui_mode: "embedded"), pour que le site puisse ensuite récupérer
// ce client_secret via l'endpoint de statut pendant que le client attend sur
// la page (parcours embarqué signature+paiement, voir architecture-decision.md).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const clientSecret = typeof body.clientSecret === "string" ? body.clientSecret : null;
  if (!clientSecret) {
    return NextResponse.json({ error: "clientSecret obligatoire" }, { status: 400 });
  }

  try {
    const booking = await setStripeCheckoutClientSecret(id, clientSecret);
    return NextResponse.json(booking);
  } catch (err) {
    if (err instanceof KerboothBookingNotFoundError) {
      return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
    }
    throw err;
  }
}
