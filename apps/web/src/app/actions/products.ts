"use server";

import { revalidatePath } from "next/cache";
import {
  createOrUpdateProductByLabel,
  updateProduct,
  ProductNotFoundError,
} from "@/server/services/products";
import type { Activity } from "@prisma/client";

export interface ProductFormState {
  status: "idle" | "success" | "error";
  message: string;
}

const activityFacturationPath: Record<Activity, string> = {
  BA_MARAICHAGE: "/maraichage/facturation",
  BIC_FRUITS_LEGUMES: "/fruits-legumes/factures",
  BIC_PHOTOBOOTH: "/photobooth/factures",
};

export async function submitProduct(
  activity: Activity,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const id = formData.get("id")?.toString() || undefined;
  const label = formData.get("label")?.toString().trim();
  if (!label) {
    return { status: "error", message: "Désignation obligatoire." };
  }

  const priceRaw = formData.get("defaultUnitPrice")?.toString();
  const defaultUnitPrice = priceRaw ? Number(priceRaw.replace(",", ".")) : NaN;
  if (!Number.isFinite(defaultUnitPrice) || defaultUnitPrice < 0) {
    return { status: "error", message: "Prix unitaire invalide." };
  }

  const vatRaw = formData.get("vatRate")?.toString();
  const vatRate = vatRaw ? Number(vatRaw.replace(",", ".")) : 0;
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) {
    return { status: "error", message: "Taux de TVA invalide." };
  }

  const input = { label, defaultUnitPrice, vatRate };

  try {
    if (id) {
      await updateProduct(id, input);
    } else {
      await createOrUpdateProductByLabel(activity, input);
    }
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      return { status: "error", message: "Produit introuvable." };
    }
    throw err;
  }

  revalidatePath(activityFacturationPath[activity]);
  return { status: "success", message: "Produit enregistré au catalogue." };
}
