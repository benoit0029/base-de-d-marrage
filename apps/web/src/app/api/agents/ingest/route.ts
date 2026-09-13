import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/server/services/pipeline";

// Endpoint appelé par n8n (veille email, phase 5) et par les formulaires de
// capture de l'application (photo terrain, upload manuel). Protégé par un
// jeton partagé tant que l'authentification complète (phase 6) n'existe pas :
// toute requête externe doit envoyer `Authorization: Bearer <INGEST_API_TOKEN>`.
function isAuthorized(req: NextRequest): boolean {
  const token = process.env.INGEST_API_TOKEN;
  if (!token) return false; // pas de secret configuré = endpoint fermé par défaut
  const header = req.headers.get("authorization");
  return header === `Bearer ${token}`;
}

const VALID_SOURCES = new Set(["EMAIL", "PHOTO", "UPLOAD"]);

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file");
  const source = form.get("source");
  const emailFrom = form.get("emailFrom");
  const emailSubject = form.get("emailSubject");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Champ 'file' manquant ou invalide" }, { status: 400 });
  }
  if (typeof source !== "string" || !VALID_SOURCES.has(source)) {
    return NextResponse.json(
      { error: "Champ 'source' invalide (EMAIL, PHOTO ou UPLOAD attendu)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await ingestDocument({
    source: source as "EMAIL" | "PHOTO" | "UPLOAD",
    fileBuffer: buffer,
    mimeType: file.type || "application/octet-stream",
    originalName: file.name,
    emailFrom: typeof emailFrom === "string" ? emailFrom : undefined,
    emailSubject: typeof emailSubject === "string" ? emailSubject : undefined,
  });

  return NextResponse.json({
    documentId: result.document.id,
    documentStatus: result.document.status,
    entryId: result.entry?.id ?? null,
    ignoredAsNoise: result.ignoredAsNoise,
    failedStep: result.failedStep,
    errorMessage: result.errorMessage,
  });
}
