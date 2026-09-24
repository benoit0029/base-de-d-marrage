import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { computeUrssafReminder } from "@/server/services/kerbooth/alerts";

// Appelé par le workflow n8n de rappel URSSAF (planifié, le 1er du mois).
// Liste vide quand il n'y a rien à déclarer (régime MSA, ou mois sans
// échéance trimestrielle) : n8n n'envoie alors aucun e-mail.
export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  const reminder = await computeUrssafReminder();
  return NextResponse.json(reminder ? [reminder] : []);
}
