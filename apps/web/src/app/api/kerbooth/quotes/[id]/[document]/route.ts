import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { renderQuoteDocument } from "@/server/services/kerbooth/quoteDocuments";

// PDF d'un devis entreprise pour n8n : devis-pdf et contract-pdf (demande
// Yousign), invoice-pdf (mail après signature). Protégé par le jeton n8n :
// ces documents contiennent les coordonnées du client.
const KINDS = { "devis-pdf": "devis", "contract-pdf": "contract", "invoice-pdf": "invoice" } as const;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; document: string }> }
) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id, document } = await params;
  const kind = KINDS[document as keyof typeof KINDS];
  if (!kind) return NextResponse.json({ error: "Document inconnu" }, { status: 404 });

  const result = await renderQuoteDocument(id, kind);
  if (!result) return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
    },
  });
}
