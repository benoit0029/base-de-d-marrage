import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { claimQuotesToSend } from "@/server/services/kerbooth/quotes";

// Appelé toutes les 2 minutes par n8n (workflow kerbooth-quote-send) :
// devis entreprise dont Benoît a cliqué « Envoyer au client ».
export async function POST(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json({ quotes: await claimQuotesToSend() });
}
