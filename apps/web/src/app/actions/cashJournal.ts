"use server";

import { revalidatePath } from "next/cache";
import { saveDocumentFile } from "@/lib/storage";
import {
  createCashJournalEntry,
  CashJournalAlreadyValidatedError,
  CashJournalError,
} from "@/server/services/cashJournal";
import { extractCashJournalAmount } from "@/lib/mistral/agents";
import { MistralApiError, MistralConfigError } from "@/lib/mistral/client";
import { CASH_JOURNAL_DAILY_THRESHOLD } from "@/lib/thresholds";
import type { Activity } from "@prisma/client";

export interface CashJournalPhotoReadResult {
  status: "ok" | "error";
  date: string | null;
  cashAmount: number | null;
  checkAmount: number | null;
  cardAmount: number | null;
  reducedRateAmount: number | null;
  plantSalesAmount: number | null;
  location: string | null;
  message?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lit automatiquement la recette du jour — ET la date de vente si elle est
 * notée dessus (saisie en retard) — sur la photo de comptage de caisse, pour
 * pré-remplir le formulaire (voir CashJournalForm) — l'exploitant garde la
 * main pour corriger avant d'enregistrer. Ne touche à aucune donnée, pure
 * lecture : aucun risque à l'appeler à chaque changement de photo.
 */
export async function extractCashJournalPhotoAmount(
  formData: FormData
): Promise<CashJournalPhotoReadResult> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return {
      status: "error",
      date: null,
      cashAmount: null,
      checkAmount: null,
      cardAmount: null,
      reducedRateAmount: null,
      plantSalesAmount: null,
      location: null,
      message: "Aucune photo reçue.",
    };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { date, cashAmount, checkAmount, cardAmount, reducedRateAmount, plantSalesAmount, location } = await extractCashJournalAmount(
      buffer,
      file.type || "image/jpeg"
    );
    return {
      status: "ok",
      date: date && ISO_DATE_RE.test(date) ? date : null,
      cashAmount,
      checkAmount,
      cardAmount,
      reducedRateAmount,
      plantSalesAmount,
      location: location?.trim().slice(0, 100) || null,
    };
  } catch (err) {
    if (err instanceof MistralConfigError || err instanceof MistralApiError) {
      return {
        status: "error",
        date: null,
        cashAmount: null,
        checkAmount: null,
        cardAmount: null,
        reducedRateAmount: null,
        plantSalesAmount: null,
        location: null,
        message: "Lecture automatique indisponible — saisis le montant manuellement.",
      };
    }
    throw err;
  }
}

export interface CashJournalFormState {
  status: "idle" | "success" | "error";
  message: string;
}

const activityBasePath: Record<Activity, string> = {
  BA_MARAICHAGE: "/maraichage",
  BIC_FRUITS_LEGUMES: "/fruits-legumes",
  BIC_PHOTOBOOTH: "/photobooth",
};

// Nombre de ventes exceptionnelles (> seuil légal) saisissables en une fois
// dans le formulaire — largement suffisant pour un usage quotidien réel.
const MAX_EXCEPTIONAL_SALES = 3;

function parseAmount(raw: FormDataEntryValue | null): number {
  if (typeof raw !== "string" || raw.trim() === "") return 0;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

async function fileUrlIfProvided(formData: FormData, field: string): Promise<string | undefined> {
  const file = formData.get(field);
  if (file instanceof File && file.size > 0) {
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await saveDocumentFile(buffer, file.name);
    return stored.url;
  }
  return undefined;
}

/**
 * Enregistre la saisie du jour du journal de caisse (vente directe). Les
 * ventes unitaires dépassant le seuil légal de saisie globale journalière
 * (BOI-BIC-DECLA-30-30) doivent être saisies à part, jamais agrégées dans le
 * total espèces/chèques/CB — voir CASH_JOURNAL_DAILY_THRESHOLD.
 */
export async function submitCashJournalEntry(
  activity: Activity,
  _prev: CashJournalFormState,
  formData: FormData
): Promise<CashJournalFormState> {
  const dateStr = formData.get("date");
  if (typeof dateStr !== "string" || !dateStr) {
    return { status: "error", message: "Date obligatoire." };
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { status: "error", message: "Date invalide." };
  }

  const isMaraichage = activity === "BA_MARAICHAGE";

  const cashAmount = parseAmount(formData.get("cashAmount"));
  const checkAmount = isMaraichage ? parseAmount(formData.get("checkAmount")) : 0;
  const cardAmount = isMaraichage ? parseAmount(formData.get("cardAmount")) : 0;
  const plantSalesAmount = isMaraichage ? parseAmount(formData.get("plantSalesAmount")) : 0;
  // Part fruits/légumes 5,5 % (Maraîchage) : sert seulement de contrôle — la
  // base ne garde que la part plants 10 %, le 5,5 % étant le reste du total.
  const reducedRaw = isMaraichage ? formData.get("reducedRateAmount") : null;
  const reducedRateAmount = typeof reducedRaw === "string" && reducedRaw.trim() !== "" ? parseAmount(reducedRaw) : null;
  if (
    [cashAmount, checkAmount, cardAmount, plantSalesAmount, reducedRateAmount ?? 0].some((n) => Number.isNaN(n) || n < 0)
  ) {
    return { status: "error", message: "Montant invalide." };
  }
  if (reducedRateAmount !== null) {
    const dayTotal = cashAmount + checkAmount + cardAmount;
    if (Math.abs(reducedRateAmount + plantSalesAmount - dayTotal) > 0.01) {
      const fmt = (n: number) => n.toFixed(2).replace(".", ",");
      return {
        status: "error",
        message: `Fruits/légumes 5,5 % (${fmt(reducedRateAmount)} €) + plants 10 % (${fmt(plantSalesAmount)} €) doivent égaler le total espèces + chèques + CB (${fmt(dayTotal)} €).`,
      };
    }
  }

  const exceptionalSales: { amountTtc: number; paymentMethod: string; description?: string }[] = [];
  for (let i = 0; i < MAX_EXCEPTIONAL_SALES; i++) {
    const amountRaw = formData.get(`exceptionalAmount${i}`);
    if (typeof amountRaw !== "string" || amountRaw.trim() === "") continue;

    const amount = parseAmount(amountRaw);
    if (Number.isNaN(amount) || amount <= 0) {
      return { status: "error", message: "Montant de vente exceptionnelle invalide." };
    }
    if (amount <= CASH_JOURNAL_DAILY_THRESHOLD) {
      return {
        status: "error",
        message: `Une vente saisie à part doit dépasser ${CASH_JOURNAL_DAILY_THRESHOLD} € — en dessous de ce seuil légal, incluez-la dans le total agrégé du jour.`,
      };
    }
    const paymentMethod = formData.get(`exceptionalMethod${i}`)?.toString() || "especes";
    const description = formData.get(`exceptionalDescription${i}`)?.toString() || undefined;
    exceptionalSales.push({ amountTtc: amount, paymentMethod, description });
  }

  try {
    const depositSlipUrl = await fileUrlIfProvided(formData, "depositSlip");

    await createCashJournalEntry(activity, {
      date,
      location: formData.get("location")?.toString().trim().slice(0, 100) || undefined,
      cashAmount,
      checkAmount,
      cardAmount,
      plantSalesAmount,
      depositSlipUrl,
      exceptionalSales,
    });
  } catch (err) {
    if (err instanceof CashJournalAlreadyValidatedError || err instanceof CashJournalError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  revalidatePath(`${activityBasePath[activity]}/recettes`);
  revalidatePath("/synthese");

  return { status: "success", message: "Saisie du jour enregistrée, en attente de validation." };
}
