"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createInvoice, InvoicingError } from "@/server/services/invoices";
import {
  cancelQuote,
  createKerboothQuote,
  requestQuoteSending,
  KerboothQuoteInputError,
  KerboothQuoteNotFoundError,
  KerboothQuoteStateError,
} from "@/server/services/kerbooth/quotes";
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
  clientSiren: z.string().trim().max(20).optional(),
  clientVatNumber: z.string().trim().max(20).optional(),
  issueDate: z.string().min(1),
  dueDate: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Au moins une ligne est requise"),
  // Devis Kerbooth entreprise (D-160) : obligatoire pour un devis Kerbooth.
  kerboothQuote: z
    .object({
      clientEmail: z.string().trim().email("E-mail du client invalide"),
      formulaLabel: z.string().trim().min(1, "Formule obligatoire"),
      photoboothCount: z.number().int().min(1, "Au moins 1 photobooth"),
      eventLocation: z.string().trim().min(1, "Lieu d'installation obligatoire"),
      paymentTermDays: z.number().int().min(0).max(60),
      periods: z
        .array(z.object({ start: z.string().min(1), end: z.string().min(1) }))
        .min(1, "Au moins une date de prestation"),
    })
    .optional(),
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

  const isKerboothQuote = parsed.data.activity === "BIC_PHOTOBOOTH" && parsed.data.type === "DEVIS";
  if (isKerboothQuote && !parsed.data.kerboothQuote) {
    return { status: "error", message: "Devis Kerbooth : renseigne la prestation (e-mail, formule, dates, lieu)." };
  }

  try {
    const common = {
      clientName: parsed.data.clientName,
      clientAddress: parsed.data.clientAddress,
      clientSiren: parsed.data.clientSiren || undefined,
      clientVatNumber: parsed.data.clientVatNumber || undefined,
      issueDate: new Date(parsed.data.issueDate),
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
      lines: parsed.data.lines,
    };
    const q = parsed.data.kerboothQuote;
    const invoice =
      isKerboothQuote && q
        ? (
            await createKerboothQuote(common, {
              ...q,
              periods: q.periods.map((p) => ({ start: new Date(p.start), end: new Date(p.end) })),
            })
          ).devis
        : await createInvoice({ ...common, activity: parsed.data.activity, type: parsed.data.type });

    revalidatePath(`${activityBasePath[parsed.data.activity]}/facturation`);
    revalidatePath(`${activityBasePath[parsed.data.activity]}/factures`);

    return {
      status: "success",
      message: `${parsed.data.type === "DEVIS" ? "Devis" : "Facture"} ${invoice.number} créé(e).`,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    };
  } catch (err) {
    const message =
      err instanceof InvoicingError || err instanceof KerboothQuoteInputError
        ? err.message
        : "Erreur lors de la création.";
    return { status: "error", message };
  }
}

export interface QuoteActionResult {
  status: "success" | "error";
  message: string;
}

function quoteActionError(err: unknown): QuoteActionResult {
  if (err instanceof KerboothQuoteStateError || err instanceof KerboothQuoteInputError) {
    return { status: "error", message: err.message };
  }
  if (err instanceof KerboothQuoteNotFoundError) return { status: "error", message: "Devis introuvable." };
  throw err;
}

// « Envoyer au client » : bloque les photobooths, n8n envoie ensuite le
// devis et le contrat à signer par Yousign (dans les 2 minutes).
export async function sendKerboothQuoteAction(quoteId: string): Promise<QuoteActionResult> {
  try {
    await requestQuoteSending(quoteId);
  } catch (err) {
    return quoteActionError(err);
  }
  revalidatePath("/photobooth/factures");
  revalidatePath("/photobooth/reservations");
  return {
    status: "success",
    message: "Photobooths bloqués. Le client reçoit le devis et le contrat à signer d'ici quelques minutes.",
  };
}

export async function cancelKerboothQuoteAction(quoteId: string): Promise<QuoteActionResult> {
  try {
    await cancelQuote(quoteId);
  } catch (err) {
    return quoteActionError(err);
  }
  revalidatePath("/photobooth/factures");
  revalidatePath("/photobooth/reservations");
  return { status: "success", message: "Devis annulé, photobooths libérés." };
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
