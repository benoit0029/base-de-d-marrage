import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedN8nRequest } from "@/lib/auth/n8nToken";
import { generateClosingReportPdf } from "@/server/services/reports";

// Appelé par le workflow n8n d'envoi du PDF de clôture (planifié, ex. en fin
// d'exercice). Régénéré à la demande depuis les écritures validées.
export async function GET(req: NextRequest) {
  if (!isAuthorizedN8nRequest(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? Number(yearParam) : new Date().getFullYear();
  const pdf = await generateClosingReportPdf(Number.isFinite(year) ? year : undefined);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cloture-${year}.pdf"`,
    },
  });
}
