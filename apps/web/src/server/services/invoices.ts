import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { nextInvoiceNumber, seriesOf } from "@/lib/invoicing/numbering";
import { isVatApplicableOn } from "@/lib/invoicing/vatPolicy";
import { upsertClient } from "@/server/services/clients";
import { ensureProduct } from "@/server/services/products";
import type { Activity, InvoiceType } from "@prisma/client";

export async function listInvoices(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.invoice.findMany({
    where: { tenantId, activity },
    orderBy: { issueDate: "desc" },
  });
}

export async function getInvoiceWithLines(id: string) {
  return prisma.invoice.findUnique({ where: { id }, include: { lines: true, creditedInvoice: true } });
}

export class InvoiceNotFoundError extends Error {}
export class InvoiceAlreadyPaidError extends Error {}
export class InvoiceNothingToRefundError extends Error {}

/**
 * Renseigne manuellement la date d'encaissement d'une facture (comptabilité
 * de caisse — voir BOI-BA-BASE-20-10) : tant que cette date n'est pas
 * connue, la facture n'est qu'une créance en cours, hors CA/TVA/seuils.
 * Se pose aussi automatiquement au rapprochement bancaire, voir
 * reconcileBankTransaction — cette fonction sert au cas où le paiement est
 * connu avant tout import de relevé.
 */
export async function markInvoicePaid(id: string, paidAt: Date, userId: string | null) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include: { creditedInvoice: true } });
  if (!invoice) throw new InvoiceNotFoundError(id);
  if (invoice.paidAt) throw new InvoiceAlreadyPaidError(id);
  // Avoir : « payé » = remboursé ; rien à rembourser si la facture annulée
  // n'avait jamais été encaissée.
  if (invoice.type === "AVOIR" && !invoice.creditedInvoice?.paidAt) {
    throw new InvoiceNothingToRefundError(id);
  }

  const [updated] = await prisma.$transaction([
    prisma.invoice.update({ where: { id }, data: { paidAt, status: "PAID" } }),
    prisma.auditLog.create({
      data: {
        tenantId: invoice.tenantId,
        userId,
        action: "INVOICE_MARKED_PAID",
        entityType: "Invoice",
        entityId: id,
        before: JSON.parse(JSON.stringify({ ...invoice, creditedInvoice: undefined })),
        after: Prisma.JsonNull,
      },
    }),
  ]);
  return updated;
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  unit?: string;
  // Montant TTC déjà encaissé pour cette ligne (ex. paiement Stripe Kerbooth) :
  // si fourni et que la TVA s'applique, HT = TTC / (1 + taux) arrondi et
  // TVA = TTC − HT, pour que la facture retombe au centime près sur
  // l'encaissement (unitPrice est alors ignoré). Sans TVA, TTC = HT.
  paidTtc?: number;
}

export interface CreateInvoiceInput {
  activity: Activity;
  type: InvoiceType;
  clientName: string;
  clientAddress?: string;
  issueDate: Date;
  dueDate?: Date;
  lines: InvoiceLineInput[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export class InvoicingError extends Error {}

/**
 * Crée une facture ou un devis avec numérotation automatique. La TVA est
 * appliquée au maraîchage, et aux activités micro-BIC seulement à partir de
 * leur date de sortie de franchise confirmée (voir lib/invoicing/vatPolicy),
 * appréciée à la date de la facture : sous franchise, tout taux de TVA
 * soumis par erreur est ignoré (forcé à 0) plutôt que fait confiance côté
 * client, pour ne jamais émettre une facture non conforme.
 */
export async function createInvoice(input: CreateInvoiceInput) {
  if (input.lines.length === 0) {
    throw new InvoicingError("Une facture ou un devis doit contenir au moins une ligne.");
  }

  const tenantId = await getDefaultTenantId();
  const vatApplicable = await isVatApplicableOn(input.activity, input.issueDate);

  const lines = input.lines.map(({ paidTtc, ...line }) => {
    const vatRate = vatApplicable ? line.vatRate : 0;
    if (paidTtc !== undefined) {
      const lineTotal = round2(paidTtc / (1 + vatRate / 100));
      const lineVat = round2(paidTtc - lineTotal);
      return { ...line, unitPrice: round2(lineTotal / line.quantity), vatRate, lineTotal, lineVat };
    }
    const lineTotal = round2(line.quantity * line.unitPrice);
    const lineVat = round2(lineTotal * (vatRate / 100));
    return { ...line, vatRate, lineTotal, lineVat };
  });

  const totalHt = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const totalVat = round2(lines.reduce((sum, l) => sum + l.lineVat, 0));
  const totalTtc = round2(totalHt + totalVat);

  // Répertoire Clients / Catalogue Produits : alimentés automatiquement,
  // jamais un pré-requis bloquant — un échec ici ne doit jamais empêcher la
  // création de la facture elle-même.
  try {
    await upsertClient(input.activity, { name: input.clientName, address: input.clientAddress });
    await Promise.all(
      lines.map((l) =>
        ensureProduct(input.activity, {
          label: l.description,
          defaultUnitPrice: l.unitPrice,
          vatRate: l.vatRate,
          unit: l.unit,
        })
      )
    );
  } catch {
    // Non bloquant, voir commentaire ci-dessus.
  }

  return prisma.$transaction(async (tx) => {
    if (input.type !== "DEVIS") {
      await assertChronological(tx, tenantId, input.activity, input.type, input.issueDate);
    }
    const { series, number } = await nextInvoiceNumber(tx, tenantId, input.activity, input.type, input.issueDate);
    return tx.invoice.create({
      data: {
        tenantId,
        activity: input.activity,
        type: input.type,
        series,
        number,
        clientName: input.clientName,
        clientAddress: input.clientAddress,
        issueDate: input.issueDate,
        dueDate: input.dueDate,
        status: input.type === "DEVIS" ? "DRAFT" : "SENT",
        vatApplicable,
        totalHt,
        totalVat,
        totalTtc,
        lines: {
          create: lines.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            vatRate: l.vatRate,
            lineTotal: l.lineTotal,
            unit: l.unit || null,
          })),
        },
      },
      include: { lines: true },
    });
  });
}

