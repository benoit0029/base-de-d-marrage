import { NextRequest, NextResponse } from "next/server";
import {
  EntryAlreadyValidatedError,
  EntryNotFoundError,
  validateEntry,
} from "@/server/services/entries";

// L'identifiant utilisateur viendra de la session une fois l'authentification
// branchée (phase 6). En v1 (compte unique, pas encore d'auth), on journalise
// sans utilisateur identifié plutôt que d'inventer une valeur.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const entry = await validateEntry(id, null);
    return NextResponse.json({ entry });
  } catch (err) {
    if (err instanceof EntryNotFoundError) {
      return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });
    }
    if (err instanceof EntryAlreadyValidatedError) {
      return NextResponse.json({ error: "Écriture déjà validée" }, { status: 409 });
    }
    throw err;
  }
}
