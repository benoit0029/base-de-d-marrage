import { NextRequest, NextResponse } from "next/server";
import {
  EntryAlreadyPaidError,
  EntryNotFoundError,
  EntryNotYetValidatedForPaymentError,
  markEntryPaid,
} from "@/server/services/entries";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const paidAtStr = body?.paidAt;
  const paidAt = typeof paidAtStr === "string" ? new Date(paidAtStr) : null;

  if (!paidAt || Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: "Date de paiement invalide" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  try {
    const entry = await markEntryPaid(id, paidAt, userId);
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof EntryNotFoundError) {
      return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });
    }
    if (err instanceof EntryNotYetValidatedForPaymentError) {
      return NextResponse.json({ error: "Écriture pas encore validée" }, { status: 409 });
    }
    if (err instanceof EntryAlreadyPaidError) {
      return NextResponse.json({ error: "Déjà marquée payée" }, { status: 409 });
    }
    throw err;
  }
}
