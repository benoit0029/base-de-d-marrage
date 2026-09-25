import { NextResponse } from "next/server";
import {
  KerboothQuoteInputError,
  KerboothQuoteNotFoundError,
  KerboothQuoteStateError,
} from "@/server/services/kerbooth/quotes";
import { InvoicingError } from "@/server/services/invoices";

// Erreurs métier → réponses lisibles par n8n (qui peut alerter Benoît avec
// le message), jamais une erreur 500 muette.
export function quoteErrorResponse(err: unknown) {
  if (err instanceof KerboothQuoteNotFoundError) {
    return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  }
  if (err instanceof KerboothQuoteStateError || err instanceof InvoicingError) {
    return NextResponse.json({ error: err.message }, { status: 409 });
  }
  if (err instanceof KerboothQuoteInputError) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
  throw err;
}
