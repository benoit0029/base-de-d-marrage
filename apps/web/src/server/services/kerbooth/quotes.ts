import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { createInvoice, InvoicingError, type CreateInvoiceInput } from "@/server/services/invoices";
import { findAvailableUnits } from "@/server/services/kerbooth/dispatch";
import { isVatApplicableOn } from "@/lib/invoicing/vatPolicy";
import {
  KERBOOTH_DEPOSIT_PER_UNIT,
  QUOTE_REMINDER_DAYS,
  QUOTE_VALIDITY_DAYS,
  addDays,
  formatPeriod,
  periodDays,
} from "@/lib/kerbooth/quotes";
import type { KerboothQuote, KerboothQuotePeriod } from "@prisma/client";

// Parcours « devis entreprise » Kerbooth (D-160, validé par Benoît le
// 25/09/2026) — toujours à l'initiative de Benoît, jamais depuis le site :
//   1. Benoît crée le devis (formule libre, nombre de photobooths, une ou
//      plusieurs prestations datées, lieu, e-mail du client).
//   2. « Envoyer au client » : une réservation par photobooth et par
//      prestation bloque les unités (TO_SEND).
//   3. n8n récupère les devis à envoyer, crée UNE demande Yousign par mail
//      avec le devis et le contrat de location (+ CGV pro), puis confirme
//      l'envoi (SENT). Le devis est valable 15 jours.
//   4. Tâche quotidienne : relances Yousign à J+3 et J+10, expiration à J+15
//      (unités libérées).
//   5. Signature (webhook Yousign) : réservations confirmées, facture émise
//      (à régler par virement, RIB sur la facture), envoyée par n8n.

export class KerboothQuoteNotFoundError extends Error {}
export class KerboothQuoteStateError extends Error {}
export class KerboothQuoteInputError extends Error {}

