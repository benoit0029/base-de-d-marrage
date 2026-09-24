"use server";

import { revalidatePath } from "next/cache";
import { saveDocumentFile } from "@/lib/storage";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import {
  createCashJournalEntry,
  CashJournalAlreadyValidatedError,
  CashJournalError,
} from "@/server/services/cashJournal";
import { extractCashJournalSheets } from "@/lib/mistral/agents";
import { MistralApiError, MistralConfigError } from "@/lib/mistral/client";
import { CASH_JOURNAL_DAILY_THRESHOLD } from "@/lib/thresholds";
import type { Activity } from "@prisma/client";

// Une fiche du jour lue sur la photo (une photo peut en contenir plusieurs).
export interface CashJournalSheetRead {
  date: string | null;
  cashAmount: number | null;
  checkAmount: number | null;
  cardAmount: number | null;
  reducedRateAmount: number | null;
  plantSalesAmount: number | null;
  location: string | null;
}

export interface CashJournalPhotoReadResult {
  status: "ok" | "error";
  sheets: CashJournalSheetRead[];
  message?: string;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Lit automatiquement la ou les fiches du jour photographiées (plusieurs
 * fiches sur une même photo en cas de saisie en retard) — date de vente,
 * lieu et montants de chacune — pour pré-remplir le formulaire (voir
 * CashJournalForm) ; l'exploitant garde la main pour corriger avant
 * d'enregistrer. Pure lecture : ne touche à aucune donnée.
 */
export async function extractCashJournalPhotoAmount(
  formData: FormData
): Promise<CashJournalPhotoReadResult> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", sheets: [], message: "Aucune photo reçue." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const fiches = await extractCashJournalSheets(buffer, file.type || "image/jpeg");
    return {
      status: "ok",
      sheets: fiches.map((f) => ({
        date: f.date && ISO_DATE_RE.test(f.date) ? f.date : null,
        cashAmount: f.cashAmount,
        checkAmount: f.checkAmount,
        cardAmount: f.cardAmount,
        reducedRateAmount: f.reducedRateAmount,
        plantSalesAmount: f.plantSalesAmount,
        location: f.location?.trim().slice(0, 100) || null,
      })),
    };
  } catch (err) {
    if (err instanceof MistralConfigError || err instanceof MistralApiError) {
      return {
        status: "error",
        sheets: [],
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

export interface CashJournalSheetsResult {
  status: "success" | "error";
  message: string;
}

const fmt2 = (n: number) => n.toFixed(2).replace(".", ",");

/**
 * Enregistre en une fois plusieurs fiches lues sur une même photo (saisie en
 * retard) : une saisie du jour par fiche, toutes en attente de validation,
 * avec la même photo comme justificatif. Rien n'est enregistré si une fiche
 * est incomplète ou incohérente (message indiquant laquelle).
 */
export async function submitCashJournalSheets(activity: Activity, formData: FormData): Promise<CashJournalSheetsResult> {
  const isMaraichage = activity === "BA_MARAICHAGE";
  let sheets: CashJournalSheetRead[];
  try {
    sheets = JSON.parse(formData.get("sheets")?.toString() ?? "[]");
  } catch {
    return { status: "error", message: "Fiches illisibles." };
  }
  if (!Array.isArray(sheets) || sheets.length === 0) return { status: "error", message: "Aucune fiche à enregistrer." };

  const clean = (n: number | null | undefined) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  const inputs = [];
  for (const [i, sh] of sheets.entries()) {
    const label = `Fiche ${i + 1}`;
    if (!sh.date || !ISO_DATE_RE.test(sh.date)) return { status: "error", message: `${label} : date de vente manquante.` };
    const cash = clean(sh.cashAmount);
    const check = isMaraichage ? clean(sh.checkAmount) : 0;
    const card = isMaraichage ? clean(sh.cardAmount) : 0;
    const plants = isMaraichage ? clean(sh.plantSalesAmount) : 0;
    if ([cash, check, card, plants].some((n) => n < 0)) return { status: "error", message: `${label} : montant invalide.` };
    const total = cash + check + card;
    if (total <= 0) return { status: "error", message: `${label} : aucun montant.` };
    if (isMaraichage && typeof sh.reducedRateAmount === "number" && Math.abs(sh.reducedRateAmount + plants - total) > 0.01) {
      return {
        status: "error",
        message: `${label} : 5,5 % (${fmt2(sh.reducedRateAmount)} €) + 10 % (${fmt2(plants)} €) ≠ total (${fmt2(total)} €).`,
      };
    }
    inputs.push({
      date: new Date(sh.date),
      location: sh.location?.trim().slice(0, 100) || undefined,
      cashAmount: cash,
      checkAmount: check,
      cardAmount: card,
      plantSalesAmount: plants,
    });
  }
  const dates = inputs.map((x) => x.date.getTime());
  if (new Set(dates).size !== dates.length) {
    return { status: "error", message: "Deux fiches ont la même date de vente : corrige la date avant d'enregistrer." };
  }

  // Tout ou rien : aucune fiche n'est enregistrée si l'une d'elles tombe sur
  // un jour déjà validé (non modifiable).
  const tenantId = await getDefaultTenantId();
  const locked = await prisma.cashJournalEntry.findFirst({
    where: { tenantId, activity, status: "VALIDATED", date: { in: inputs.map((x) => x.date) } },
    select: { date: true },
  });
  if (locked) {
    return {
      status: "error",
      message: `Une saisie validée existe déjà pour le ${locked.date.toLocaleDateString("fr-FR")} : retire cette fiche ou corrige sa date.`,
    };
  }

  try {
    const depositSlipUrl = await fileUrlIfProvided(formData, "photo");
    for (const input of inputs) {
      await createCashJournalEntry(activity, { ...input, depositSlipUrl, exceptionalSales: [] });
    }
  } catch (err) {
    if (err instanceof CashJournalAlreadyValidatedError || err instanceof CashJournalError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  revalidatePath(`${activityBasePath[activity]}/recettes`);
  revalidatePath("/synthese");
  return {
    status: "success",
    message: `${inputs.length} saisie${inputs.length > 1 ? "s" : ""} enregistrée${inputs.length > 1 ? "s" : ""}, en attente de validation.`,
  };
}
