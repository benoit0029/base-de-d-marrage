"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  confirmTotpEnrollment,
  countUsers,
  createFirstUser,
  EmailAlreadyUsedError,
  InvalidTotpCodeError,
  startTotpEnrollment,
  verifyLogin,
  verifyUserTotpCode,
} from "@/server/services/auth";
import {
  createPending2faToken,
  createSessionToken,
  PENDING_2FA_COOKIE,
  SESSION_COOKIE,
  verifyPending2faToken,
} from "@/lib/auth/session";

export interface AuthFormState {
  status: "idle" | "error" | "success";
  message: string;
  qrCodeDataUrl?: string;
  userId?: string;
}

const setupSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "8 caractères minimum"),
});

/** Étape 1 du /setup : crée le compte unique et démarre l'enrôlement 2FA. */
export async function submitSetupAccount(
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  if ((await countUsers()) > 0) {
    return { status: "error", message: "Un compte existe déjà. Utilisez la page de connexion." };
  }

  const parsed = setupSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  try {
    const user = await createFirstUser(parsed.data.email, parsed.data.password);
    const qrCodeDataUrl = await startTotpEnrollment(user.id, user.email);
    return { status: "success", message: "", qrCodeDataUrl, userId: user.id };
  } catch (err) {
    if (err instanceof EmailAlreadyUsedError) {
      return { status: "error", message: "Email déjà utilisé." };
    }
    return { status: "error", message: "Erreur lors de la création du compte." };
  }
}

/** Étape 2 du /setup : confirme le code TOTP et ouvre la session. */
export async function submitSetupTotpConfirm(
  userId: string,
  _prev: AuthFormState,
  formData: FormData
): Promise<AuthFormState> {
  const code = String(formData.get("code") ?? "");

  try {
    await confirmTotpEnrollment(userId, code);
  } catch (err) {
    if (err instanceof InvalidTotpCodeError) {
      return { status: "error", message: "Code incorrect. Réessayez." };
    }
    throw err;
  }

  const { token, maxAge } = await createSessionToken(userId);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });

  redirect("/");
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Étape 1 du /login : email + mot de passe, puis redirection vers /2fa. */
export async function submitLogin(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Email ou mot de passe invalide." };
  }

  const user = await verifyLogin(parsed.data.email, parsed.data.password);
  if (!user) {
    return { status: "error", message: "Email ou mot de passe incorrect." };
  }

  const { token, maxAge } = await createPending2faToken(user.id);
  const jar = await cookies();
  jar.set(PENDING_2FA_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });

  redirect("/2fa");
}

/** Étape 2 du /login : code TOTP, ouvre la session si valide. */
export async function submitLoginTotp(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const jar = await cookies();
  const pendingToken = jar.get(PENDING_2FA_COOKIE)?.value;
  const pending = pendingToken ? await verifyPending2faToken(pendingToken) : null;

  if (!pending) {
    return { status: "error", message: "Session expirée, reconnectez-vous." };
  }

  const code = String(formData.get("code") ?? "");
  const valid = await verifyUserTotpCode(pending.userId, code);
  if (!valid) {
    return { status: "error", message: "Code incorrect." };
  }

  const { token, maxAge } = await createSessionToken(pending.userId);
  jar.set(SESSION_COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
  jar.delete(PENDING_2FA_COOKIE);

  redirect("/");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
