import { NextRequest, NextResponse } from "next/server";
import { renderInvoicePdfBuffer } from "@/server/services/invoicePdf";

// Le PDF est régénéré à chaque demande à partir des données en base (source
// de vérité) plutôt que stocké au moment de la création : pas de fichier à
// tenir synchronisé, et la « archive » de la facture est l'enregistrement
// Invoice/InvoiceLine lui-même.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const result = await renderInvoicePdfBuffer(id);
  if (!result) {
    return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
    },
  });
}
