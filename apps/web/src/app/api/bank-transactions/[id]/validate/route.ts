import { NextRequest, NextResponse } from "next/server";
import {
  BankTransactionAlreadyValidatedError,
  BankTransactionNotFoundError,
  validateBankTransaction,
} from "@/server/services/bankTransactions";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    const tx = await validateBankTransaction(id, userId);
    return NextResponse.json({ transaction: tx });
  } catch (err) {
    if (err instanceof BankTransactionNotFoundError) {
      return NextResponse.json({ error: "Opération introuvable" }, { status: 404 });
    }
    if (err instanceof BankTransactionAlreadyValidatedError) {
      return NextResponse.json({ error: "Opération déjà validée" }, { status: 409 });
    }
    throw err;
  }
}
