import { NextRequest, NextResponse } from "next/server";
import { changeEntryActivity, EntryActivityChangeError, EntryNotFoundError } from "@/server/services/entries";
import { FiscalYearClosedError } from "@/server/services/fiscalYearClosure";
import { getCurrentUserId } from "@/lib/auth/currentUser";

const ACTIVITIES = ["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"] as const;

// Déplace une dépense vers une autre activité (voir changeEntryActivity).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const activity = ACTIVITIES.find((a) => a === body?.activity);
  if (!activity) {
    return NextResponse.json({ error: "Activité invalide" }, { status: 400 });
  }

  try {
    const entry = await changeEntryActivity(id, await getCurrentUserId(), activity);
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof EntryNotFoundError) {
      return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });
    }
    if (err instanceof EntryActivityChangeError || err instanceof FiscalYearClosedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
