import { NextRequest, NextResponse } from "next/server";
import { createCreditNote, CreditNoteError, InvoiceNotFoundError, InvoicingError } from "@/server/services/invoices";
import { getCurrentUserId } from "@/lib/auth/currentUser";

// Annule une facture par une facture d'avoir (voir createCreditNote).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const issueDate = typeof body?.issueDate === "string" ? new Date(body.issueDate) : null;
  if (!issueDate || Number.isNaN(issueDate.getTime())) {
    return NextResponse.json({ error: "Date de l'avoir invalide" }, { status: 400 });
  }

  try {
    const creditNote = await createCreditNote(id, issueDate, await getCurrentUserId());
    return NextResponse.json({ creditNote: { id: creditNote.id, number: creditNote.number } });
  } catch (err) {
    if (err instanceof InvoiceNotFoundError) {
      return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
    }
    if (err instanceof CreditNoteError || err instanceof InvoicingError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
