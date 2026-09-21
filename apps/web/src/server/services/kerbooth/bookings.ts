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
// Paiement en une fois (revu le 20/09/2026, plus d'acompte/solde séparés).
const FORMULA_DEFAULTS: Record<"ESSENTIEL" | "POPULAIRE", { totalAmount: number; durationDays: number }> = {
  ESSENTIEL: { totalAmount: 250, durationDays: 1 },
  POPULAIRE: { totalAmount: 500, durationDays: 2 },
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
  // Adresse de livraison/installation — obligatoire, figure dans le
  // contrat (article 1, voir documents-types-kerbooth360.md §5).
  eventLocation: string;
  formula: KerboothFormula;
  // Obligatoires pour ENTREPRISE uniquement (négocié manuellement, voir
  // documents-types-kerbooth360.md §6) ; ignorés sinon.
  totalAmount?: number;
  durationDays?: number;
}

/**
 * Crée une réservation en tentant le dispatch automatique. Ne crée AUCUNE
 * ligne si aucune unité n'est disponible (NoAvailableUnitError) — c'est au
 * site/n8n d'afficher "complet à cette date" (déclencheur 2bis, voir
 * kerbooth360/architecture-technique-kerbooth360.md).
 */
export async function createBooking(input: CreateBookingInput): Promise<KerboothBooking> {
  if (!input.eventLocation.trim()) {
    throw new KerboothBookingInputError("eventLocation est obligatoire.");
  }

  const tenantId = await getDefaultTenantId();

  let totalAmount: number;
  let durationDays: number;

  if (input.formula === "ENTREPRISE") {
    if (input.totalAmount === undefined || input.durationDays === undefined) {
      throw new KerboothBookingInputError(
        "totalAmount et durationDays sont obligatoires pour la formule Entreprise."
      );
    }
    totalAmount = input.totalAmount;
    durationDays = input.durationDays;
  } else {
    const defaults = FORMULA_DEFAULTS[input.formula];
    totalAmount = defaults.totalAmount;
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
      eventLocation: input.eventLocation,
      formula: input.formula,
      durationDays,
      totalAmount,
    },
  });
}

async function getBookingOrThrow(id: string) {
  const booking = await prisma.kerboothBooking.findUnique({ where: { id } });
  if (!booking) throw new KerboothBookingNotFoundError(id);
  return booking;
}

/**
 * Contrat signé (webhook Yousign, déclencheur 5 — AVANT le paiement, voir
 * kerbooth360/architecture-decision.md point 4). Fait passer la réservation
 * en attente de paiement.
 */
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
      status: "PENDING_PAYMENT",
      yousignRequestId: input.yousignRequestId,
      contractSignedAt: input.signedAt,
    },
  });
}

/**
 * Paiement reçu (webhook Stripe, paiement direct en une fois — plus
 * d'acompte/solde séparés, voir kerbooth360/architecture-decision.md
 * point 4) : crée et marque payée la facture dans l'outil compta
 * (BIC_PHOTOBOOTH — même moteur que les 2 autres activités), confirme la
 * réservation.
 */
export async function markPaymentReceived(
  bookingId: string,
  input: { stripeCustomerId: string; paidAt: Date }
): Promise<KerboothBooking> {
  const booking = await getBookingOrThrow(bookingId);
  if (booking.status !== "PENDING_PAYMENT") {
    throw new KerboothBookingStateError(
      `Réservation dans l'état ${booking.status}, paiement déjà traité, contrat pas encore signé, ou réservation invalide.`
    );
  }

  const invoice = await createInvoice({
    activity: "BIC_PHOTOBOOTH",
    type: "FACTURE",
    clientName: booking.clientName,
    issueDate: input.paidAt,
    lines: [
      {
        description: `Location Kerbooth 360° — ${FORMULA_LABEL[booking.formula]} du ${booking.eventDateStart.toLocaleDateString("fr-FR")}`,
        quantity: 1,
        unitPrice: Number(booking.totalAmount),
        vatRate: 0,
      },
    ],
  });
  await markInvoicePaid(invoice.id, input.paidAt, null);

  return prisma.kerboothBooking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      stripeCustomerId: input.stripeCustomerId,
      invoiceId: invoice.id,
    },
  });
}

/**
 * Annulation — aucun remboursement automatique (pas de lien libre-service,
 * pas de délai de courtoisie : Benoît a tranché le 20/09/2026 pour ne pas
 * en proposer, cette prestation n'y étant de toute façon pas légalement
 * obligée, voir CGV article 5). Un remboursement éventuel reste un geste
 * manuel de Benoît, hors du périmètre de cette fonction. Libère toujours
 * l'unité : le dispatch ne regarde que les réservations CONFIRMED, une
 * réservation CANCELLED ne bloque plus rien.
 */
export async function cancelBooking(bookingId: string, now = new Date()): Promise<KerboothBooking> {
  const booking = await getBookingOrThrow(bookingId);
  if (booking.status === "CANCELLED") {
    throw new KerboothBookingStateError("Réservation déjà annulée.");
  }

  return prisma.kerboothBooking.update({
    where: { id: bookingId },
    data: { status: "CANCELLED", cancelledAt: now },
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
