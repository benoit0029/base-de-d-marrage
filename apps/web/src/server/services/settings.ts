import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import type { Activity } from "@prisma/client";

export async function getCompanySettings() {
  const tenantId = await getDefaultTenantId();
  return prisma.companySettings.findUnique({ where: { tenantId } });
}

export interface CompanySettingsInput {
  legalName: string;
  address: string;
  siren: string;
  vatNumber?: string;
  contactEmail?: string;
}

export async function saveCompanySettings(input: CompanySettingsInput) {
  const tenantId = await getDefaultTenantId();
  return prisma.companySettings.upsert({
    where: { tenantId },
    update: input,
    create: { tenantId, ...input },
  });
}

const ALL_ACTIVITIES: Activity[] = ["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"];

export async function listActivitySettings() {
  const tenantId = await getDefaultTenantId();
  const existing = await prisma.activitySettings.findMany({ where: { tenantId } });
  const byActivity = new Map(existing.map((s) => [s.activity, s]));

  // Renvoie toujours les 3 activités, même avant tout enregistrement en base.
  return ALL_ACTIVITIES.map(
    (activity) =>
      byActivity.get(activity) ?? {
        id: "",
        tenantId,
        activity,
        logoUrl: null,
        accentColorHex: null,
        abCertificationCode: null,
        abLogoEnabled: false,
        legalMentions: null,
        invoicingEnabled: false,
        contactEmail: null,
        tvaInstallmentsEnabled: true,
        bankIban: null,
        bankBic: null,
        websiteUrl: null,
        updatedAt: new Date(),
      }
  );
}

export interface ActivitySettingsInput {
  logoUrl?: string;
  abCertificationCode?: string | null;
  abLogoEnabled?: boolean;
  invoicingEnabled?: boolean;
  legalMentions?: string | null;
  contactEmail?: string | null;
  tvaInstallmentsEnabled?: boolean;
  bankIban?: string | null;
  bankBic?: string | null;
  websiteUrl?: string | null;
}

export async function saveActivitySettings(activity: Activity, input: ActivitySettingsInput) {
  const tenantId = await getDefaultTenantId();
  return prisma.activitySettings.upsert({
    where: { tenantId_activity: { tenantId, activity } },
    update: input,
    create: { tenantId, activity, ...input },
  });
}