export interface KerboothQuoteDetails {
  clientEmail: string;
  formulaLabel: string;
  photoboothCount: number;
  eventLocation: string;
  paymentTermDays: number;
  periods: Array<{ start: Date; end: Date }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function validateDetails(tenantId: string, d: KerboothQuoteDetails) {
  if (!EMAIL_RE.test(d.clientEmail.trim())) {
    throw new KerboothQuoteInputError("E-mail du client invalide : il reçoit le devis à signer.");
  }
  if (!d.formulaLabel.trim()) throw new KerboothQuoteInputError("Formule obligatoire (ex. « 1 jour », « 3 prestations »).");
  if (!d.eventLocation.trim()) throw new KerboothQuoteInputError("Lieu d'installation obligatoire (il figure au contrat).");
  if (!Number.isInteger(d.photoboothCount) || d.photoboothCount < 1) {
    throw new KerboothQuoteInputError("Nombre de photobooths invalide.");
  }
  if (!Number.isInteger(d.paymentTermDays) || d.paymentTermDays < 0 || d.paymentTermDays > 60) {
    // 60 jours : plafond légal des délais de paiement entre professionnels
    // (art. L441-10 du Code de commerce) — non vérifié sur source officielle.
    throw new KerboothQuoteInputError("Délai de paiement entre 0 et 60 jours.");
  }
  if (d.periods.length === 0) throw new KerboothQuoteInputError("Au moins une date de prestation.");
  for (const p of d.periods) {
    if (Number.isNaN(p.start.getTime()) || Number.isNaN(p.end.getTime()) || p.end < p.start) {
      throw new KerboothQuoteInputError("Dates de prestation invalides (la fin doit suivre le début).");
    }
  }
  const units = await prisma.kerboothUnit.count({ where: { tenantId, active: true } });
  if (d.photoboothCount > units) {
    throw new KerboothQuoteInputError(
      `Seulement ${units} photobooth${units > 1 ? "s" : ""} actif${units > 1 ? "s" : ""} (Réglages → Kerbooth 360° — Unités).`
    );
  }
}

/** Crée le devis (numéroté DE-K…) et sa fiche « devis entreprise ». */
export async function createKerboothQuote(invoice: Omit<CreateInvoiceInput, "activity" | "type">, details: KerboothQuoteDetails) {
  const tenantId = await getDefaultTenantId();
  // Tout est vérifié AVANT de numéroter le devis, pour ne pas consommer un
  // numéro sur une saisie incomplète.
  await validateDetails(tenantId, details);

  const devis = await createInvoice({
    ...invoice,
    clientEmail: details.clientEmail.trim(),
    activity: "BIC_PHOTOBOOTH",
    type: "DEVIS",
  });
  const quote = await prisma.kerboothQuote.create({
    data: {
      tenantId,
      quoteInvoiceId: devis.id,
      clientEmail: details.clientEmail.trim(),
      formulaLabel: details.formulaLabel.trim(),
      photoboothCount: details.photoboothCount,
      eventLocation: details.eventLocation.trim(),
      paymentTermDays: details.paymentTermDays,
      periods: {
        create: details.periods.map((p, position) => ({ start: p.start, end: p.end, position })),
      },
    },
  });
  return { devis, quote };
}

async function getQuoteOrThrow(id: string) {
  const quote = await prisma.kerboothQuote.findUnique({
    where: { id },
    include: { periods: { orderBy: { position: "asc" } } },
  });
  if (!quote) throw new KerboothQuoteNotFoundError(id);
  return quote;
}

/**
 * « Envoyer au client » : bloque une unité par photobooth et par prestation
 * (refus si le matériel n'est pas disponible), puis met le devis en file
 * d'envoi pour n8n. Validité 15 jours à partir de maintenant.
 */
export async function requestQuoteSending(id: string, now = new Date()) {
  const quote = await getQuoteOrThrow(id);
  if (quote.status !== "DRAFT") {
    throw new KerboothQuoteStateError("Ce devis a déjà été envoyé (ou annulé).");
  }
  const devis = await prisma.invoice.findUniqueOrThrow({ where: { id: quote.quoteInvoiceId } });

  return prisma.$transaction(
    async (tx) => {
      for (const period of quote.periods) {
        const units = await findAvailableUnits(quote.tenantId, period.start, period.end, quote.photoboothCount, {
          db: tx,
          strict: true,
        });
        if (units.length < quote.photoboothCount) {
          throw new KerboothQuoteStateError(
            `Pas assez de photobooths libres ${formatPeriod(period.start, period.end)} : ${units.length} sur ${quote.photoboothCount}. Change la date ou le nombre (nouveau devis).`
          );
        }
        for (const unit of units) {
          await tx.kerboothBooking.create({
            data: {
              tenantId: quote.tenantId,
              unitId: unit.id,
              quoteId: quote.id,
              clientName: devis.clientName,
              clientEmail: quote.clientEmail,
              eventDateStart: period.start,
              eventDateEnd: period.end,
              eventLocation: quote.eventLocation,
              formula: "ENTREPRISE",
              durationDays: periodDays(period.start, period.end),
              // Le montant est porté par le devis et la facture (plusieurs
              // réservations pour un seul devis) : 0 ici pour ne jamais le
              // compter deux fois.
              totalAmount: 0,
            },
          });
        }
      }
      return tx.kerboothQuote.update({
        where: { id: quote.id },
        data: {
          status: "TO_SEND",
          sendRequestedAt: now,
          sendClaimedAt: null,
          expiresAt: addDays(now, QUOTE_VALIDITY_DAYS),
        },
      });
    },
    { isolationLevel: "Serializable" }
  );
}

/** Annulation par Benoît (avant signature) : unités libérées. */
export async function cancelQuote(id: string, now = new Date()) {
  const quote = await getQuoteOrThrow(id);
  if (!["DRAFT", "TO_SEND", "SENT"].includes(quote.status)) {
    throw new KerboothQuoteStateError("Seul un devis pas encore signé peut être annulé.");
  }
  return closeQuote(quote.id, "CANCELLED", now);
}

async function closeQuote(id: string, status: "CANCELLED" | "EXPIRED", now: Date) {
  return prisma.$transaction(async (tx) => {
    await tx.kerboothBooking.updateMany({
      where: { quoteId: id, status: { not: "CANCELLED" } },
      data: { status: "CANCELLED", cancelledAt: now },
    });
    return tx.kerboothQuote.update({ where: { id }, data: { status, closedAt: now } });
  });
}

// Au-delà, un devis « pris en charge » mais jamais confirmé comme envoyé
// (n8n arrêté en cours de route) est reproposé à l'envoi suivant.
const CLAIM_TIMEOUT_MINUTES = 30;

export interface QuoteToSend {
  quoteId: string;
  number: string;
  clientName: string;
  clientEmail: string;
  // Date d'expiration de la demande Yousign (AAAA-MM-JJ).
  expirationDate: string;
  documents: { devisPdfPath: string; contractPdfPath: string };
}

/**
 * Devis en attente d'envoi, marqués « pris en charge » pour que deux
 * passages de n8n rapprochés n'envoient jamais deux fois le même devis.
 */
export async function claimQuotesToSend(now = new Date()): Promise<QuoteToSend[]> {
  const tenantId = await getDefaultTenantId();
  const staleBefore = new Date(now.getTime() - CLAIM_TIMEOUT_MINUTES * 60_000);
  const quotes = await prisma.kerboothQuote.findMany({
    where: {
      tenantId,
      status: "TO_SEND",
      expiresAt: { gt: now },
      OR: [{ sendClaimedAt: null }, { sendClaimedAt: { lt: staleBefore } }],
    },
    orderBy: { sendRequestedAt: "asc" },
  });

  const claimed: QuoteToSend[] = [];
  for (const q of quotes) {
    // Prise en charge conditionnelle : si un autre passage l'a pris entre
    // temps, count = 0 et le devis est ignoré ici.
    const { count } = await prisma.kerboothQuote.updateMany({
      where: { id: q.id, status: "TO_SEND", sendClaimedAt: q.sendClaimedAt },
      data: { sendClaimedAt: now },
    });
    if (count === 0) continue;
    const devis = await prisma.invoice.findUniqueOrThrow({ where: { id: q.quoteInvoiceId } });
    claimed.push({
      quoteId: q.id,
      number: devis.number,
      clientName: devis.clientName,
      clientEmail: q.clientEmail,
      expirationDate: q.expiresAt!.toISOString().slice(0, 10),
      documents: {
        devisPdfPath: `/api/kerbooth/quotes/${q.id}/devis-pdf`,
        contractPdfPath: `/api/kerbooth/quotes/${q.id}/contract-pdf`,
      },
    });
  }
  return claimed;
}

/** n8n confirme que la demande Yousign est partie chez le client. */
export async function markQuoteSent(
  id: string,
  input: { yousignRequestId: string; yousignSignerId?: string; sentAt: Date }
) {
  const quote = await getQuoteOrThrow(id);
  if (quote.status !== "TO_SEND") {
    throw new KerboothQuoteStateError(`Devis dans l'état ${quote.status}, pas en attente d'envoi.`);
  }
  return prisma.kerboothQuote.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: input.sentAt,
      yousignRequestId: input.yousignRequestId,
      yousignSignerId: input.yousignSignerId ?? null,
    },
  });
}

