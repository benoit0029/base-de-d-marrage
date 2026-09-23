import { NextRequest, NextResponse } from "next/server";
import { deleteBankStatementImport } from "@/server/services/bankTransactions";
import { getCurrentUserId } from "@/lib/auth/currentUser";
import type { Activity } from "@prisma/client";

const VALID_ACTIVITIES: Activity[] = ["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"];

// Supprime en un clic toutes les lignes d'un même relevé importé (voir
// deleteBankStatementImport) — plutôt qu'une suppression ligne par ligne.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ fileHash: string }> }) {
  const { fileHash } = await params;
  const activity = req.nextUrl.searchParams.get("activity") as Activity | null;
  if (!activity || !VALID_ACTIVITIES.includes(activity)) {
    return NextResponse.json({ error: "Activité invalide" }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  const result = await deleteBankStatementImport(activity, fileHash, userId);
  return NextResponse.json(result);
}
