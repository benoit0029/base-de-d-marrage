import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { runQuoteDailyJobs } from "@/server/services/kerbooth/quotes";

// Appelé chaque matin par n8n (workflow kerbooth-quote-daily) : expire les
// devis non signés à J+15 et renvoie les relances J+3 / J+10 à faire.
export async function POST(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return NextResponse.json(await runQuoteDailyJobs());
}
