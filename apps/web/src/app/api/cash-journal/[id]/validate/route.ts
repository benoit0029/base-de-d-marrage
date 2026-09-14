import { NextRequest, NextResponse } from "next/server";
import {
  CashJournalAlreadyValidatedError,
  CashJournalEntryNotFoundError,
  validateCashJournalEntry,
} from "@/server/services/cashJournal";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    const entry = await validateCashJournalEntry(id, userId);
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof CashJournalEntryNotFoundError) {
      return NextResponse.json({ error: "Saisie introuvable" }, { status: 404 });
    }
    if (err instanceof CashJournalAlreadyValidatedError) {
      return NextResponse.json({ error: "Saisie déjà validée" }, { status: 409 });
    }
    throw err;
  }
}
