import { listInvoices } from "@/server/services/invoices";
import { getPaConnection } from "@/server/services/pa";
import { toInvoiceView } from "@/lib/serialize";
import { isVatApplicable } from "@/lib/invoicing/vatPolicy";
import InvoicesTable from "@/components/InvoicesTable";
import InvoiceForm from "@/components/invoicing/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [invoices, paConnection] = await Promise.all([
    listInvoices("BIC_PHOTOBOOTH"),
    getPaConnection(),
  ]);

  return (
    <div className="space-y-4">
      <InvoiceForm
        activity="BIC_PHOTOBOOTH"
        vatApplicable={isVatApplicable("BIC_PHOTOBOOTH")}
        accentColorHex="#7a4fc9"
      />
      <div className="rounded-lg border bg-white">
        <InvoicesTable
          invoices={invoices.map(toInvoiceView)}
          paConnected={paConnection?.status === "CONNECTED"}
        />
      </div>
    </div>
  );
}
