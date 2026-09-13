"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveAndTestMailboxConnection } from "@/server/services/mailboxes";
import type { Activity } from "@prisma/client";

export interface MailboxFormState {
  status: "idle" | "connected" | "error";
  message: string;
}

const schema = z.object({
  imapHost: z.string().min(1, "Hôte IMAP requis"),
  imapPort: z.coerce.number().int().positive(),
  imapUser: z.string().min(1, "Identifiant requis"),
  imapPassword: z.string().optional(),
});

export async function submitMailboxConnection(
  activity: Activity,
  _prev: MailboxFormState,
  formData: FormData
): Promise<MailboxFormState> {
  const parsed = schema.safeParse({
    imapHost: formData.get("imapHost"),
    imapPort: formData.get("imapPort") || 993,
    imapUser: formData.get("imapUser"),
    imapPassword: formData.get("imapPassword") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  try {
    const result = await saveAndTestMailboxConnection(activity, parsed.data);
    revalidatePath("/reglages");
    return result.status === "CONNECTED"
      ? { status: "connected", message: "Connexion réussie." }
      : { status: "error", message: result.lastError ?? "Échec de la connexion." };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inattendue.";
    return { status: "error", message };
  }
}
