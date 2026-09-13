import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateTotpQrCode, generateTotpSecret, verifyTotpCode } from "@/lib/auth/totp";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

export async function countUsers(): Promise<number> {
  return prisma.user.count();
}

export class EmailAlreadyUsedError extends Error {}

/**
 * V1 est mono-utilisateur : n'autorise la création d'un compte que si aucun
 * n'existe encore (voir /setup). Au-delà, il faudra une vraie gestion
 * multi-comptes (hors scope v1).
 */
export async function createFirstUser(email: string, password: string) {
  const existing = await countUsers();
  if (existing > 0) {
    throw new Error("Un compte existe déjà.");
  }

  const tenantId = await getDefaultTenantId();
  return prisma.user.create({
    data: { tenantId, email, passwordHash: hashPassword(password) },
  });
}

export async function verifyLogin(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  return verifyPassword(password, user.passwordHash) ? user : null;
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({ where: { id } });
}

/**
 * V1 est mono-utilisateur : renvoie ce compte unique s'il existe, pour que
 * /setup sache s'il doit proposer la création du compte ou reprendre un
 * enrôlement 2FA resté inachevé (voir resumeTotpEnrollment).
 */
export async function getSingleUser() {
  return prisma.user.findFirst();
}

/**
 * Étape 1 de l'activation 2FA (obligatoire) : génère un secret, le chiffre en
 * base, renvoie le QR code à scanner. totpEnabled reste false tant que
 * confirmTotpEnrollment n'a pas validé un code.
 */
export async function startTotpEnrollment(userId: string, email: string) {
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: encryptSecret(secret) },
  });
  return generateTotpQrCode(email, secret);
}

/**
 * Reprend un enrôlement 2FA interrompu (ex. navigateur fermé entre la
 * création du compte et la confirmation du code) : régénère le QR code à
 * partir du secret déjà stocké plutôt que d'en générer un nouveau, pour que
 * l'entrée déjà scannée dans l'appli d'authentification reste valide.
 */
export async function resumeTotpEnrollment(userId: string, email: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) {
    throw new Error("Aucun enrôlement 2FA en cours pour ce compte.");
  }
  return generateTotpQrCode(email, decryptSecret(user.totpSecret));
}

export class InvalidTotpCodeError extends Error {}

export async function confirmTotpEnrollment(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret) throw new InvalidTotpCodeError("Aucun secret 2FA en attente.");

  const secret = decryptSecret(user.totpSecret);
  if (!verifyTotpCode(secret, code)) {
    throw new InvalidTotpCodeError("Code invalide.");
  }

  await prisma.user.update({ where: { id: userId }, data: { totpEnabled: true } });
}

export async function verifyUserTotpCode(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.totpSecret || !user.totpEnabled) return false;
  return verifyTotpCode(decryptSecret(user.totpSecret), code);
}
