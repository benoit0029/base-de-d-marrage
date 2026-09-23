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
  const targetIds = body?.targetIds as string[] | undefined;

  if (!targetType || !["entry", "invoice", "cashJournal"].includes(targetType)) {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  // Un dépôt peut regrouper plusieurs jours de vente directe non encore
  // pointés (suggestion "cashJournalGroup") : on rapproche chaque jour un
  // par un contre le même dépôt, plutôt que d'étendre reconcileBankTransaction
  // à une liste — Entry/Invoice restent, eux, strictement 1↔1.
  if (targetType === "cashJournal" && Array.isArray(targetIds) && targetIds.length > 0) {
    try {
      for (const cashJournalEntryId of targetIds) {
        await reconcileBankTransaction(id, { type: "cashJournal", id: cashJournalEntryId });
      }
      return NextResponse.json({ ok: true });
    } catch (err) {
      if (err instanceof BankTransactionNotFoundError) {
        return NextResponse.json({ error: "Opération introuvable" }, { status: 404 });
      }
      throw err;
    }
  }

  if (!targetId) {
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
