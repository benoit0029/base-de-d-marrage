import { NextRequest, NextResponse } from "next/server";
import { unreconcileBankTransaction } from "@/server/services/bankTransactions";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await unreconcileBankTransaction(id);
  return NextResponse.json({ ok: true });
}
