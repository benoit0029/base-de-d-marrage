import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { computeUrssafReminder } from "@/server/services/kerbooth/alerts";

// Appelé par le workflow n8n de rappel URSSAF Kerbooth (planifié, mensuel).
export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const reminder = await computeUrssafReminder();
  return NextResponse.json(reminder);
}
