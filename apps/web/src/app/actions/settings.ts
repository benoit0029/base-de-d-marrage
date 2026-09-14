"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveLogoFile } from "@/lib/storage";
import { saveActivitySettings, saveCompanySettings } from "@/server/services/settings";
import type { Activity } from "@prisma/client";

export interface SettingsFormState {
  status: "idle" | "success" | "error";
  message: string;
}

const companySchema = z.object({
  legalName: z.string().min(1, "Nom obligatoire"),
  address: z.string().min(1, "Adresse obligatoire"),
  siren: z.string().min(1, "SIREN obligatoire"),
  vatNumber: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal("")),
});

export async function submitCompanySettings(
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const parsed = companySchema.safeParse({
    legalName: formData.get("legalName"),
    address: formData.get("address"),
    siren: formData.get("siren"),
    vatNumber: formData.get("vatNumber") || undefined,
    contactEmail: formData.get("contactEmail") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Champs invalides" };
  }

  await saveCompanySettings({
    ...parsed.data,
    contactEmail: parsed.data.contactEmail || undefined,
  });
  revalidatePath("/reglages");
  return { status: "success", message: "Identité enregistrée." };
}

const abCodeSchema = z
  .string()
  .regex(/^FR-BIO-\d{2}$/, "Format attendu : FR-BIO-XX")
  .optional()
  .or(z.literal(""));

const activityContactEmailSchema = z.string().email().optional().or(z.literal(""));

export async function submitActivitySettings(
  activity: Activity,
  _prev: SettingsFormState,
  formData: FormData
): Promise<SettingsFormState> {
  const abCode = abCodeSchema.safeParse(formData.get("abCertificationCode") || "");
  if (!abCode.success) {
    return { status: "error", message: abCode.error.issues[0]?.message ?? "Code AB invalide" };
  }

  const contactEmail = activityContactEmailSchema.safeParse(formData.get("contactEmail") || "");
  if (!contactEmail.success) {
    return { status: "error", message: "Email de contact invalide." };
  }

  const logoFile = formData.get("logo");
  let logoUrl: string | undefined;
  if (logoFile instanceof File && logoFile.size > 0) {
    const buffer = Buffer.from(await logoFile.arrayBuffer());
    const stored = await saveLogoFile(buffer, logoFile.name);
    logoUrl = stored.url;
  }

  await saveActivitySettings(activity, {
    ...(logoUrl ? { logoUrl } : {}),
    abCertificationCode: abCode.data || null,
    abLogoEnabled: formData.get("abLogoEnabled") === "on",
    invoicingEnabled: formData.get("invoicingEnabled") === "on",
    contactEmail: contactEmail.data || null,
  });

  revalidatePath("/reglages");
  return { status: "success", message: "Réglages de l'activité enregistrés." };
}
