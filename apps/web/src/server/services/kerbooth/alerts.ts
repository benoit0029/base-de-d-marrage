import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";

// Taux de cotisations sociales 2026 pour une prestation de service BIC
// (location de biens meubles) — voir kerbooth360/business-photobooth-360.md.
const KERBOOTH_COTISATION_RATE = 0.212;

/**
 * Rappel de déclaration URSSAF (Kerbooth 360°, taux 21,2 % — déclaré
 * séparément du taux maraîchage/fruits, voir
 * kerbooth360/feuille-de-route-photobooth-360.md). Calcule le CA encaissé
 * du mois précédent à partir des factures BIC_PHOTOBOOTH déjà enregistrées
 * — aucune télétransmission possible (pas d'API URSSAF publique), ce
 * rappel donne juste le montant à déclarer soi-même sur
 * autoentrepreneur.urssaf.fr.
 */
export async function computeUrssafReminder(referenceDate = new Date()) {
  const periodStart = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
  const periodEnd = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 0, 23, 59, 59);

  const tenantId = await getDefaultTenantId();
  const result = await prisma.invoice.aggregate({
    where: {
      tenantId,
      activity: "BIC_PHOTOBOOTH",
      type: { in: ["FACTURE", "AVOIR"] }, // avoir remboursé : montants négatifs, à sa date de remboursement
      status: { in: ["SENT", "PAID"] },
      paidAt: { gte: periodStart, lte: periodEnd },
    },
    _sum: { totalTtc: true },
  });

  const caEncaisse = Number(result._sum.totalTtc ?? 0);
  const cotisationsDues = Math.round(caEncaisse * KERBOOTH_COTISATION_RATE * 100) / 100;

  return {
    periodLabel: periodStart.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    caEncaisse,
    cotisationsDues,
    tauxCotisation: KERBOOTH_COTISATION_RATE,
  };
}
