"use server";

import { revalidatePath } from "next/cache";
import {
  createClient,
  deleteClient,
  upsertClient,
  updateClient,
  ClientAlreadyExistsError,
  ClientNotFoundError,
} from "@/server/services/clients";
import { toClientView } from "@/lib/serialize";
import type { FakeClient } from "@/lib/types";
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
    email: formData.get("email")?.toString().trim() || undefined,
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

export type QuickCreateClientResult =
  | { status: "success"; client: FakeClient }
  | { status: "error"; message: string };

// Création rapide depuis la liste déroulante de la facture : la fiche
// rejoint le répertoire et remplit aussitôt le client de la facture.
export async function quickCreateClient(
  activity: Activity,
  raw: { name?: string; address?: string; siret?: string; vatNumber?: string; email?: string }
): Promise<QuickCreateClientResult> {
  const name = raw.name?.trim();
  if (!name) return { status: "error", message: "Nom du client obligatoire." };

  try {
    const client = await createClient(activity, {
      name,
      address: raw.address?.trim() || undefined,
      siret: raw.siret?.trim() || undefined,
      vatNumber: raw.vatNumber?.trim() || undefined,
      email: raw.email?.trim() || undefined,
    });
    revalidatePath(activityFacturationPath[activity]);
    return { status: "success", client: toClientView(client) };
  } catch (err) {
    if (err instanceof ClientAlreadyExistsError) {
      return { status: "error", message: "Ce client existe déjà : choisis-le dans la liste." };
    }
    throw err;
  }
}

export async function removeClient(activity: Activity, id: string): Promise<ClientFormState> {
  try {
    await deleteClient(id);
  } catch (err) {
    if (err instanceof ClientNotFoundError) {
      return { status: "error", message: "Client introuvable." };
    }
    throw err;
  }
  revalidatePath(activityFacturationPath[activity]);
  return { status: "success", message: "Client retiré du répertoire." };
}