export interface QuoteSignedResult {
  alreadyProcessed: boolean;
  quoteId: string;
  devisNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  totalTtc: number;
  dueDate: string | null;
  periods: string[];
  photoboothCount: number;
  depositTotal: number;
  invoicePdfPath: string;
}

async function signedResult(quote: KerboothQuote & { periods: KerboothQuotePeriod[] }, alreadyProcessed: boolean): Promise<QuoteSignedResult> {
  const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: quote.invoiceId! } });
  const devis = await prisma.invoice.findUniqueOrThrow({ where: { id: quote.quoteInvoiceId } });
  return {
    alreadyProcessed,
    quoteId: quote.id,
    devisNumber: devis.number,
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
    clientName: invoice.clientName,
    clientEmail: quote.clientEmail,
    totalTtc: Number(invoice.totalTtc),
    dueDate: invoice.dueDate?.toLocaleDateString("fr-FR") ?? null,
    periods: quote.periods.map((p) => formatPeriod(p.start, p.end)),
    photoboothCount: quote.photoboothCount,
    depositTotal: KERBOOTH_DEPOSIT_PER_UNIT * quote.photoboothCount,
    invoicePdfPath: `/api/kerbooth/quotes/${quote.id}/invoice-pdf`,
  };
}

/**
 * Devis et contrat signés (webhook Yousign) : facture émise à la date de
 * signature, à régler par virement sous le délai prévu, réservations
 * confirmées. Rejouer le même webhook ne crée jamais une seconde facture.
 */
export async function markQuoteSigned(id: string, input: { yousignRequestId?: string; signedAt: Date }) {
  let quote = await getQuoteOrThrow(id);
  if (quote.status === "SIGNED" && quote.invoiceId) return signedResult(quote, true);
  if (quote.status !== "SENT" && quote.status !== "TO_SEND") {
    throw new KerboothQuoteStateError(
      `Devis ${quote.status === "EXPIRED" ? "expiré" : "annulé"} : signature reçue trop tard, rien n'a été facturé. Recontacte le client.`
    );
  }

  const devis = await prisma.invoice.findUniqueOrThrow({ where: { id: quote.quoteInvoiceId }, include: { lines: true } });
  // Le devis a été chiffré avec (ou sans) TVA : si le régime a changé entre
  // temps (sortie de franchise), la facture ne peut pas le reprendre tel quel.
  if (devis.vatApplicable !== (await isVatApplicableOn("BIC_PHOTOBOOTH", input.signedAt))) {
    throw new InvoicingError(
      "Le régime de TVA a changé depuis le devis : facture à refaire à la main (Kerbooth → Factures)."
    );
  }

  if (!quote.invoiceId) {
    const invoice = await createInvoice({
      activity: "BIC_PHOTOBOOTH",
      type: "FACTURE",
      clientName: devis.clientName,
      clientAddress: devis.clientAddress ?? undefined,
      clientSiren: devis.clientSiren ?? undefined,
      clientVatNumber: devis.clientVatNumber ?? undefined,
      issueDate: input.signedAt,
      dueDate: addDays(input.signedAt, quote.paymentTermDays),
      lines: devis.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        vatRate: Number(l.vatRate),
        unit: l.unit ?? undefined,
      })),
    });
    // Enregistré aussitôt : un nouvel essai après une erreur plus loin ne
    // refera pas de facture.
    await prisma.kerboothQuote.update({ where: { id }, data: { invoiceId: invoice.id } });
    quote = { ...quote, invoiceId: invoice.id };
  }

  await prisma.$transaction([
    prisma.kerboothBooking.updateMany({
      where: { quoteId: id, status: "PENDING_SIGNATURE" },
      data: {
        status: "CONFIRMED",
        contractSignedAt: input.signedAt,
        yousignRequestId: input.yousignRequestId ?? quote.yousignRequestId,
        invoiceId: quote.invoiceId,
      },
    }),
    prisma.kerboothQuote.update({
      where: { id },
      data: {
        status: "SIGNED",
        signedAt: input.signedAt,
        yousignRequestId: input.yousignRequestId ?? quote.yousignRequestId,
      },
    }),
  ]);
  return signedResult(await getQuoteOrThrow(id), false);
}

