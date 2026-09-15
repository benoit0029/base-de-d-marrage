import { NextRequest, NextResponse } from "next/server";
import { unreconcileBankTransaction } from "@/server/services/bankTransactions";
import { FiscalYearClosedError } from "@/server/services/fiscalYearClosure";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await unreconcileBankTransaction(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof FiscalYearClosedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
