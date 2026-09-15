import { NextRequest, NextResponse } from "next/server";
import {
  deleteSimpleImport,
  SimpleImportLockedError,
  SimpleImportNotFoundError,
} from "@/server/services/simpleImports";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    await deleteSimpleImport(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof SimpleImportNotFoundError) {
      return NextResponse.json({ error: "Document introuvable" }, { status: 404 });
    }
    if (err instanceof SimpleImportLockedError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }
}
