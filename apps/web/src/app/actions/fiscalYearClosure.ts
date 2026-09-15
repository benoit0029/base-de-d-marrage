"use server";

import { revalidatePath } from "next/cache";
import {
  closeFiscalYear,
  FiscalYearAlreadyClosedError,
  FiscalYearBlockedError,
  FiscalYearOrderError,
} from "@/server/services/fiscalYearClosure";
import { getCurrentUserId } from "@/lib/auth/currentUser";

export interface FiscalYearClosureFormState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitFiscalYearClosure(
  _prev: FiscalYearClosureFormState,
  formData: FormData
): Promise<FiscalYearClosureFormState> {
  const yearRaw = formData.get("year")?.toString();
  const year = yearRaw ? Number(yearRaw) : NaN;
  if (!Number.isInteger(year)) {
    return { status: "error", message: "Année invalide." };
  }

  const userId = await getCurrentUserId();

  try {
    await closeFiscalYear(year, userId);
  } catch (err) {
    if (err instanceof FiscalYearBlockedError) {
      const detail = err.blockers.map((b) => `${b.label} (${b.count})`).join(", ");
      return { status: "error", message: `Lignes en attente : ${detail}.` };
    }
    if (err instanceof FiscalYearOrderError || err instanceof FiscalYearAlreadyClosedError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  revalidatePath("/reglages");
  return { status: "success", message: `Exercice ${year} clôturé. Dossier ZIP disponible ci-dessous.` };
}
