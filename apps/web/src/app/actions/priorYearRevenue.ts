"use server";

import { revalidatePath } from "next/cache";
import { deletePriorYearRevenue, savePriorYearRevenue } from "@/lib/declaration/microBa";

export interface PriorYearRevenueState {
  status: "idle" | "success" | "error";
  message: string;
}

// Recettes HT d'une année passée (avant l'outil), pour la moyenne triennale
// de la page Déclaration 2042 — voir lib/declaration/microBa.
export async function submitPriorYearRevenue(
  _prev: PriorYearRevenueState,
  formData: FormData
): Promise<PriorYearRevenueState> {
  const year = Number(formData.get("year"));
  const currentYear = new Date().getFullYear();
  if (!Number.isInteger(year) || year < 2000 || year >= currentYear) {
    return { status: "error", message: `Année invalide (une année passée, avant ${currentYear}).` };
  }

  const raw = formData.get("amountHt")?.toString().replace(/\s/g, "").replace(",", ".") ?? "";
  const amountHt = Number(raw);
  if (!raw || !Number.isFinite(amountHt) || amountHt < 0) {
    return { status: "error", message: "Montant invalide." };
  }

  await savePriorYearRevenue(year, Math.round(amountHt * 100) / 100);
  revalidatePath("/maraichage/declaration-annuelle");
  return { status: "success", message: `Recettes ${year} enregistrées.` };
}

export async function removePriorYearRevenue(year: number): Promise<PriorYearRevenueState> {
  await deletePriorYearRevenue(year);
  revalidatePath("/maraichage/declaration-annuelle");
  return { status: "success", message: `Saisie ${year} retirée : l'année reprend le calcul automatique.` };
}
