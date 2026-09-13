import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { checkThresholdAlerts } from "@/server/services/alerts";

// Appelé par le workflow n8n d'alerte de seuils (planifié).
export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const alerts = await checkThresholdAlerts();
  return NextResponse.json({ count: alerts.length, alerts });
}
