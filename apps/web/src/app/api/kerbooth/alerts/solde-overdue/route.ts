import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { checkSoldeOverdue } from "@/server/services/kerbooth/alerts";

// Appelé par le workflow n8n d'alerte "échec de prélèvement du solde"
// (planifié, déclencheur 9bis).
export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const overdue = await checkSoldeOverdue();
  return NextResponse.json({ count: overdue.length, overdue });
}
