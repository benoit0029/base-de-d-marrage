"use server";

import { revalidatePath } from "next/cache";
import {
  createOrUpdateProductByLabel,
  createProduct,
  deleteProduct,
  updateProduct,
  ProductAlreadyExistsError,
  ProductNotFoundError,
  type ProductInput,
} from "@/server/services/products";
import { toProductView } from "@/lib/serialize";
import type { FakeProduct } from "@/lib/types";
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

type RawProduct = { label?: string; defaultUnitPrice?: string; vatRate?: string; unit?: string };

// Contrôle commun au formulaire du catalogue et à la création rapide depuis
// une ligne de facture.
function parseProduct(raw: RawProduct): ProductInput | string {
  const label = raw.label?.trim();
  if (!label) return "Désignation obligatoire.";

  const defaultUnitPrice = raw.defaultUnitPrice ? Number(raw.defaultUnitPrice.replace(",", ".")) : NaN;
  if (!Number.isFinite(defaultUnitPrice) || defaultUnitPrice < 0) return "Prix unitaire invalide.";

  const vatRate = raw.vatRate ? Number(raw.vatRate.replace(",", ".")) : 0;
  if (!Number.isFinite(vatRate) || vatRate < 0 || vatRate > 100) return "Taux de TVA invalide.";

  const unit = raw.unit?.trim().slice(0, 20) || undefined;
  return { label, defaultUnitPrice, vatRate, unit };
}

export async function submitProduct(
  activity: Activity,
  _prev: ProductFormState,
  formData: FormData
): Promise<ProductFormState> {
  const id = formData.get("id")?.toString() || undefined;
  const input = parseProduct({
    label: formData.get("label")?.toString(),
    defaultUnitPrice: formData.get("defaultUnitPrice")?.toString(),
    vatRate: formData.get("vatRate")?.toString(),
    unit: formData.get("unit")?.toString(),
  });
  if (typeof input === "string") {
    return { status: "error", message: input };
  }

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

export type QuickCreateProductResult =
  | { status: "success"; product: FakeProduct }
  | { status: "error"; message: string };

// Création rapide depuis la liste déroulante d'une ligne de facture : la
// fiche rejoint le catalogue et remplit aussitôt la ligne.
export async function quickCreateProduct(activity: Activity, raw: RawProduct): Promise<QuickCreateProductResult> {
  const input = parseProduct(raw);
  if (typeof input === "string") return { status: "error", message: input };

  try {
    const product = await createProduct(activity, input);
    revalidatePath(activityFacturationPath[activity]);
    return { status: "success", product: toProductView(product) };
  } catch (err) {
    if (err instanceof ProductAlreadyExistsError) {
      return { status: "error", message: "Ce produit existe déjà : choisis-le dans la liste." };
    }
    throw err;
  }
}

export async function removeProduct(activity: Activity, id: string): Promise<ProductFormState> {
  try {
    await deleteProduct(id);
  } catch (err) {
    if (err instanceof ProductNotFoundError) {
      return { status: "error", message: "Produit introuvable." };
    }
    throw err;
  }
  revalidatePath(activityFacturationPath[activity]);
  return { status: "success", message: "Produit retiré du catalogue." };
}
