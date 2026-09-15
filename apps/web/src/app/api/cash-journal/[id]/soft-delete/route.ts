import { NextRequest, NextResponse } from "next/server";
import {
  CashJournalEntryNotFoundError,
  CashJournalNotValidatedError,
  softDeleteCashJournalEntry,
} from "@/server/services/cashJournal";
import { FiscalYearClosedError } from "@/server/services/fiscalYearClosure";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    await softDeleteCashJournalEntry(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof CashJournalEntryNotFoundError) {
      return NextResponse.json({ error: "Saisie introuvable" }, { status: 404 });
    }
    if (err instanceof CashJournalNotValidatedError || err instanceof FiscalYearClosedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
