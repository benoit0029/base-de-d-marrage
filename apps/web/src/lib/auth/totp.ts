import * as OTPAuth from "otpauth";
import QRCode from "qrcode";

const ISSUER = "Compta ferme & activités";

export function generateTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

export async function generateTotpQrCode(email: string, secretBase32: string): Promise<string> {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: email,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  return QRCode.toDataURL(totp.toString());
}

/**
 * Vérifie un code à 6 chiffres avec une tolérance d'une période avant/après
 * (dérive d'horloge courante sur mobile) — voir la doc otpauth pour `window`.
 */
export function verifyTotpCode(secretBase32: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });

  const delta = totp.validate({ token: code.trim(), window: 1 });
  return delta !== null;
}
