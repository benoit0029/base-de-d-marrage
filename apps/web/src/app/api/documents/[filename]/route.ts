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

  const lower = filename.toLowerCase();
  const contentType = lower.endsWith(".pdf")
    ? "application/pdf"
    : lower.endsWith(".png")
      ? "image/png"
      : lower.match(/\.(jpe?g)$/)
        ? "image/jpeg"
        : lower.endsWith(".zip")
          ? "application/zip"
          : "application/octet-stream";

  const headers: Record<string, string> = { "Content-Type": contentType };
  // Un dossier de clôture (ZIP) se télécharge toujours, jamais un affichage
  // inline dans le navigateur — contrairement aux justificatifs PDF/image.
  if (lower.endsWith(".zip")) {
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return new NextResponse(new Uint8Array(buffer), { headers });
}
