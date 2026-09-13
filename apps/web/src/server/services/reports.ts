import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { computeBaThreshold, computeBicThresholds } from "@/lib/thresholds";
import { renderClosingReportPdf } from "@/lib/pdf/render";
import type { Activity } from "@prisma/client";

const activityLabels: Record<Activity, string> = {
  BA_MARAICHAGE: "Maraîchage",
  BIC_FRUITS_LEGUMES: "Revente Fruits/Légumes",
  BIC_PHOTOBOOTH: "Kerbooth 360",
};

async function sumValidated(activity: Activity, type: "RECETTE" | "ACHAT", yearStart: Date, yearEnd: Date) {
  const tenantId = await getDefaultTenantId();
  const result = await prisma.entry.aggregate({
    where: { tenantId, activity, type, status: "VALIDATED", date: { gte: yearStart, lte: yearEnd } },
    _sum: { amountHt: true },
  });
  return Number(result._sum.amountHt ?? 0);
}

export async function generateClosingReportPdf(year = new Date().getFullYear()): Promise<Buffer> {
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const allActivities: Activity[] = ["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"];

  const activities = await Promise.all(
    allActivities.map(async (activity) => ({
      label: activityLabels[activity],
      recettesHt: await sumValidated(activity, "RECETTE", yearStart, yearEnd),
      achatsHt: await sumValidated(activity, "ACHAT", yearStart, yearEnd),
    }))
  );

  const [bic, ba] = await Promise.all([computeBicThresholds(year), computeBaThreshold(year)]);
  const thresholds = [bic.franchiseVente, bic.franchiseService, bic.plafondGlobalMixte, ba.check].map(
    (t) => ({ label: t.label, caCumule: t.caCumule, seuil: t.seuil, level: t.level })
  );

  return renderClosingReportPdf({
    year,
    generatedAt: new Date().toLocaleDateString("fr-FR"),
    activities,
    thresholds,
  });
}
