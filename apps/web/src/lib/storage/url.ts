// Séparé de storage/index.ts (qui importe `node:fs`) pour rester utilisable
// depuis des composants clients : convertit une URL stockée en base en lien
// cliquable dans le navigateur. Local et S3 passent tous les deux par la même
// route /api/documents/[filename] (protégée par la session) — elle lit selon
// le driver actif au moment de la requête, sans avoir besoin du préfixe.
export function toDocumentHref(url: string): string {
  if (url.startsWith("local://")) {
    return `/api/documents/${url.slice("local://".length)}`;
  }
  if (url.startsWith("s3://")) {
    return `/api/documents/${url.slice("s3://".length)}`;
  }
  return url; // déjà une URL absolue (logo public/)
}
