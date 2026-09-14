import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Stockage local par défaut (volume Docker en production). STORAGE_DRIVER=s3
// pourra brancher un bucket compatible S3 plus tard sans changer les appelants
// (voir docs/ARCHITECTURE.md — sauvegardes phase 6).
const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? ".data/documents";

export interface StoredFile {
  url: string; // chemin relatif utilisé pour retrouver le fichier (stocké en base)
}

export async function saveDocumentFile(
  buffer: Buffer,
  originalName: string
): Promise<StoredFile> {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") {
    throw new Error(
      `Driver de stockage "${driver}" non implémenté (seul "local" est disponible en phase 3).`
    );
  }

  const ext = path.extname(originalName) || "";
  const filename = `${randomUUID()}${ext}`;
  // Chemin configurable via env : ignoré du traçage statique de build (voir
  // avertissement Turbopack "Dynamic filesystem access") puisqu'il ne dépend
  // d'aucun fichier du projet, seulement d'une variable d'environnement de runtime.
  const dir = path.join(/* turbopackIgnore: true */ process.cwd(), LOCAL_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ dir, filename), buffer);

  return { url: `local://${filename}` };
}

// Un document stocké en local (contrairement aux logos) n'est jamais servi
// statiquement : il transite par /api/documents/[filename] (voir cette
// route), protégée par la session comme le reste de l'app. Seul le nom de
// fichier généré par saveDocumentFile (jamais un chemin arbitraire) est
// accepté, pour éviter toute traversée de répertoire.
export async function readDocumentFile(filename: string): Promise<Buffer> {
  if (!/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename)) {
    throw new Error("Nom de fichier invalide.");
  }
  const dir = path.join(/* turbopackIgnore: true */ process.cwd(), LOCAL_DIR);
  return readFile(path.join(/* turbopackIgnore: true */ dir, filename));
}

// Logos d'activité : contrairement aux documents (privés, hors de /public),
// un logo est destiné à être affiché tel quel dans le navigateur et sur les
// PDF générés — on le range donc directement sous public/uploads/logos pour
// que Next.js le serve statiquement, sans passer par une route dédiée.
export async function saveLogoFile(buffer: Buffer, originalName: string): Promise<StoredFile> {
  const ext = path.extname(originalName) || "";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/logos/${filename}` };
}
