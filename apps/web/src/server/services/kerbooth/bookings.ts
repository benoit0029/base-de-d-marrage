import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { findAvailableUnit } from "@/server/services/kerbooth/dispatch";
import { createInvoice, markInvoicePaid } from "@/server/services/invoices";
import type { KerboothBooking, KerboothFormula } from "@prisma/client";

export class NoAvailableUnitError extends Error {}
export class KerboothBookingNotFoundError extends Error {}
export class KerboothBookingStateError extends Error {}
export class KerboothBookingInputError extends Error {}

// Formules à prix fixe (voir kerbooth360/grille-tarifaire-kerbooth360.md) —
// Entreprise reste négociée manuellement, montants fournis explicitement.
const FORMULA_DEFAULTS: Record<
  "ESSENTIEL" | "POPULAIRE",
  { totalAmount: number; acompteAmount: number; durationDays: number }
> = {
  ESSENTIEL: { totalAmount: 250, acompteAmount: 100, durationDays: 1 },
  POPULAIRE: { totalAmount: 500, acompteAmount: 200, durationDays: 2 },
};

const FORMULA_LABEL: Record<KerboothFormula, string> = {
  ESSENTIEL: "Essentiel (1 jour)",
  POPULAIRE: "Populaire (weekend)",
  ENTREPRISE: "Entreprise",
};

export interface CreateBookingInput {
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  eventDateStart: Date;
  eventDateEnd: Date;
  formula: KerboothFormula;
  // Obligatoires pour ENTREPRISE uniquement (négocié manuellement, voir
  // documents-types-kerbooth360.md §6) ; ignorés sinon.
  totalAmount?: number;
  acompteAmount?: number;
  durationDays?: number;
}

/**
 * Crée une réservation en tentant le dispatch automatique. Ne crée AUCUNE
 * ligne si aucune unité n'est disponible (NoAvailableUnitError) — c'est au
 * site/n8n d'afficher "complet à cette date" (déclencheur 2bis, voir
 * kerbooth360/architecture-technique-kerbooth360.md).
 */
export async function createBooking(input: CreateBookingInput): Promise<KerboothBooking> {
  const tenantId = await getDefaultTenantId();

  let totalAmount: number;
  let acompteAmount: number;
  let durationDays: number;

  if (input.formula === "ENTREPRISE") {
    if (input.totalAmount === undefined || input.acompteAmount === undefined || input.durationDays === undefined) {
      throw new KerboothBookingInputError(
        "totalAmount, acompteAmount et durationDays sont obligatoires pour la formule Entreprise."
      );
    }
    totalAmount = input.totalAmount;
    acompteAmount = input.acompteAmount;
    durationDays = input.durationDays;
  } else {
    const defaults = FORMULA_DEFAULTS[input.formula];
    totalAmount = defaults.totalAmount;
    acompteAmount = defaults.acompteAmount;
    durationDays = defaults.durationDays;
  }

  const unit = await findAvailableUnit(tenantId, input.eventDateStart, input.eventDateEnd);
  if (!unit) {
    throw new NoAvailableUnitError("Aucune unité disponible sur cette période.");
  }

  return prisma.kerboothBooking.create({
    data: {
      tenantId,
      unitId: unit.id,
      clientName: input.clientName,
      clientEmail: input.clientEmail,
      clientPhone: input.clientPhone,
      eventDateStart: input.eventDateStart,
      eventDateEnd: input.eventDateEnd,
      formula: input.formula,
      durationDays,
      acompteAmount,
      soldeAmount: totalAmount - acompteAmount,
    },
  });
}

async function getBookingOrThrow(id: string) {
  const booking = await prisma.kerboothBooking.findUnique({ where: { id } });
  if (!booking) throw new KerboothBookingNotFoundError(id);
  return booking;
}

/**
 * Acompte réglé (webhook Stripe, déclencheur 4) : crée et marque payée la
 * facture d'acompte dans l'outil compta (BIC_PHOTOBOOTH — même moteur que
 * les 2 autres activités, voir kerbooth360/architecture-decision.md), fait
 * passer la réservation en attente de signature.
 */
