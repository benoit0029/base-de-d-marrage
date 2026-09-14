import { NextRequest, NextResponse } from "next/server";
import { readDocumentFile } from "@/lib/storage";

// Protégée par la session (voir proxy.ts — non listée dans PUBLIC_API_PREFIXES).
// Sert les documents stockés en local (justificatifs de caisse, imports
// Tesa+/cotisations, relevés bancaires...), jamais exposés statiquement.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;

  let buffer: Buffer;
  try {
    buffer = await readDocumentFile(filename);
  } catch {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  const contentType = filename.toLowerCase().endsWith(".pdf")
    ? "application/pdf"
    : filename.toLowerCase().endsWith(".png")
      ? "image/png"
      : filename.toLowerCase().match(/\.(jpe?g)$/)
        ? "image/jpeg"
        : "application/octet-stream";

  return new NextResponse(new Uint8Array(buffer), {
    headers: { "Content-Type": contentType },
  });
}
