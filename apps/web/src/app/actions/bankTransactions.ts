"use server";

import { revalidatePath } from "next/cache";
import {
  importBankStatementCsv,
  BankTransactionError,
} from "@/server/services/bankTransactions";
import type { Activity } from "@prisma/client";

export interface BankImportFormState {
  status: "idle" | "success" | "duplicate" | "error";
  message: string;
}

const activityBasePath: Record<Activity, string> = {
  BA_MARAICHAGE: "/maraichage",
  BIC_FRUITS_LEGUMES: "/fruits-legumes",
  BIC_PHOTOBOOTH: "/photobooth",
};

export async function submitBankStatementImport(
  activity: Activity,
  _prev: BankImportFormState,
  formData: FormData
): Promise<BankImportFormState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choisissez d'abord un fichier CSV." };
  }
  const confirmDuplicate = formData.get("confirmDuplicate") === "on";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const result = await importBankStatementCsv(activity, buffer, file.name, confirmDuplicate);

    if (result.status === "duplicate_file") {
      return {
        status: "duplicate",
        message:
          "Ce relevé semble déjà avoir été importé. Cochez la case ci-dessous et renvoyez pour l'importer quand même.",
      };
    }

    revalidatePath(`${activityBasePath[activity]}/releve-bancaire`);
    revalidatePath(`${activityBasePath[activity]}/achats`);
    revalidatePath(`${activityBasePath[activity]}/recettes`);

    const skippedNote =
      result.skippedDuplicateLines > 0
        ? ` (${result.skippedDuplicateLines} ligne(s) déjà connue(s) ignorée(s))`
        : "";
    return {
      status: "success",
      message: `${result.count} opération(s) importée(s)${skippedNote}.`,
    };
  } catch (err) {
    if (err instanceof BankTransactionError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }
}
