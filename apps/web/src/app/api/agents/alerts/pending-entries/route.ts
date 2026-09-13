import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { checkPendingEntriesTooLong } from "@/server/services/alerts";

// Appelé par le workflow n8n de rappel (planifié, ex. une fois par jour).
// Ne renvoie que les écritures pas déjà signalées dans les dernières 24h.
export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const days = Number(req.nextUrl.searchParams.get("days") ?? "3");
  const entries = await checkPendingEntriesTooLong(Number.isFinite(days) ? days : 3);

  return NextResponse.json({ count: entries.length, entries });
}
