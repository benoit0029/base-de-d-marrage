import { listInvoices } from "@/server/services/invoices";
import { listActivitySettings } from "@/server/services/settings";
import { getPaConnection } from "@/server/services/pa";
import { toInvoiceView } from "@/lib/serialize";
import { isVatApplicable } from "@/lib/invoicing/vatPolicy";
import InvoicesTable from "@/components/InvoicesTable";
import InvoiceForm from "@/components/invoicing/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [invoices, activitySettings, paConnection] = await Promise.all([
    listInvoices("BIC_FRUITS_LEGUMES"),
    listActivitySettings(),
    getPaConnection(),
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
