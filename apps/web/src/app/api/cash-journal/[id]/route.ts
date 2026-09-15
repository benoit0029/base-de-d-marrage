import { NextRequest, NextResponse } from "next/server";
import {
  CashJournalAlreadyValidatedError,
  CashJournalEntryNotFoundError,
  deleteCashJournalEntry,
} from "@/server/services/cashJournal";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteCashJournalEntry(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CashJournalEntryNotFoundError) {
      return NextResponse.json({ error: "Saisie introuvable" }, { status: 404 });
    }
    if (err instanceof CashJournalAlreadyValidatedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
