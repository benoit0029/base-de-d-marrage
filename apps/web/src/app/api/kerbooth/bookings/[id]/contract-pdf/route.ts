import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { renderKerboothContractPdfBuffer } from "@/server/services/kerboothContractPdf";

// Appelé par n8n (workflow kerbooth-booking-request) pour récupérer le PDF
// du contrat à attacher à la demande de signature Yousign — protégé comme
// le reste du pipeline n8n (INGEST_API_TOKEN), contrairement au PDF de
// facture qui reste public : ce document contient les coordonnées du
// client avant même que le contrat ne soit signé.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;

  const result = await renderKerboothContractPdfBuffer(id);
  if (!result) {
    return NextResponse.json({ error: "Réservation introuvable" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${result.filename}"`,
    },
  });
}
