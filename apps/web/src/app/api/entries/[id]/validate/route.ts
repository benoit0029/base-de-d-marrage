import { NextRequest, NextResponse } from "next/server";
import {
  EntryAlreadyValidatedError,
  EntryNotFoundError,
  validateEntry,
} from "@/server/services/entries";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    const entry = await validateEntry(id, userId);
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
