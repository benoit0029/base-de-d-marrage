import { NextRequest, NextResponse } from "next/server";
import { renderCashJournalSheetsPdf } from "@/lib/pdf/render";
import type { Activity } from "@prisma/client";

const activityLabels: Partial<Record<Activity, string>> = {
  BA_MARAICHAGE: "Maraîchage",
  BIC_FRUITS_LEGUMES: "Revente Fruits/Légumes",
};

const DEFAULT_COUNT = 30; // un mois de fiches, à réimprimer à volonté

// Fiches vierges à imprimer pour noter la recette à la main le jour de
// vente, avant de les photographier pour lecture automatique (voir
// CashJournalSheetDocument). Kerbooth n'a pas de journal de caisse (100%
// facturé), donc pas de fiche pour cette activité.
export async function GET(req: NextRequest, { params }: { params: Promise<{ activity: string }> }) {
  const { activity } = await params;
  const activityLabel = activityLabels[activity as Activity];
  if (!activityLabel) {
    return NextResponse.json({ error: "Activité invalide" }, { status: 400 });
  }

  const countParam = Number(req.nextUrl.searchParams.get("count"));
  const count = Number.isInteger(countParam) && countParam > 0 ? Math.min(countParam, 200) : DEFAULT_COUNT;

  const buffer = await renderCashJournalSheetsPdf({
    activityLabel,
    hasCheck: activity === "BA_MARAICHAGE",
    count,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="fiches-recette-${activity}.pdf"`,
    },
  });
}
