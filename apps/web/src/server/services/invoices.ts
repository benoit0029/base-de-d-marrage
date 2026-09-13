import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { generateInvoiceNumber } from "@/lib/invoicing/numbering";
import { isVatApplicable } from "@/lib/invoicing/vatPolicy";
import type { Activity, InvoiceType } from "@prisma/client";

export async function listInvoices(activity: Activity) {
  const tenantId = await getDefaultTenantId();
  return prisma.invoice.findMany({
    where: { tenantId, activity },
    orderBy: { issueDate: "desc" },
  });
}

export async function getInvoiceWithLines(id: string) {
  return prisma.invoice.findUnique({ where: { id }, include: { lines: true } });
}

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
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
 * appliquée uniquement pour le maraîchage (voir lib/invoicing/vatPolicy) :
 * pour les deux activités micro-BIC sous franchise en base, tout taux de TVA
 * soumis par erreur est ignoré (forcé à 0) plutôt que fait confiance côté
 * client, pour ne jamais émettre une facture non conforme.
 */
export async function createInvoice(input: CreateInvoiceInput) {
  if (input.lines.length === 0) {
    throw new InvoicingError("Une facture ou un devis doit contenir au moins une ligne.");
  }

  const tenantId = await getDefaultTenantId();
  const vatApplicable = isVatApplicable(input.activity);

  const lines = input.lines.map((line) => {
    const vatRate = vatApplicable ? line.vatRate : 0;
    const lineTotal = round2(line.quantity * line.unitPrice);
    const lineVat = round2(lineTotal * (vatRate / 100));
    return { ...line, vatRate, lineTotal, lineVat };
  });

  const totalHt = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const totalVat = round2(lines.reduce((sum, l) => sum + l.lineVat, 0));
  const totalTtc = round2(totalHt + totalVat);

  // Une collision de numéro (créations concurrentes) est extrêmement
  // improbable en v1 (utilisateur unique) ; on retente une fois par sécurité.
  for (let attempt = 0; attempt < 2; attempt++) {
    const number = await generateInvoiceNumber(input.activity, input.type, input.issueDate);
    try {
      return await prisma.invoice.create({
        data: {
          tenantId,
          activity: input.activity,
          type: input.type,
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
            })),
          },
        },
        include: { lines: true },
      });
    } catch (err) {
      const isUniqueConflict =
        typeof err === "object" && err !== null && "code" in err && err.code === "P2002";
      if (isUniqueConflict && attempt === 0) continue;
      throw err;
    }
  }
  throw new InvoicingError("Impossible de générer un numéro de facture unique.");
}
