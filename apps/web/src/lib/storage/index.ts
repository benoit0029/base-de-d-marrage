import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";

// Stockage local (volume Docker) par défaut, ou driver S3 (Scaleway Object
// Storage) si STORAGE_DRIVER=s3 — voir docs/ARCHITECTURE.md, migration du
// stockage. Les deux drivers exposent la même API : rien à changer côté
// appelants (services, routes) quel que soit le driver actif.
const LOCAL_DIR = process.env.STORAGE_LOCAL_DIR ?? ".data/documents";

export interface StoredFile {
  url: string; // chemin relatif utilisé pour retrouver le fichier (stocké en base)
}

let cachedS3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (cachedS3Client) return cachedS3Client;
  cachedS3Client = new S3Client({
    region: process.env.STORAGE_S3_REGION ?? "fr-par",
    endpoint: process.env.STORAGE_S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.STORAGE_S3_ACCESS_KEY ?? "",
      secretAccessKey: process.env.STORAGE_S3_SECRET_KEY ?? "",
    },
  });
  return cachedS3Client;
}

function getS3Bucket(): string {
  const bucket = process.env.STORAGE_S3_BUCKET;
  if (!bucket) throw new Error("STORAGE_S3_BUCKET manquant pour le driver de stockage s3.");
  return bucket;
}

export async function saveDocumentFile(
  buffer: Buffer,
  originalName: string
): Promise<StoredFile> {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  const ext = path.extname(originalName) || "";
  const filename = `${randomUUID()}${ext}`;

  if (driver === "s3") {
    await getS3Client().send(
      new PutObjectCommand({ Bucket: getS3Bucket(), Key: filename, Body: buffer })
    );
    return { url: `s3://${filename}` };
  }

  if (driver !== "local") {
    throw new Error(`Driver de stockage "${driver}" non implémenté.`);
  }

  // Chemin configurable via env : ignoré du traçage statique de build (voir
  // avertissement Turbopack "Dynamic filesystem access") puisqu'il ne dépend
  // d'aucun fichier du projet, seulement d'une variable d'environnement de runtime.
  const dir = path.join(/* turbopackIgnore: true */ process.cwd(), LOCAL_DIR);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(/* turbopackIgnore: true */ dir, filename), buffer);

  return { url: `local://${filename}` };
}

// Un document stocké (local ou S3) n'est jamais servi statiquement : il
// transite par /api/documents/[filename] (voir cette route), protégée par la
// session comme le reste de l'app. Seul le nom de fichier généré par
// saveDocumentFile (jamais un chemin arbitraire) est accepté, pour éviter
// toute traversée de répertoire côté local et toute clé S3 arbitraire côté S3.
export async function readDocumentFile(filename: string): Promise<Buffer> {
  if (!/^[a-zA-Z0-9-]+\.[a-zA-Z0-9]+$/.test(filename)) {
    throw new Error("Nom de fichier invalide.");
  }

  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver === "s3") {
    const result = await getS3Client().send(
      new GetObjectCommand({ Bucket: getS3Bucket(), Key: filename })
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new Error("Fichier introuvable sur le stockage S3.");
    return Buffer.from(bytes);
  }

  const dir = path.join(/* turbopackIgnore: true */ process.cwd(), LOCAL_DIR);
  return readFile(path.join(/* turbopackIgnore: true */ dir, filename));
}

// Logos d'activité : contrairement aux documents (privés, conservation
// légale), un logo est destiné à être affiché tel quel dans le navigateur et
// sur les PDF générés — on le range donc directement sous public/uploads/logos
// pour que Next.js le serve statiquement, sans passer par une route dédiée ni
// par le driver S3 (pas de valeur légale à conserver, juste de l'image de marque).
export async function saveLogoFile(buffer: Buffer, originalName: string): Promise<StoredFile> {
  const ext = path.extname(originalName) || "";
  const filename = `${randomUUID()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", "logos");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), buffer);

  return { url: `/uploads/logos/${filename}` };
}
