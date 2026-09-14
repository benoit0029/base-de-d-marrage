import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { listReconciliationCandidates } from "@/server/services/bankTransactions";
import { toEntryView, toInvoiceView, toCashJournalView } from "@/lib/serialize";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = await prisma.bankTransaction.findUnique({ where: { id } });
  if (!transaction) {
    return NextResponse.json({ error: "Opération introuvable" }, { status: 404 });
  }

  const { entries, invoices, cashJournalEntries } = await listReconciliationCandidates(
    transaction.activity,
    transaction.direction,
    transaction.date
  );

  return NextResponse.json({
    entries: entries.map((e) => toEntryView({ ...e, sourceDocument: null })),
    invoices: invoices.map(toInvoiceView),
    cashJournalEntries: cashJournalEntries.map(toCashJournalView),
  });
}
