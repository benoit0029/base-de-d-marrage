import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { checkFailedDocuments } from "@/server/services/alerts";

// Appelé par le workflow n8n de notification d'anomalie (planifié).
export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const documents = await checkFailedDocuments();
  return NextResponse.json({ count: documents.length, documents });
}
