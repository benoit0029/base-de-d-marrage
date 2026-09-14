// Séparé de storage/index.ts (qui importe `node:fs`) pour rester utilisable
// depuis des composants clients : convertit une URL stockée en base en lien
// cliquable dans le navigateur.
export function toDocumentHref(url: string): string {
  if (url.startsWith("local://")) {
    return `/api/documents/${url.slice("local://".length)}`;
  }
  return url; // déjà une URL absolue (driver S3 futur, ou logo public/)
}
