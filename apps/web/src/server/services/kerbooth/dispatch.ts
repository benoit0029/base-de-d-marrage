import { prisma } from "@/server/db/client";
import type { KerboothUnit, Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient | typeof prisma;

// Dispatch automatique entre unités — voir
// kerbooth360/architecture-technique-kerbooth360.md, section "Logique de
// dispatch". Phase 1 (Benoît seul) : le choix ne porte que sur la
// disponibilité physique de chaque unité, jamais sur un agenda personnel
// (la remarque du dossier original reste vraie même à une seule personne).
//
// Deux étapes : (1) ne garder que les unités sans réservation bloquante
// chevauchant la période demandée, (2) parmi les unités libres, choisir
// celles qui ont le moins de jours cumulés sur l'année en cours — pour
// répartir l'usure du matériel.
//
// Réservation bloquante : CONFIRMED, ou réservation d'un devis entreprise
// envoyé et pas encore signé (D-160 : l'unité est bloquée dès l'envoi du
// devis, libérée s'il expire ou est annulé). Une réservation du site en
// PENDING_PAYMENT/PENDING_SIGNATURE ne bloque toujours pas une autre
// réservation du site : une réservation jamais payée/signée ne doit pas
// bloquer indéfiniment une unité.
export const blockingBookingWhere: Prisma.KerboothBookingWhereInput = {
  OR: [{ status: "CONFIRMED" }, { status: "PENDING_SIGNATURE", quoteId: { not: null } }],
};

async function isUnitFree(
  db: Db,
  unitId: string,
  eventDateStart: Date,
  eventDateEnd: Date,
  strict: boolean
): Promise<boolean> {
  const overlapping = await db.kerboothBooking.findFirst({
    where: {
      unitId,
      eventDateStart: { lte: eventDateEnd },
      eventDateEnd: { gte: eventDateStart },
      // strict (devis entreprise) : évite aussi une unité dont un client du
      // site a signé le contrat et est en train de payer.
      OR: strict
        ? [...(blockingBookingWhere.OR ?? []), { status: "PENDING_PAYMENT" }]
        : blockingBookingWhere.OR,
    },
    select: { id: true },
  });
  return !overlapping;
}

/**
 * Jusqu'à `count` unités libres sur la période, les moins utilisées de
 * l'année d'abord. Renvoie moins de `count` unités s'il n'y en a pas assez.
 */
export async function findAvailableUnits(
  tenantId: string,
  eventDateStart: Date,
  eventDateEnd: Date,
  count: number,
  options: { db?: Db; strict?: boolean; excludeUnitIds?: string[] } = {}
): Promise<KerboothUnit[]> {
  const db = options.db ?? prisma;
  const units = await db.kerboothUnit.findMany({
    where: { tenantId, active: true, id: { notIn: options.excludeUnitIds ?? [] } },
  });

  const availableUnits: KerboothUnit[] = [];
  for (const unit of units) {
    if (await isUnitFree(db, unit.id, eventDateStart, eventDateEnd, options.strict ?? false)) {
      availableUnits.push(unit);
    }
  }
  if (availableUnits.length <= 1) return availableUnits.slice(0, count);

  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const withCumulatedDays = await Promise.all(
    availableUnits.map(async (unit) => {
      const bookings = await db.kerboothBooking.findMany({
        where: { unitId: unit.id, status: "CONFIRMED", eventDateStart: { gte: yearStart } },
        select: { durationDays: true },
      });
      const days = bookings.reduce((sum, b) => sum + b.durationDays, 0);
      return { unit, days };
    })
  );

  withCumulatedDays.sort((a, b) => a.days - b.days);
  return withCumulatedDays.slice(0, count).map((u) => u.unit);
}

export async function findAvailableUnit(
  tenantId: string,
  eventDateStart: Date,
  eventDateEnd: Date
): Promise<KerboothUnit | null> {
  const [unit] = await findAvailableUnits(tenantId, eventDateStart, eventDateEnd, 1);
  return unit ?? null;
}
