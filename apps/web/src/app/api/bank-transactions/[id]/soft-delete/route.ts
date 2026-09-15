import { NextRequest, NextResponse } from "next/server";
import {
  BankTransactionNotFoundError,
  BankTransactionNotValidatedError,
  softDeleteBankTransaction,
} from "@/server/services/bankTransactions";
import { FiscalYearClosedError } from "@/server/services/fiscalYearClosure";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    await softDeleteBankTransaction(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BankTransactionNotFoundError) {
      return NextResponse.json({ error: "Opération introuvable" }, { status: 404 });
    }
    if (err instanceof BankTransactionNotValidatedError || err instanceof FiscalYearClosedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
