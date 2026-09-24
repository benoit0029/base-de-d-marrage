import { NextRequest, NextResponse } from "next/server";
import { computeEReporting, eReportingCsv } from "@/lib/ereporting";

// Export tableur de l'onglet E-reporting (Maraîchage), une ligne par jour de
// vente — protégé par la session comme le reste de l'appli (voir proxy.ts).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ year: string }> }) {
  const { year: yearParam } = await params;
  const year = Number(yearParam);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Année invalide" }, { status: 400 });
  }

  const { months } = await computeEReporting(year);
  // BOM UTF-8 : accents corrects à l'ouverture dans Excel/LibreOffice.
  return new NextResponse("﻿" + eReportingCsv(months), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="e-reporting-maraichage-${year}.csv"`,
    },
  });
}
