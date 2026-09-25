import { listInvoices } from "@/server/services/invoices";
import { getPaConnection } from "@/server/services/pa";
import { listClients } from "@/server/services/clients";
import { listProducts } from "@/server/services/products";
import { toInvoiceView, toClientView, toProductView } from "@/lib/serialize";
import { isVatApplicableOn } from "@/lib/invoicing/vatPolicy";
import InvoicesTable from "@/components/InvoicesTable";
import InvoiceForm from "@/components/invoicing/InvoiceForm";
import ClientRepository from "@/components/invoicing/ClientRepository";
import ProductCatalog from "@/components/invoicing/ProductCatalog";
import { listKerboothQuotes } from "@/server/services/kerbooth/quotes";
import type { KerboothQuoteView } from "@/lib/kerbooth/quoteView";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [invoices, paConnection, clients, products, quotes] = await Promise.all([
    listInvoices("BIC_PHOTOBOOTH"),
    getPaConnection(),
    listClients("BIC_PHOTOBOOTH"),
    listProducts("BIC_PHOTOBOOTH"),
    listKerboothQuotes(),
  ]);
  const numberById = new Map(invoices.map((i) => [i.id, i.number]));
  const quotesByInvoiceId: Record<string, KerboothQuoteView> = Object.fromEntries(
    quotes.map((q) => [
      q.quoteInvoiceId,
      {
        id: q.id,
        status: q.status,
        clientEmail: q.clientEmail,
        sentAt: q.sentAt?.toISOString() ?? null,
        expiresAt: q.expiresAt?.toISOString() ?? null,
        signedAt: q.signedAt?.toISOString() ?? null,
        invoiceNumber: q.invoiceId ? (numberById.get(q.invoiceId) ?? null) : null,
        units: [
          ...new Set(
            q.bookings.filter((b) => b.status !== "CANCELLED").map((b) => b.unit?.label ?? "?")
          ),
        ],
      },
    ])
  );
  const vatApplicable = await isVatApplicableOn("BIC_PHOTOBOOTH", new Date());

  return (
    <div className="space-y-4">
      <InvoiceForm
        activity="BIC_PHOTOBOOTH"
        vatApplicable={vatApplicable}
        accentColorHex="#7a4fc9"
        clients={clients.map(toClientView)}
        products={products.map(toProductView)}
      />
      <div className="rounded-lg border bg-white">
        <InvoicesTable
          invoices={invoices.map(toInvoiceView)}
          paConnected={paConnection?.status === "CONNECTED"}
          quotesByInvoiceId={quotesByInvoiceId}
        />
      </div>
      <ClientRepository activity="BIC_PHOTOBOOTH" clients={clients.map(toClientView)} />
      <ProductCatalog
        activity="BIC_PHOTOBOOTH"
        products={products.map(toProductView)}
        vatApplicable={vatApplicable}
      />
    </div>
  );
}
