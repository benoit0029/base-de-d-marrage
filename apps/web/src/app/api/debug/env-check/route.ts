import { NextRequest, NextResponse } from "next/server";

// ⚠️ TEMPORAIRE — diagnostic du mismatch INGEST_API_TOKEN n8n/app
// (21/09/2026). À SUPPRIMER une fois le problème résolu. N'expose jamais
// le secret en entier, seulement sa longueur et ses extrémités.
function preview(s: string | null | undefined, keep = 4): string | null {
  if (!s) return null;
  if (s.length <= keep * 2) return "*".repeat(s.length);
  return `${s.slice(0, keep)}…${s.slice(-keep)} (longueur ${s.length})`;
}

export async function GET(req: NextRequest) {
  const token = process.env.INGEST_API_TOKEN;
  const header = req.headers.get("authorization");
  const expected = token ? `Bearer ${token}` : null;

  return NextResponse.json({
    tokenSet: !!token,
    tokenPreview: preview(token),
    headerReceived: !!header,
    headerPreview: preview(header, 10),
    expectedPreview: preview(expected, 10),
    exactMatch: header === expected,
  });
}
