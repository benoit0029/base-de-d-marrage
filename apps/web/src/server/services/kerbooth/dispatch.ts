import { prisma } from "@/server/db/client";
import type { KerboothUnit } from "@prisma/client";

// Dispatch automatique entre unités — voir
// kerbooth360/architecture-technique-kerbooth360.md, section "Logique de
// dispatch". Phase 1 (Benoît seul) : le choix ne porte que sur la
// disponibilité physique de chaque unité, jamais sur un agenda personnel
// (la remarque du dossier original reste vraie même à une seule personne).
//
// Deux étapes : (1) ne garder que les unités sans réservation CONFIRMED
// chevauchant la période demandée, (2) parmi les unités libres, choisir
// celle qui a le moins de jours cumulés sur l'année en cours — pour répartir
// l'usure du matériel. Une réservation PENDING_PAYMENT/PENDING_SIGNATURE
// n'empêche jamais une autre réservation d'utiliser la même unité tant
// qu'elle n'est pas confirmée : cohérent avec le fait qu'une réservation
// jamais payée/signée ne doit pas bloquer indéfiniment une unité.
export async function findAvailableUnit(
  tenantId: string,
  eventDateStart: Date,
  eventDateEnd: Date
): Promise<KerboothUnit | null> {
  const units = await prisma.kerboothUnit.findMany({ where: { tenantId, active: true } });

  const availableUnits: KerboothUnit[] = [];
  for (const unit of units) {
    const overlapping = await prisma.kerboothBooking.findFirst({
      where: {
        unitId: unit.id,
        status: "CONFIRMED",
        eventDateStart: { lte: eventDateEnd },
        eventDateEnd: { gte: eventDateStart },
      },
      select: { id: true },
    });
    if (!overlapping) availableUnits.push(unit);
  }

  if (availableUnits.length === 0) return null;
  if (availableUnits.length === 1) return availableUnits[0];

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const withCumulatedDays = await Promise.all(
    availableUnits.map(async (unit) => {
      const bookings = await prisma.kerboothBooking.findMany({
        where: { unitId: unit.id, status: "CONFIRMED", eventDateStart: { gte: yearStart } },
        select: { durationDays: true },
      });
      const days = bookings.reduce((sum, b) => sum + b.durationDays, 0);
      return { unit, days };
    })
  );

  withCumulatedDays.sort((a, b) => a.days - b.days);
  return withCumulatedDays[0].unit;
}
