import { listInvoices } from "@/server/services/invoices";
import { toInvoiceView } from "@/lib/serialize";
import { isVatApplicable } from "@/lib/invoicing/vatPolicy";
import InvoicesTable from "@/components/InvoicesTable";
import InvoiceForm from "@/components/invoicing/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const invoices = await listInvoices("BIC_PHOTOBOOTH");

  return (
    <div className="space-y-4">
      <InvoiceForm
        activity="BIC_PHOTOBOOTH"
        vatApplicable={isVatApplicable("BIC_PHOTOBOOTH")}
        accentColorHex="#7a4fc9"
      />
      <div className="rounded-lg border bg-white">
        <InvoicesTable invoices={invoices.map(toInvoiceView)} />
      </div>
    </div>
  );
}
