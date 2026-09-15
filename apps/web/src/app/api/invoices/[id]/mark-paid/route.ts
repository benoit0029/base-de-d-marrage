import { NextRequest, NextResponse } from "next/server";
import {
  InvoiceAlreadyPaidError,
  InvoiceNotFoundError,
  markInvoicePaid,
} from "@/server/services/invoices";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const paidAtStr = body?.paidAt;
  const paidAt = typeof paidAtStr === "string" ? new Date(paidAtStr) : null;

  if (!paidAt || Number.isNaN(paidAt.getTime())) {
    return NextResponse.json({ error: "Date d'encaissement invalide" }, { status: 400 });
  }

  const userId = await getCurrentUserId();

  try {
    const invoice = await markInvoicePaid(id, paidAt, userId);
    return NextResponse.json({ invoice });
  } catch (err) {
    if (err instanceof InvoiceNotFoundError) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }
    if (err instanceof InvoiceAlreadyPaidError) {
      return NextResponse.json({ error: "Déjà marquée encaissée" }, { status: 409 });
    }
    throw err;
  }
}
