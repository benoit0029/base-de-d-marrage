import { computeBaThreshold, computeBicThresholds } from "@/lib/thresholds";
import { sumInvoicedTotal, sumCashJournalTotal, sumDepensesTotal, currentYearRange } from "@/lib/thresholds";
import { renderClosingReportPdf } from "@/lib/pdf/render";
import type { Activity } from "@prisma/client";

const activityLabels: Record<Activity, string> = {
  BA_MARAICHAGE: "Maraîchage",
  BIC_FRUITS_LEGUMES: "Revente Fruits/Légumes",
  BIC_PHOTOBOOTH: "Kerbooth 360",
};

// Recettes encaissées (comptabilité de caisse, voir lib/thresholds) : facture
// (Invoice.paidAt) pour les activités facturantes, journal de caisse
// (CashJournalEntry) pour la vente directe — jamais Entry.type=RECETTE, qui
// n'est produit par aucun flux de saisie (voir docs/ARCHITECTURE.md).
async function sumRecettesTotal(activity: Activity, yearStart: Date, yearEnd: Date): Promise<number> {
  if (activity === "BIC_PHOTOBOOTH") {
    return sumInvoicedTotal(activity, yearStart, yearEnd);
  }
  if (activity === "BIC_FRUITS_LEGUMES") {
    return sumCashJournalTotal(activity, yearStart, yearEnd);
  }
  const [invoiced, cashJournal] = await Promise.all([
    sumInvoicedTotal(activity, yearStart, yearEnd),
    sumCashJournalTotal(activity, yearStart, yearEnd),
  ]);
  return invoiced + cashJournal;
}

export async function generateClosingReportPdf(year = new Date().getFullYear()): Promise<Buffer> {
  const { start: yearStart, end: yearEnd } = currentYearRange(year);
  const allActivities: Activity[] = ["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"];

  const activities = await Promise.all(
    allActivities.map(async (activity) => ({
      label: activityLabels[activity],
      recettesHt: await sumRecettesTotal(activity, yearStart, yearEnd),
      achatsHt: await sumDepensesTotal(activity, yearStart, yearEnd),
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
