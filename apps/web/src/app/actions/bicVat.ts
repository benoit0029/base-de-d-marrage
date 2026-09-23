"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";

export interface BicVatFormState {
  status: "idle" | "success" | "error";
  message: string;
}

// Numéro de TVA intracommunautaire français : FR + clé (2 caractères) + SIREN.
const FR_VAT_NUMBER_RE = /^FR[0-9A-Z]{2}\d{9}$/;

const PATHS = ["/synthese", "/synthese/tva", "/photobooth/factures", "/fruits-legumes/factures"];

/**
 * Confirme la sortie de franchise de la micro-BIC : date d'effet (proposée
 * par la détection, modifiable), numéro de TVA (obligatoire sur les factures
 * dès cette date) et choix de prix Kerbooth. C'est cette confirmation — pas
 * la détection seule — qui fait basculer la facturation.
 */
export async function confirmBicVatLiability(
  _prev: BicVatFormState,
  formData: FormData
): Promise<BicVatFormState> {
  const dateStr = formData.get("liableFrom")?.toString();
  const liableFrom = dateStr ? new Date(`${dateStr}T00:00:00`) : null;
  if (!liableFrom || Number.isNaN(liableFrom.getTime())) {
    return { status: "error", message: "Date d'effet obligatoire." };
  }

  const vatNumber = (formData.get("vatNumber")?.toString() ?? "").replace(/\s+/g, "").toUpperCase();
  if (!FR_VAT_NUMBER_RE.test(vatNumber)) {
    return {
      status: "error",
      message: "Numéro de TVA invalide (format FR + 2 caractères + SIREN, ex. FR12533242053). Demande-le à ton service des impôts (SIE) si tu ne l'as pas encore.",
    };
  }

  const pricing = formData.get("pricing") === "ADDED" ? "ADDED" : "INCLUDED";

  const tenantId = await getDefaultTenantId();
  const company = await prisma.companySettings.findUnique({ where: { tenantId }, select: { id: true } });
  if (!company) {
    return { status: "error", message: "Renseigne d'abord l'identité de l'entreprise dans Réglages." };
  }

  await prisma.companySettings.update({
    where: { tenantId },
    data: { bicVatLiableFrom: liableFrom, bicVatPricing: pricing, vatNumber },
  });

  PATHS.forEach((p) => revalidatePath(p));
  return {
    status: "success",
    message: `Bascule enregistrée : TVA appliquée sur les factures micro-BIC à partir du ${liableFrom.toLocaleDateString("fr-FR")}.`,
  };
}

/**
 * Annule une bascule enregistrée par erreur — refusé dès qu'une facture
 * micro-BIC avec TVA a déjà été émise (elle ferait foi, voir Cerfrance).
 */
export async function cancelBicVatLiability(): Promise<BicVatFormState> {
  const tenantId = await getDefaultTenantId();
  const invoiced = await prisma.invoice.count({
    where: { tenantId, activity: { in: ["BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"] }, vatApplicable: true },
  });
  if (invoiced > 0) {
    return {
      status: "error",
      message: `${invoiced} facture(s) avec TVA déjà émise(s) : annulation impossible depuis l'appli, à voir avec Cerfrance.`,
    };
  }

  await prisma.companySettings.update({
    where: { tenantId },
    data: { bicVatLiableFrom: null, bicVatPricing: null },
  });
  PATHS.forEach((p) => revalidatePath(p));
  return { status: "success", message: "Bascule annulée : retour à la franchise en base." };
}
