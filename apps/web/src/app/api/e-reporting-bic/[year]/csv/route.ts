import { NextRequest, NextResponse } from "next/server";
import { bicEReportingCsv, computeBicEReporting } from "@/lib/ereporting/bic";

// Export tableur de l'e-reporting micro-BIC (une ligne par jour) — protégé
// par la session comme le reste de l'appli (voir proxy.ts).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ year: string }> }) {
  const year = Number((await params).year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }
  const { months } = await computeBicEReporting(year);
  return new NextResponse("﻿" + bicEReportingCsv(months), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="e-reporting-micro-bic-${year}.csv"`,
    },
  });
}
