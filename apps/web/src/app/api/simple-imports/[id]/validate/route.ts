import { NextRequest, NextResponse } from "next/server";
import {
  SimpleImportAlreadyValidatedError,
  SimpleImportNotFoundError,
  validateSimpleImport,
} from "@/server/services/simpleImports";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();

  try {
    const item = await validateSimpleImport(id, userId);
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof SimpleImportNotFoundError) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }
    if (err instanceof SimpleImportAlreadyValidatedError) {
      return NextResponse.json({ error: "Document déjà validé" }, { status: 409 });
    }
    throw err;
  }
}