const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Numérotation chronologique : une facture (ou un avoir) ne peut pas être
 * datée avant la dernière de la même suite, sinon les numéros ne suivraient
 * plus l'ordre des dates.
 */
async function assertChronological(
  tx: Prisma.TransactionClient,
  tenantId: string,
  activity: Activity,
  type: InvoiceType,
  issueDate: Date
) {
  const last = await tx.invoice.findFirst({
    where: { tenantId, series: seriesOf(activity), type },
    orderBy: { issueDate: "desc" },
    select: { number: true, issueDate: true },
  });
  if (last && dayOf(issueDate) < dayOf(last.issueDate)) {
    throw new InvoicingError(
      `Date antérieure à ${type === "AVOIR" ? "l'avoir" : "la facture"} ${last.number} du ${last.issueDate.toLocaleDateString("fr-FR")} : la numérotation doit suivre l'ordre des dates. Choisis une date à partir du ${last.issueDate.toLocaleDateString("fr-FR")}.`
    );
  }
}

export class CreditNoteError extends Error {}

/**
 * Annule une facture par une FACTURE D'AVOIR (une facture émise n'est
 * jamais modifiée ni supprimée) : avoir total, mêmes lignes en négatif,
 * numéroté dans sa propre suite (AV-M2026-001 ou AV-K2026-001…), à une date qui respecte
 * l'ordre chronologique. Effet comptable (comptabilité de caisse) :
 * - facture pas encore encaissée → elle passe « annulée », l'avoir n'a aucun
 *   effet sur le chiffre d'affaires ;
 * - facture déjà encaissée → elle reste encaissée ; l'avoir compte en
 *   négatif (CA, TVA, livres) à la date du remboursement, renseignée par
 *   « Marquer remboursé » (même mécanisme que « Marquer encaissée »).
 */
export async function createCreditNote(invoiceId: string, issueDate: Date, userId: string | null) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { lines: true, creditNote: true },
  });
  if (!invoice) throw new InvoiceNotFoundError(invoiceId);
  if (invoice.type !== "FACTURE") throw new CreditNoteError("Seule une facture peut être annulée par un avoir.");
  if (invoice.creditNote) throw new CreditNoteError(`Facture déjà annulée par l'avoir ${invoice.creditNote.number}.`);
  if (invoice.status === "CANCELLED") throw new CreditNoteError("Facture déjà annulée.");
  if (dayOf(issueDate) < dayOf(invoice.issueDate)) {
    throw new CreditNoteError("L'avoir ne peut pas être daté avant la facture qu'il annule.");
  }

  const neg = (v: Prisma.Decimal | number) => -Number(v);
  return prisma.$transaction(async (tx) => {
    await assertChronological(tx, invoice.tenantId, invoice.activity, "AVOIR", issueDate);
    const { series, number } = await nextInvoiceNumber(tx, invoice.tenantId, invoice.activity, "AVOIR", issueDate);
    const creditNote = await tx.invoice.create({
      data: {
        tenantId: invoice.tenantId,
        activity: invoice.activity,
        type: "AVOIR",
        series,
        number,
        clientName: invoice.clientName,
        clientAddress: invoice.clientAddress,
        issueDate,
        status: "SENT",
        vatApplicable: invoice.vatApplicable,
        totalHt: neg(invoice.totalHt),
        totalVat: neg(invoice.totalVat),
        totalTtc: neg(invoice.totalTtc),
        creditedInvoiceId: invoice.id,
        lines: {
          create: invoice.lines.map((l) => ({
            description: l.description,
            quantity: neg(l.quantity),
            unitPrice: l.unitPrice,
            vatRate: l.vatRate,
            lineTotal: neg(l.lineTotal),
            unit: l.unit,
          })),
        },
      },
    });
    if (!invoice.paidAt) {
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: "CANCELLED" } });
    }
    await tx.auditLog.create({
      data: {
        tenantId: invoice.tenantId,
        userId,
        action: "INVOICE_CREDITED",
        entityType: "Invoice",
        entityId: invoice.id,
        before: JSON.parse(JSON.stringify({ ...invoice, lines: undefined, creditNote: undefined })),
        after: { creditNoteId: creditNote.id, creditNoteNumber: number },
      },
    });
    return creditNote;
  });
}
