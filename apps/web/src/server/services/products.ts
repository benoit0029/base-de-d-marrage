import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import type { Activity } from "@prisma/client";

export async function listProducts(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.product.findMany({ where: { tenantId, activity }, orderBy: { label: "asc" } });
}

export interface ProductInput {
  label: string;
  defaultUnitPrice: number;
  vatRate: number;
  unit?: string;
}

/**
 * Ajoute une fiche produit/prestation au catalogue si elle n'existe pas
 * déjà — appelée automatiquement à la création d'une facture pour chaque
 * ligne dont la désignation est inconnue. Ne touche jamais à une fiche
 * existante : une remise ponctuelle sur une facture ne doit pas corrompre
 * silencieusement le prix par défaut du catalogue. Pour changer un prix
 * délibérément, voir `updateProduct` (formulaire de gestion du catalogue).
 */
export async function ensureProduct(activity: Activity, input: ProductInput) {
  const tenantId = await getDefaultTenantId();

  const existing = await prisma.product.findUnique({
    where: { tenantId_activity_label: { tenantId, activity, label: input.label } },
  });
  if (existing) return existing;

  return prisma.product.create({
    data: {
      tenantId,
      activity,
      label: input.label,
      defaultUnitPrice: input.defaultUnitPrice,
      vatRate: input.vatRate,
      unit: input.unit || null,
    },
  });
}

/**
 * Ajoute ou met à jour explicitement une fiche produit par son libellé —
 * utilisée par le formulaire de gestion du catalogue (action délibérée de
 * l'utilisateur), contrairement à `ensureProduct` qui ne touche jamais à une
 * fiche déjà existante lors d'une création de facture.
 */
export async function createOrUpdateProductByLabel(activity: Activity, input: ProductInput) {
  const tenantId = await getDefaultTenantId();
  return prisma.product.upsert({
    where: { tenantId_activity_label: { tenantId, activity, label: input.label } },
    create: {
      tenantId,
      activity,
      label: input.label,
      defaultUnitPrice: input.defaultUnitPrice,
      vatRate: input.vatRate,
      unit: input.unit || null,
    },
    update: {
      defaultUnitPrice: input.defaultUnitPrice,
      vatRate: input.vatRate,
      unit: input.unit || null,
    },
  });
}

export class ProductNotFoundError extends Error {}

export async function updateProduct(id: string, input: ProductInput) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ProductNotFoundError(id);

  return prisma.product.update({
    where: { id },
    data: {
      label: input.label,
      defaultUnitPrice: input.defaultUnitPrice,
      vatRate: input.vatRate,
      unit: input.unit || null,
    },
  });
}

export class ProductAlreadyExistsError extends Error {}

/**
 * Création rapide depuis la liste déroulante d'une ligne de facture :
 * refuse un libellé déjà au catalogue (plutôt que d'écraser son prix), pour
 * que l'utilisateur le choisisse dans la liste ou le modifie délibérément.
 */
export async function createProduct(activity: Activity, input: ProductInput) {
  const tenantId = await getDefaultTenantId();
  const existing = await prisma.product.findUnique({
    where: { tenantId_activity_label: { tenantId, activity, label: input.label } },
  });
  if (existing) throw new ProductAlreadyExistsError(input.label);

  return prisma.product.create({
    data: {
      tenantId,
      activity,
      label: input.label,
      defaultUnitPrice: input.defaultUnitPrice,
      vatRate: input.vatRate,
      unit: input.unit || null,
    },
  });
}

/**
 * Retire une fiche du catalogue. Sans effet sur les factures déjà émises :
 * leurs lignes gardent leur propre copie de la désignation, du prix et du
 * taux.
 */
export async function deleteProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new ProductNotFoundError(id);
  await prisma.product.delete({ where: { id } });
}
