import { NextRequest, NextResponse } from "next/server";
import {
  BankTransactionAlreadyValidatedError,
  BankTransactionNotFoundError,
  deleteBankTransaction,
} from "@/server/services/bankTransactions";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteBankTransaction(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BankTransactionNotFoundError) {
      return NextResponse.json({ error: "Opération introuvable" }, { status: 404 });
    }
    if (err instanceof BankTransactionAlreadyValidatedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
