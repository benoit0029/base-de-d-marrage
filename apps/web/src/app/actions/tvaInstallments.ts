"use server";

import { revalidatePath } from "next/cache";
import {
  createTvaInstallment,
} from "@/server/services/tvaInstallments";

export interface TvaInstallmentFormState {
  status: "idle" | "success" | "duplicate" | "error";
  message: string;
}

function parseAmount(raw: FormDataEntryValue | null): number | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Enregistre un paiement d'acompte TVA déjà effectué, en attente de validation. */
export async function submitTvaInstallment(
  _prev: TvaInstallmentFormState,
  formData: FormData
): Promise<TvaInstallmentFormState> {
  const dueLabel = formData.get("dueLabel")?.toString().trim();
  if (!dueLabel) {
    return { status: "error", message: "Échéance obligatoire (ex. 2026-T3, ou « Régularisation annuelle »)." };
  }

  const amountPaid = parseAmount(formData.get("amountPaid"));
  if (amountPaid === null || amountPaid <= 0) {
    return { status: "error", message: "Montant versé invalide." };
  }

  const paidAtStr = formData.get("paidAt");
  if (typeof paidAtStr !== "string" || !paidAtStr) {
    return { status: "error", message: "Date de paiement obligatoire." };
  }
  const paidAt = new Date(paidAtStr);
  if (Number.isNaN(paidAt.getTime())) {
    return { status: "error", message: "Date de paiement invalide." };
  }

  const file = formData.get("justificatif");
  const hasFile = file instanceof File && file.size > 0;
  const confirmDuplicate = formData.get("confirmDuplicate") === "on";

  const result = await createTvaInstallment({
    dueLabel,
    amountPaid,
    paidAt,
    fileBuffer: hasFile ? Buffer.from(await (file as File).arrayBuffer()) : undefined,
    fileName: hasFile ? (file as File).name : undefined,
    confirmDuplicate,
  });

  if (result.status === "duplicate") {
    return {
      status: "duplicate",
      message:
        result.reason === "same_file"
          ? "Ce justificatif semble déjà avoir été importé. Cochez la case ci-dessous et renvoyez pour l'enregistrer quand même."
          : "Un paiement à la même date et pour le même montant existe déjà. Cochez la case ci-dessous et renvoyez pour l'enregistrer quand même.",
    };
  }

  revalidatePath("/maraichage/acomptes");
  revalidatePath("/maraichage/tva");

  return { status: "success", message: "Paiement enregistré, en attente de validation." };
}
