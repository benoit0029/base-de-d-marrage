import { listInvoices } from "@/server/services/invoices";
import { listActivitySettings } from "@/server/services/settings";
import { toInvoiceView } from "@/lib/serialize";
import { isVatApplicable } from "@/lib/invoicing/vatPolicy";
import InvoicesTable from "@/components/InvoicesTable";
import InvoiceForm from "@/components/invoicing/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [invoices, activitySettings] = await Promise.all([
    listInvoices("BIC_FRUITS_LEGUMES"),
    listActivitySettings(),
  ]);
  const invoicingEnabled =
    activitySettings.find((s) => s.activity === "BIC_FRUITS_LEGUMES")?.invoicingEnabled ?? false;

  return (
    <div className="space-y-3">
      {invoicingEnabled ? (
        <InvoiceForm
          activity="BIC_FRUITS_LEGUMES"
          vatApplicable={isVatApplicable("BIC_FRUITS_LEGUMES")}
          accentColorHex="#c9762c"
        />
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Le moteur de facturation est disponible mais désactivé par défaut sur
          cette activité (facture par vente vs simple ticket agrégé dans le
          livre des recettes, à confirmer). Activez « Facturation active »
          pour Revente Fruits/Légumes dans Réglages pour créer des devis et
          factures ici.
        </div>
      )}
      <div className="rounded-lg border bg-white">
        <InvoicesTable invoices={invoices.map(toInvoiceView)} />
      </div>
    </div>
  );
}
