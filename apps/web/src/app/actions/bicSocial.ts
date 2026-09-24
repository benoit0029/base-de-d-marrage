"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { asBicSocialRegime } from "@/lib/bic/social";

export interface BicSocialState {
  status: "idle" | "success" | "error";
  message: string;
}

// Enregistre le régime social de la micro-BIC (MSA activité principale ou URSSAF).
export async function saveBicSocialRegime(_prev: BicSocialState, formData: FormData): Promise<BicSocialState> {
  const regime = asBicSocialRegime(formData.get("regime")?.toString());
  if (!regime) return { status: "error", message: "Choix invalide." };
  const tenantId = await getDefaultTenantId();
  const updated = await prisma.companySettings.updateMany({ where: { tenantId }, data: { bicSocialRegime: regime } });
  if (updated.count === 0) {
    return { status: "error", message: "Renseigne d'abord l'identité de l'entreprise dans Réglages." };
  }
  revalidatePath("/synthese/social");
  revalidatePath("/synthese/obligations");
  return { status: "success", message: "Enregistré." };
}
