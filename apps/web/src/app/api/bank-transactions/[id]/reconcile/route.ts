import { NextRequest, NextResponse } from "next/server";
import {
  reconcileBankTransaction,
  BankTransactionNotFoundError,
  type ReconcileTargetType,
} from "@/server/services/bankTransactions";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const targetType = body?.targetType as ReconcileTargetType | undefined;
  const targetId = body?.targetId as string | undefined;

  if (!targetType || !targetId || !["entry", "invoice", "cashJournal"].includes(targetType)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  try {
    await reconcileBankTransaction(id, { type: targetType, id: targetId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof BankTransactionNotFoundError) {
      return NextResponse.json({ error: "Opération introuvable" }, { status: 404 });
    }
    throw err;
  }
}