export interface QuoteDailyActions {
  reminders: Array<{ quoteId: string; number: string; which: 1 | 2; yousignRequestId: string; yousignSignerId: string | null }>;
  expired: Array<{ quoteId: string; number: string; clientName: string }>;
  yousignToCancel: Array<{ quoteId: string; yousignRequestId: string }>;
}

/**
 * Tâche quotidienne (n8n) : expire les devis non signés au bout de 15 jours
 * (unités libérées), et renvoie les relances à faire (J+3, J+10) et les
 * demandes Yousign à annuler. Chaque action n'est renvoyée qu'une fois.
 */
export async function runQuoteDailyJobs(now = new Date()): Promise<QuoteDailyActions> {
  const tenantId = await getDefaultTenantId();
  const numberOf = async (q: KerboothQuote) =>
    (await prisma.invoice.findUniqueOrThrow({ where: { id: q.quoteInvoiceId } }));

  const expired: QuoteDailyActions["expired"] = [];
  const toExpire = await prisma.kerboothQuote.findMany({
    where: { tenantId, status: { in: ["TO_SEND", "SENT"] }, expiresAt: { lte: now } },
  });
  for (const q of toExpire) {
    await closeQuote(q.id, "EXPIRED", now);
    const devis = await numberOf(q);
    expired.push({ quoteId: q.id, number: devis.number, clientName: devis.clientName });
  }

  const reminders: QuoteDailyActions["reminders"] = [];
  const sent = await prisma.kerboothQuote.findMany({
    where: { tenantId, status: "SENT", yousignRequestId: { not: null } },
  });
  for (const q of sent) {
    const field = QUOTE_REMINDER_DAYS.map((days, i) => ({ days, which: (i + 1) as 1 | 2 }))
      .reverse()
      .find(({ days }) => q.sentAt && now >= addDays(q.sentAt, days));
    if (!field) continue;
    // Seule la relance la plus récente due est faite (pas deux le même jour
    // si n8n a été arrêté plusieurs jours).
    const already = field.which === 1 ? q.reminder1SentAt || q.reminder2SentAt : q.reminder2SentAt;
    if (already) continue;
    await prisma.kerboothQuote.update({
      where: { id: q.id },
      data: field.which === 1 ? { reminder1SentAt: now } : { reminder2SentAt: now },
    });
    reminders.push({
      quoteId: q.id,
      number: (await numberOf(q)).number,
      which: field.which,
      yousignRequestId: q.yousignRequestId!,
      yousignSignerId: q.yousignSignerId,
    });
  }

  const yousignToCancel: QuoteDailyActions["yousignToCancel"] = [];
  const closed = await prisma.kerboothQuote.findMany({
    where: { tenantId, status: { in: ["EXPIRED", "CANCELLED"] }, yousignRequestId: { not: null }, yousignCancelledAt: null },
  });
  for (const q of closed) {
    await prisma.kerboothQuote.update({ where: { id: q.id }, data: { yousignCancelledAt: now } });
    yousignToCancel.push({ quoteId: q.id, yousignRequestId: q.yousignRequestId! });
  }

  return { reminders, expired, yousignToCancel };
}

export async function listKerboothQuotes() {
  const tenantId = await getDefaultTenantId();
  return prisma.kerboothQuote.findMany({
    where: { tenantId },
    include: { periods: { orderBy: { position: "asc" } }, bookings: { include: { unit: true } } },
  });
}

export async function getKerboothQuote(id: string) {
  return prisma.kerboothQuote.findUnique({
    where: { id },
    include: { periods: { orderBy: { position: "asc" } } },
  });
}
