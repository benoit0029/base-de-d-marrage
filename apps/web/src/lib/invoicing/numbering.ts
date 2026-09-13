import { prisma } from "@/server/db/client";
import type { Activity, InvoiceType } from "@prisma/client";

const activityPrefix: Record<Activity, string> = {
  BA_MARAICHAGE: "MAR",
  BIC_FRUITS_LEGUMES: "FL",
  BIC_PHOTOBOOTH: "PB",
};

/**
 * Numérotation chronologique par activité, exigée par la loi pour les
 * factures (les devis n'ont pas cette contrainte mais suivent la même
 * logique pour rester simples). Une facture est {PREFIX}-{ANNÉE}-{SÉQUENCE}
 * (ex. MAR-2026-003) et un devis {PREFIX}-DEV-{SÉQUENCE}.
 *
 * L'unicité réelle est garantie par la contrainte @unique sur Invoice.number ;
 * en cas de collision (deux créations concurrentes), l'appelant doit relancer
 * generateInvoiceNumber puis retenter l'écriture.
 */
export async function generateInvoiceNumber(
  activity: Activity,
  type: InvoiceType,
  issueDate: Date
): Promise<string> {
  const prefix = activityPrefix[activity];

  if (type === "DEVIS") {
    const pattern = `${prefix}-DEV-`;
    const count = await prisma.invoice.count({
      where: { activity, type: "DEVIS", number: { startsWith: pattern } },
    });
    return `${pattern}${String(count + 1).padStart(3, "0")}`;
  }

  const year = issueDate.getFullYear();
  const pattern = `${prefix}-${year}-`;
  const count = await prisma.invoice.count({
    where: { activity, type: "FACTURE", number: { startsWith: pattern } },
  });
  return `${pattern}${String(count + 1).padStart(3, "0")}`;
}
