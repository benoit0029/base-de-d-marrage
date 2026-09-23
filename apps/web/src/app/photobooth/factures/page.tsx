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

export const dynamic = "force-dynamic";

export default async function Page() {
  const [invoices, paConnection, clients, products] = await Promise.all([
    listInvoices("BIC_PHOTOBOOTH"),
    getPaConnection(),
    listClients("BIC_PHOTOBOOTH"),
    listProducts("BIC_PHOTOBOOTH"),
  ]);
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
