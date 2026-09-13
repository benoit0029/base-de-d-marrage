// Cookies de session signés (HMAC-SHA256 via Web Crypto — compatible Node ET
// Edge runtime, car ce module est importé depuis middleware.ts). Pas de
// table "sessions" en base : le cookie signé fait foi, à la manière d'un JWT
// minimal fait main pour éviter une dépendance externe pour si peu.

export const SESSION_COOKIE = "session";
export const PENDING_2FA_COOKIE = "pending_2fa";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours
const PENDING_2FA_MAX_AGE_SECONDS = 60 * 5; // 5 minutes pour saisir le code

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET n'est pas configurée (voir .env.example).");
  }
  return secret;
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function sign(payload: object, secret: string): Promise<string> {
  const json = JSON.stringify(payload);
  const payloadB64 = base64urlEncode(new TextEncoder().encode(json));
  const key = await getHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  const sigB64 = base64urlEncode(new Uint8Array(signature));
  return `${payloadB64}.${sigB64}`;
}

async function verify<T>(token: string, secret: string): Promise<T | null> {
  const [payloadB64, sigB64] = token.split(".");
  if (!payloadB64 || !sigB64) return null;

  const key = await getHmacKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    base64urlDecode(sigB64),
    new TextEncoder().encode(payloadB64)
  );
  if (!valid) return null;

  try {
    const json = new TextDecoder().decode(base64urlDecode(payloadB64));
    const payload = JSON.parse(json) as T & { exp: number };
    if (payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export interface SessionPayload {
  userId: string;
  exp: number;
}

export async function createSessionToken(userId: string): Promise<{ token: string; maxAge: number }> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS;
  const token = await sign({ userId, exp }, getSecret());
  return { token, maxAge: SESSION_MAX_AGE_SECONDS };
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  return verify<SessionPayload>(token, getSecret());
}

export interface Pending2faPayload {
  userId: string;
  exp: number;
}

export async function createPending2faToken(userId: string): Promise<{ token: string; maxAge: number }> {
  const exp = Math.floor(Date.now() / 1000) + PENDING_2FA_MAX_AGE_SECONDS;
  const token = await sign({ userId, exp }, getSecret());
  return { token, maxAge: PENDING_2FA_MAX_AGE_SECONDS };
}

export async function verifyPending2faToken(token: string): Promise<Pending2faPayload | null> {
  return verify<Pending2faPayload>(token, getSecret());
}
