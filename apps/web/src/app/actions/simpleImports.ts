"use server";

import { revalidatePath } from "next/cache";
import { createSimpleImport, SimpleImportError } from "@/server/services/simpleImports";
import type { Activity, SimpleImportCategory } from "@prisma/client";

export interface SimpleImportFormState {
  status: "idle" | "success" | "duplicate" | "error";
  message: string;
}

function parseAmount(raw: FormDataEntryValue | null): number | undefined {
  if (typeof raw !== "string" || raw.trim() === "") return undefined;
  const n = Number(raw.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Enregistre un import simple (Tesa+ ou cotisation non salarié). Si un
 * doublon probable est détecté, ne rien écrire et demander confirmation :
 * l'utilisateur renvoie alors le même formulaire avec confirmDuplicate=on.
 */
export async function submitSimpleImport(
  activity: Activity,
  revalidatePaths: string[],
  _prev: SimpleImportFormState,
  formData: FormData
): Promise<SimpleImportFormState> {
  const category = formData.get("category") as SimpleImportCategory | null;
  if (!category) {
    return { status: "error", message: "Type de document obligatoire." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choisissez d'abord un fichier." };
  }

  const dateStr = formData.get("date");
  if (typeof dateStr !== "string" || !dateStr) {
    return { status: "error", message: "Date obligatoire." };
  }
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) {
    return { status: "error", message: "Date invalide." };
  }

  const amountTtc = parseAmount(formData.get("amountTtc"));
  if (category === "COTISATION_NON_SALARIE" && amountTtc === undefined) {
    return { status: "error", message: "Le montant est obligatoire pour une cotisation non salarié." };
  }

  const period = formData.get("period")?.toString() || undefined;
  const confirmDuplicate = formData.get("confirmDuplicate") === "on";

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await createSimpleImport({
      activity,
      category,
      period,
      date,
      fileBuffer: buffer,
      fileName: file.name,
      amountTtc,
      confirmDuplicate,
    });

    if (result.status === "duplicate") {
      return {
        status: "duplicate",
        message:
          result.reason === "same_file"
            ? "Ce fichier semble déjà avoir été importé. Cochez la case ci-dessous et renvoyez pour l'enregistrer quand même."
            : "Un document du même type, à la même date et pour le même montant, existe déjà. Cochez la case ci-dessous et renvoyez pour l'enregistrer quand même.",
      };
    }
  } catch (err) {
    if (err instanceof SimpleImportError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }

  for (const path of revalidatePaths) revalidatePath(path);

  return { status: "success", message: "Document enregistré." };
}
