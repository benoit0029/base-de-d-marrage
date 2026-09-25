import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { markQuoteSent } from "@/server/services/kerbooth/quotes";
import { quoteErrorResponse } from "../../_shared";

// n8n confirme que la demande Yousign (devis + contrat) est partie.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.yousignRequestId !== "string" || !body.yousignRequestId) {
    return NextResponse.json({ error: "yousignRequestId obligatoire" }, { status: 400 });
  }
  try {
    const quote = await markQuoteSent(id, {
      yousignRequestId: body.yousignRequestId,
      yousignSignerId: typeof body.yousignSignerId === "string" ? body.yousignSignerId : undefined,
      sentAt: new Date(),
    });
    return NextResponse.json({ status: quote.status });
  } catch (err) {
    return quoteErrorResponse(err);
  }
}