export async function markAcomptePaid(
  bookingId: string,
  input: { stripeCustomerId: string; paidAt: Date }
): Promise<KerboothBooking> {
  const booking = await getBookingOrThrow(bookingId);
  if (booking.status !== "PENDING_PAYMENT") {
    throw new KerboothBookingStateError(
      `Réservation dans l'état ${booking.status}, acompte déjà traité ou réservation invalide.`
    );
  }

  const invoice = await createInvoice({
    activity: "BIC_PHOTOBOOTH",
    type: "FACTURE",
    clientName: booking.clientName,
    issueDate: input.paidAt,
    lines: [
      {
        description: `Acompte réservation Kerbooth 360° — ${FORMULA_LABEL[booking.formula]} du ${booking.eventDateStart.toLocaleDateString("fr-FR")}`,
        quantity: 1,
        unitPrice: Number(booking.acompteAmount),
        vatRate: 0,
      },
    ],
  });
  await markInvoicePaid(invoice.id, input.paidAt, null);

  return prisma.kerboothBooking.update({
    where: { id: bookingId },
    data: {
      status: "PENDING_SIGNATURE",
      stripeCustomerId: input.stripeCustomerId,
      invoiceAcompteId: invoice.id,
    },
  });
}

/** Contrat signé (webhook Yousign, déclencheur 5) : réservation ferme. */
export async function confirmContractSigned(
  bookingId: string,
  input: { yousignRequestId: string; signedAt: Date }
): Promise<KerboothBooking> {
  const booking = await getBookingOrThrow(bookingId);
  if (booking.status !== "PENDING_SIGNATURE") {
    throw new KerboothBookingStateError(
      `Réservation dans l'état ${booking.status}, pas en attente de signature.`
    );
  }

  return prisma.kerboothBooking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      yousignRequestId: input.yousignRequestId,
      contractSignedAt: input.signedAt,
    },
  });
}

/**
 * Solde réglé (webhook Stripe J+1, déclencheur 9) : crée et marque payée la
 * facture de solde, termine la réservation.
 */
export async function markSoldePaid(bookingId: string, paidAt: Date): Promise<KerboothBooking> {
  const booking = await getBookingOrThrow(bookingId);
  if (booking.status !== "CONFIRMED") {
    throw new KerboothBookingStateError(
      `Réservation dans l'état ${booking.status}, pas confirmée — solde inattendu.`
    );
  }

  const invoice = await createInvoice({
    activity: "BIC_PHOTOBOOTH",
    type: "FACTURE",
    clientName: booking.clientName,
    issueDate: paidAt,
    lines: [
      {
        description: `Solde réservation Kerbooth 360° — ${FORMULA_LABEL[booking.formula]} du ${booking.eventDateStart.toLocaleDateString("fr-FR")}`,
        quantity: 1,
        unitPrice: Number(booking.soldeAmount),
        vatRate: 0,
      },
    ],
  });
  await markInvoicePaid(invoice.id, paidAt, null);

  return prisma.kerboothBooking.update({
    where: { id: bookingId },
    data: { status: "COMPLETED", invoiceSoldeId: invoice.id },
  });
}

/**
 * Annulation — jamais de remboursement de l'acompte (CGV article 5, voir
 * kerbooth360/documents/documents-types-kerbooth360.md). Libère
 * implicitement l'unité : le dispatch ne regarde que les réservations
 * CONFIRMED, une réservation CANCELLED ne bloque plus rien.
 */
export async function cancelBooking(bookingId: string, cancelledAt = new Date()): Promise<KerboothBooking> {
  const booking = await getBookingOrThrow(bookingId);
  if (booking.status === "CANCELLED" || booking.status === "COMPLETED") {
    throw new KerboothBookingStateError(`Réservation déjà ${booking.status.toLowerCase()}, annulation impossible.`);
  }

  return prisma.kerboothBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt },
  });
}

export async function getBooking(id: string) {
  return prisma.kerboothBooking.findUnique({ where: { id }, include: { unit: true } });
}

export async function listBookings() {
  const tenantId = await getDefaultTenantId();
  return prisma.kerboothBooking.findMany({
    where: { tenantId },
    include: { unit: true },
    orderBy: { eventDateStart: "desc" },
  });
}
