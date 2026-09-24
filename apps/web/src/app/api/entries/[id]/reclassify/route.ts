import { NextRequest, NextResponse } from "next/server";
import { EntryNotFoundError, EntryNotReclassifiableError, reclassifyEntry } from "@/server/services/entries";
import { FiscalYearClosedError } from "@/server/services/fiscalYearClosure";
import { getCurrentUserId } from "@/lib/auth/currentUser";

// Corrige le classement achat courant ↔ immobilisation d'une dépense.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const type = body?.type;
  if (type !== "ACHAT" && type !== "IMMOBILISATION") {
    return NextResponse.json({ error: "Classement invalide" }, { status: 400 });
  }

  try {
    const entry = await reclassifyEntry(id, await getCurrentUserId(), type);
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof EntryNotFoundError) {
      return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });
    }
    if (err instanceof EntryNotReclassifiableError) {
      return NextResponse.json({ error: "Seule une dépense peut être reclassée" }, { status: 409 });
    }
    if (err instanceof FiscalYearClosedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
