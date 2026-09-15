import { NextRequest, NextResponse } from "next/server";
import {
  EntryNotFoundError,
  EntryNotValidatedError,
  softDeleteEntry,
} from "@/server/services/entries";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    await softDeleteEntry(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof EntryNotFoundError) {
      return NextResponse.json({ error: "Écriture introuvable" }, { status: 404 });
    }
    if (err instanceof EntryNotValidatedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
