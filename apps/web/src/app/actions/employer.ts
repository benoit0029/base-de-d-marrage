"use server";

import { revalidatePath } from "next/cache";
import {
  CHECKLIST_ITEMS,
  deleteStaff,
  saveChecklistItem,
  saveStaff,
  type ChecklistKey,
} from "@/server/services/employer";

export interface EmployerFormState {
  status: "idle" | "success" | "error";
  message: string;
}

function parseDate(raw: FormDataEntryValue | null): Date | null | "invalid" {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
}

const text = (fd: FormData, name: string) => fd.get(name)?.toString().trim() ?? "";

export async function submitStaff(_prev: EmployerFormState, formData: FormData): Promise<EmployerFormState> {
  const required = ["lastName", "firstName", "nationality", "sex", "jobTitle", "contractType"] as const;
  if (required.some((f) => !text(formData, f))) {
    return { status: "error", message: "Nom, prénom, nationalité, sexe, emploi et type de contrat sont obligatoires." };
  }
  const birthDate = parseDate(formData.get("birthDate"));
  const hireDate = parseDate(formData.get("hireDate"));
  const exitDate = parseDate(formData.get("exitDate"));
  const infoVisitDoneAt = parseDate(formData.get("infoVisitDoneAt"));
  if (!birthDate || birthDate === "invalid" || !hireDate || hireDate === "invalid") {
    return { status: "error", message: "Date de naissance et date d'embauche obligatoires." };
  }
  if (exitDate === "invalid" || infoVisitDoneAt === "invalid") {
    return { status: "error", message: "Date invalide." };
  }
  if (exitDate && exitDate < hireDate) {
    return { status: "error", message: "La date de sortie est avant la date d'embauche." };
  }

  try {
    await saveStaff(text(formData, "id") || undefined, {
      lastName: text(formData, "lastName"),
      firstName: text(formData, "firstName"),
      nationality: text(formData, "nationality"),
      birthDate,
      sex: text(formData, "sex"),
      jobTitle: text(formData, "jobTitle"),
      qualification: text(formData, "qualification"),
      contractType: text(formData, "contractType"),
      hireDate,
      exitDate,
      workPermit: text(formData, "workPermit"),
      infoVisitDoneAt,
    });
  } catch (err) {
    return { status: "error", message: err instanceof Error ? err.message : "Enregistrement impossible." };
  }
  revalidatePath("/maraichage/employeur");
  revalidatePath("/maraichage/obligations");
  return { status: "success", message: "Registre du personnel mis à jour." };
}

export async function removeStaff(id: string): Promise<EmployerFormState> {
  await deleteStaff(id);
  revalidatePath("/maraichage/employeur");
  revalidatePath("/maraichage/obligations");
  return { status: "success", message: "Ligne retirée du registre." };
}

export async function submitChecklistItem(
  key: ChecklistKey,
  _prev: EmployerFormState,
  formData: FormData
): Promise<EmployerFormState> {
  if (!CHECKLIST_ITEMS.some((i) => i.key === key)) return { status: "error", message: "Élément inconnu." };
  const doneAt = parseDate(formData.get("doneAt"));
  if (doneAt === "invalid") return { status: "error", message: "Date invalide." };
  await saveChecklistItem(key, doneAt, text(formData, "note") || null);
  revalidatePath("/maraichage/employeur");
  revalidatePath("/maraichage/obligations");
  return { status: "success", message: "Enregistré." };
}
