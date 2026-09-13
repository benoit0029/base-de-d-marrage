import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

// Chiffrement symétrique des champs sensibles stockés en base (mots de passe
// IMAP pour l'instant, clé API PA plus tard). AES-256-GCM avec une clé dérivée
// de APP_ENCRYPTION_KEY : à générer une fois avec `openssl rand -base64 32`
// et ne jamais changer ensuite (les données déjà chiffrées deviendraient
// illisibles), voir .env.example.

function getKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      "APP_ENCRYPTION_KEY n'est pas configurée. Voir .env.example (openssl rand -base64 32)."
    );
  }
  // scrypt dérive une clé de 32 octets quelle que soit la longueur du secret fourni.
  return scryptSync(secret, "compta-ferme-encryption", 32);
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [ivB64, authTagB64, dataB64] = payload.split(".");
  if (!ivB64 || !authTagB64 || !dataB64) {
    throw new Error("Format de secret chiffré invalide.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
