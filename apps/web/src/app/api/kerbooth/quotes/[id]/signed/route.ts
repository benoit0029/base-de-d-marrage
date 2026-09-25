import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { markQuoteSigned } from "@/server/services/kerbooth/quotes";
import { quoteErrorResponse } from "../../_shared";

// Appelé par n8n depuis le webhook Yousign « signature_request.done » quand
// external_id = "devis:<id>" : facture émise, réservations confirmées.
// alreadyProcessed = true si le webhook est rejoué (pas de second mail).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const signedAt = typeof body.signedAt === "string" ? new Date(body.signedAt) : new Date();
  try {
    const result = await markQuoteSigned(id, {
      yousignRequestId: typeof body.yousignRequestId === "string" ? body.yousignRequestId : undefined,
      signedAt: Number.isNaN(signedAt.getTime()) ? new Date() : signedAt,
    });
    return NextResponse.json(result);
  } catch (err) {
    return quoteErrorResponse(err);
  }
}
