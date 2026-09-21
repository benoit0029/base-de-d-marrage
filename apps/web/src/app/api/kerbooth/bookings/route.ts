import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import {
  createBooking,
  listBookings,
  NoAvailableUnitError,
  KerboothBookingInputError,
} from "@/server/services/kerbooth/bookings";

const VALID_FORMULAS = new Set(["ESSENTIEL", "POPULAIRE", "ENTREPRISE"]);

// Appelé par n8n après vérification de disponibilité côté formulaire (voir
// kerbooth360/architecture-technique-kerbooth360.md, déclencheurs 1-2). Un
// 409 signale "aucune unité disponible" — le site doit alors afficher
// "complet à cette date" (déclencheur 2bis), jamais planter silencieusement.
export async function POST(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }

  const {
    clientName,
    clientEmail,
    clientPhone,
    eventDateStart,
    eventDateEnd,
    eventLocation,
    formula,
    totalAmount,
    durationDays,
  } = body as Record<string, unknown>;

  if (typeof clientName !== "string" || !clientName.trim()) {
    return NextResponse.json({ error: "clientName obligatoire" }, { status: 400 });
  }
  if (typeof eventDateStart !== "string" || typeof eventDateEnd !== "string") {
    return NextResponse.json({ error: "eventDateStart/eventDateEnd obligatoires (ISO 8601)" }, { status: 400 });
  }
  if (typeof eventLocation !== "string" || !eventLocation.trim()) {
    return NextResponse.json({ error: "eventLocation obligatoire" }, { status: 400 });
  }
  if (typeof formula !== "string" || !VALID_FORMULAS.has(formula)) {
    return NextResponse.json({ error: "formula invalide (ESSENTIEL, POPULAIRE ou ENTREPRISE)" }, { status: 400 });
  }

  try {
    const booking = await createBooking({
      clientName,
      clientEmail: typeof clientEmail === "string" ? clientEmail : undefined,
      clientPhone: typeof clientPhone === "string" ? clientPhone : undefined,
      eventDateStart: new Date(eventDateStart),
      eventDateEnd: new Date(eventDateEnd),
      eventLocation,
      formula: formula as "ESSENTIEL" | "POPULAIRE" | "ENTREPRISE",
      totalAmount: typeof totalAmount === "number" ? totalAmount : undefined,
      durationDays: typeof durationDays === "number" ? durationDays : undefined,
    });
    return NextResponse.json(booking, { status: 201 });
  } catch (err) {
    if (err instanceof NoAvailableUnitError) {
      return NextResponse.json({ error: "Complet à cette date", code: "NO_AVAILABLE_UNIT" }, { status: 409 });
    }
    if (err instanceof KerboothBookingInputError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await listBookings());
}
