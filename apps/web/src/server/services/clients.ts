import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import type { Activity } from "@prisma/client";

export async function listClients(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.client.findMany({ where: { tenantId, activity }, orderBy: { name: "asc" } });
}

export interface ClientInput {
  name: string;
  address?: string;
  siret?: string;
  vatNumber?: string;
  email?: string;
}

/**
 * Enregistre ou complète une fiche client. Appelée automatiquement à la
 * création d'une facture (le client tapé rejoint le répertoire, même sans
 * passage explicite par cet écran), et depuis le petit formulaire de gestion
 * du répertoire pour compléter/corriger une fiche existante à tout moment.
 * N'écrase jamais un champ déjà renseigné avec une valeur vide.
 */
export async function upsertClient(activity: Activity, input: ClientInput) {
  const tenantId = await getDefaultTenantId();
  const existing = await prisma.client.findUnique({
    where: { tenantId_activity_name: { tenantId, activity, name: input.name } },
  });

  return prisma.client.upsert({
    where: { tenantId_activity_name: { tenantId, activity, name: input.name } },
    create: {
      tenantId,
      activity,
      name: input.name,
      address: input.address,
      siret: input.siret,
      vatNumber: input.vatNumber,
      email: input.email,
    },
    update: {
      address: input.address || existing?.address,
      siret: input.siret || existing?.siret,
      vatNumber: input.vatNumber || existing?.vatNumber,
      email: input.email || existing?.email,
    },
  });
}

export class ClientNotFoundError extends Error {}

export async function updateClient(id: string, input: ClientInput) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new ClientNotFoundError(id);

  return prisma.client.update({
    where: { id },
    data: {
      name: input.name,
      address: input.address,
      siret: input.siret,
      vatNumber: input.vatNumber,
      email: input.email,
    },
  });
}

export class ClientAlreadyExistsError extends Error {}

/**
 * Création rapide depuis la liste déroulante de la facture : refuse un nom
 * déjà au répertoire, à choisir alors dans la liste.
 */
export async function createClient(activity: Activity, input: ClientInput) {
  const tenantId = await getDefaultTenantId();
  const existing = await prisma.client.findUnique({
    where: { tenantId_activity_name: { tenantId, activity, name: input.name } },
  });
  if (existing) throw new ClientAlreadyExistsError(input.name);

  return prisma.client.create({
    data: {
      tenantId,
      activity,
      name: input.name,
      address: input.address,
      siret: input.siret,
      vatNumber: input.vatNumber,
      email: input.email,
    },
  });
}

/**
 * Retire une fiche du répertoire. Sans effet sur les factures déjà émises,
 * qui gardent leur propre copie du nom et de l'adresse du client.
 */
export async function deleteClient(id: string) {
  const client = await prisma.client.findUnique({ where: { id } });
  if (!client) throw new ClientNotFoundError(id);
  await prisma.client.delete({ where: { id } });
}
