import { listInvoices } from "@/server/services/invoices";
import { listActivitySettings } from "@/server/services/settings";
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
  const [invoices, activitySettings, paConnection, clients, products] = await Promise.all([
    listInvoices("BIC_FRUITS_LEGUMES"),
    listActivitySettings(),
    getPaConnection(),
    listClients("BIC_FRUITS_LEGUMES"),
    listProducts("BIC_FRUITS_LEGUMES"),
  ]);
  const invoicingEnabled =
    activitySettings.find((s) => s.activity === "BIC_FRUITS_LEGUMES")?.invoicingEnabled ?? false;
  const vatApplicable = await isVatApplicableOn("BIC_FRUITS_LEGUMES", new Date());

  return (
    <div className="space-y-3">
      {invoicingEnabled ? (
        <>
          <InvoiceForm
            activity="BIC_FRUITS_LEGUMES"
            vatApplicable={vatApplicable}
            accentColorHex="#c9762c"
            clients={clients.map(toClientView)}
            products={products.map(toProductView)}
          />
          <ClientRepository activity="BIC_FRUITS_LEGUMES" clients={clients.map(toClientView)} />
          <ProductCatalog
            activity="BIC_FRUITS_LEGUMES"
            products={products.map(toProductView)}
            vatApplicable={vatApplicable}
          />
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Revente Fruits/Légumes est confirmée en 100% vente directe : la
          facturation est désactivée pour cette activité. Le livre des
          recettes se tient depuis le journal de caisse (onglet Recettes).
          Le moteur de facturation reste disponible si besoin : activez
          « Facturation active » pour cette activité dans Réglages.
        </div>
      )}
      <div className="rounded-lg border bg-white">
        <InvoicesTable
          invoices={invoices.map(toInvoiceView)}
          paConnected={paConnection?.status === "CONNECTED"}
        />
      </div>
    </div>
  );
}
