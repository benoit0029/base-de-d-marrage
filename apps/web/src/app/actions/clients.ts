"use server";

import { revalidatePath } from "next/cache";
import { upsertClient, updateClient, ClientNotFoundError } from "@/server/services/clients";
import type { Activity } from "@prisma/client";

export interface ClientFormState {
  status: "idle" | "success" | "error";
  message: string;
}

const activityFacturationPath: Record<Activity, string> = {
  BA_MARAICHAGE: "/maraichage/facturation",
  BIC_FRUITS_LEGUMES: "/fruits-legumes/factures",
  BIC_PHOTOBOOTH: "/photobooth/factures",
};

export async function submitClient(
  activity: Activity,
  _prev: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const id = formData.get("id")?.toString() || undefined;
  const name = formData.get("name")?.toString().trim();
  if (!name) {
    return { status: "error", message: "Nom du client obligatoire." };
  }

  const input = {
    name,
    address: formData.get("address")?.toString() || undefined,
    siret: formData.get("siret")?.toString() || undefined,
    vatNumber: formData.get("vatNumber")?.toString() || undefined,
  };

  try {
    if (id) {
      await updateClient(id, input);
    } else {
      await upsertClient(activity, input);
    }
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return { status: "error", message: "Client introuvable." };
    }
    throw err;
  }

  revalidatePath(activityFacturationPath[activity]);
  return { status: "success", message: "Fiche client enregistrée." };
}
