import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { sendInvoiceToAbby, testAbbyConnection } from "@/lib/pa/abby";

export async function getPaConnection() {
  const tenantId = await getDefaultTenantId();
  return prisma.paConnection.findUnique({ where: { tenantId } });
}

/**
 * Enregistre la clé API et teste la connexion immédiatement (même logique
 * que les boîtes mail : pas de secret validé "à l'aveugle").
 */
export async function saveAndTestPaConnection(apiKey: string) {
  const tenantId = await getDefaultTenantId();
  const result = await testAbbyConnection(apiKey);

  return prisma.paConnection.upsert({
    where: { tenantId },
    update: {
      apiKeyEncrypted: encryptSecret(apiKey),
      status: result.ok ? "CONNECTED" : "ERROR",
      connectedAt: result.ok ? new Date() : null,
    },
    create: {
      tenantId,
      provider: "ABBY",
      apiKeyEncrypted: encryptSecret(apiKey),
      status: result.ok ? "CONNECTED" : "ERROR",
      connectedAt: result.ok ? new Date() : null,
    },
  });
}

export class PaNotConnectedError extends Error {}
export class InvoiceNotFoundError extends Error {}

/**
 * Transmet une facture/devis existant à la PA. L'outil ne fait jamais
 * transiter la facture électronique lui-même : il prépare les données et
 * appelle l'API de la PA, qui est responsable de l'émission conforme.
 */
export async function sendInvoiceToPa(invoiceId: string) {
  const tenantId = await getDefaultTenantId();
  const [connection, invoice] = await Promise.all([
    prisma.paConnection.findUnique({ where: { tenantId } }),
    prisma.invoice.findUnique({ where: { id: invoiceId }, include: { lines: true } }),
  ]);

  if (!connection || connection.status !== "CONNECTED") {
    throw new PaNotConnectedError("Aucune connexion PA active. Configurez-la dans Réglages.");
  }
  if (!invoice) {
    throw new InvoiceNotFoundError(invoiceId);
  }

  const apiKey = decryptSecret(connection.apiKeyEncrypted);
  const result = await sendInvoiceToAbby(apiKey, {
    number: invoice.number,
    type: invoice.type === "DEVIS" ? "quote" : "invoice",
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate?.toISOString().slice(0, 10),
    client: { name: invoice.clientName, address: invoice.clientAddress ?? undefined },
    lines: invoice.lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      vatRate: Number(l.vatRate),
    })),
    totalHt: Number(invoice.totalHt),
    totalVat: Number(invoice.totalVat),
    totalTtc: Number(invoice.totalTtc),
    vatApplicable: invoice.vatApplicable,
  });

  return prisma.invoice.update({
    where: { id: invoiceId },
    data: { paExternalId: result.externalId, status: "SENT" },
  });
}
