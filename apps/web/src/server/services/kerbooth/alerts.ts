import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { alreadyNotifiedIds } from "@/server/services/alerts";

// Taux de cotisations sociales 2026 pour une prestation de service BIC
// (location de biens meubles) — voir kerbooth360/business-photobooth-360.md.
const KERBOOTH_COTISATION_RATE = 0.212;

/**
 * Échec de prélèvement du solde (déclencheur 9bis) : une réservation
 * confirmée dont l'événement est terminé mais dont le solde n'a toujours
 * pas été encaissé (pas de facture de solde) plus de 2 jours après la fin
 * — le webhook Stripe J+1 aurait dû le régler entre-temps.
 *
 * Deux paliers, comme dans le dossier Kerbooth original : une relance
 * simple à partir de J+2, une alerte manuelle prioritaire à partir de J+5
 * (la caution reste la garantie de dernier recours, voir CGV article 5bis).
 * Déduplication réutilisée telle quelle (voir server/services/alerts.ts) :
 * ce module tournant une fois par jour, chaque palier ne notifie qu'une
 * fois par 24h — pas de spam, mais l'alerte prioritaire se répète chaque
 * jour tant que le solde n'est pas réglé.
 */
export async function checkSoldeOverdue() {
  const tenantId = await getDefaultTenantId();
  const now = new Date();

  const overdueBookings = await prisma.kerboothBooking.findMany({
    where: { tenantId, status: "CONFIRMED", eventDateEnd: { lt: now } },
    include: { unit: true },
  });

  const results: Array<{
    bookingId: string;
    clientName: string;
    clientEmail: string | null;
    unitLabel: string | null;
    soldeAmount: number;
    daysOverdue: number;
    priority: "relance" | "alerte_prioritaire";
  }> = [];

  for (const booking of overdueBookings) {
    const daysOverdue = Math.floor((now.getTime() - booking.eventDateEnd.getTime()) / (24 * 60 * 60 * 1000));
    if (daysOverdue < 2) continue; // le webhook Stripe J+1 a normalement le temps de passer

    const type = daysOverdue < 5 ? "KERBOOTH_SOLDE_OVERDUE_RELANCE" : "KERBOOTH_SOLDE_OVERDUE_PRIORITY";
    const priority = daysOverdue < 5 ? "relance" : "alerte_prioritaire";

    const notified = await alreadyNotifiedIds(type, tenantId);
    if (notified.has(booking.id)) continue;

    await prisma.notificationLog.create({
      data: { tenantId, channel: "N8N", type, payload: { entityId: booking.id, daysOverdue } },
    });

    results.push({
      bookingId: booking.id,
      clientName: booking.clientName,
      clientEmail: booking.clientEmail,
      unitLabel: booking.unit?.label ?? null,
      soldeAmount: Number(booking.soldeAmount),
      daysOverdue,
      priority,
    });
  }

  return results;
}

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
      type: "FACTURE",
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
