"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  InvoiceNotFoundError,
  PaNotConnectedError,
  saveAndTestPaConnection,
  sendInvoiceToPa,
} from "@/server/services/pa";
import { AbbyApiError } from "@/lib/pa/abby";

export interface PaConnectionState {
  status: "idle" | "connected" | "error";
  message: string;
}

const schema = z.object({ apiKey: z.string().min(1, "Clé API requise") });

export async function submitPaConnection(
  _prev: PaConnectionState,
  formData: FormData
): Promise<PaConnectionState> {
  const parsed = schema.safeParse({ apiKey: formData.get("apiKey") });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Clé invalide" };
  }

  const connection = await saveAndTestPaConnection(parsed.data.apiKey);
  revalidatePath("/reglages");

  return connection.status === "CONNECTED"
    ? { status: "connected", message: "Connexion Abby réussie." }
    : {
        status: "error",
        message:
          "Échec de connexion à Abby. Vérifiez la clé API, et voir lib/pa/abby.ts si l'erreur persiste (endpoint à confirmer contre docs.abby.fr).",
      };
}

export interface SendToPaResult {
  status: "success" | "error";
  message: string;
}

export async function sendInvoiceToPaAction(invoiceId: string): Promise<SendToPaResult> {
  try {
    const invoice = await sendInvoiceToPa(invoiceId);
    revalidatePath("/maraichage/facturation");
    revalidatePath("/fruits-legumes/factures");
    revalidatePath("/photobooth/factures");
    return { status: "success", message: `Transmis à Abby (réf. ${invoice.paExternalId}).` };
  } catch (err) {
    if (err instanceof PaNotConnectedError) {
      return { status: "error", message: err.message };
    }
    if (err instanceof InvoiceNotFoundError) {
      return { status: "error", message: "Document introuvable." };
    }
    if (err instanceof AbbyApiError) {
      return { status: "error", message: `Erreur Abby : ${err.message}` };
    }
    return { status: "error", message: "Erreur inattendue lors de l'envoi." };
  }
}
