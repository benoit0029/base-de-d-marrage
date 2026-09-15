import { NextRequest, NextResponse } from "next/server";
import {
  SimpleImportNotFoundError,
  SimpleImportNotValidatedError,
  softDeleteSimpleImport,
} from "@/server/services/simpleImports";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    await softDeleteSimpleImport(id, userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SimpleImportNotFoundError) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }
    if (err instanceof SimpleImportNotValidatedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
