"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInvoice, InvoicingError } from "@/server/services/invoices";
import { transcribeAndStructureInvoice } from "@/server/services/dictation";
import type { Activity } from "@prisma/client";

const activityBasePath: Record<Activity, string> = {
  BA_MARAICHAGE: "/maraichage",
  BIC_FRUITS_LEGUMES: "/fruits-legumes",
  BIC_PHOTOBOOTH: "/photobooth",
};

const lineSchema = z.object({
  description: z.string().min(1, "Description requise"),
  quantity: z.number().positive("Quantité invalide"),
  unitPrice: z.number().nonnegative("Prix unitaire invalide"),
  vatRate: z.number().min(0).max(100),
  unit: z.string().trim().max(20).optional(),
});

const createInvoiceSchema = z.object({
  activity: z.enum(["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"]),
  type: z.enum(["DEVIS", "FACTURE"]),
  clientName: z.string().min(1, "Nom du client requis"),
  clientAddress: z.string().optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Au moins une ligne est requise"),
});

export type CreateInvoiceActionInput = z.infer<typeof createInvoiceSchema>;

export interface CreateInvoiceActionResult {
  status: "success" | "error";
  message: string;
  invoiceId?: string;
  invoiceNumber?: string;
}

export async function createInvoiceAction(
  input: CreateInvoiceActionInput
): Promise<CreateInvoiceActionResult> {
  const parsed = createInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  try {
    const invoice = await createInvoice({
      activity: parsed.data.activity,
      type: parsed.data.type,
      clientName: parsed.data.clientName,
      clientAddress: parsed.data.clientAddress,
      issueDate: new Date(parsed.data.issueDate),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      lines: parsed.data.lines,
    });

    revalidatePath(`${activityBasePath[parsed.data.activity]}/facturation`);
    revalidatePath(`${activityBasePath[parsed.data.activity]}/factures`);

    return {
      status: "success",
      message: `${parsed.data.type === "DEVIS" ? "Devis" : "Facture"} ${invoice.number} créé(e).`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    };
  } catch (err) {
    const message = err instanceof InvoicingError ? err.message : "Erreur lors de la création.";
    return { status: "error", message };
  }
}

export interface DictationResult {
  status: "success" | "error";
  message: string;
  clientName?: string;
  lines?: Array<{ description: string; quantity: number; unitPrice: number }>;
}

// Transcrit un enregistrement vocal (Voxtral) puis le structure en lignes de
// devis/facture. Le résultat alimente le MÊME formulaire que la saisie
// manuelle — l'utilisateur relit et corrige avant validation, quelle que
// soit la méthode de saisie d'origine.
export async function dictateInvoiceAction(formData: FormData): Promise<DictationResult> {
  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return { status: "error", message: "Aucun enregistrement reçu." };
  }

  try {
    const buffer = Buffer.from(await audio.arrayBuffer());
    const result = await transcribeAndStructureInvoice(buffer, audio.type || "audio/webm");
    return { status: "success", message: "Dictée transcrite, relisez avant de valider.", ...result };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Échec de la transcription.";
    return { status: "error", message };
  }
}
