import { listInvoices } from "@/server/services/invoices";
import { getPaConnection } from "@/server/services/pa";
import { toInvoiceView } from "@/lib/serialize";
import { isVatApplicable } from "@/lib/invoicing/vatPolicy";
import InvoicesTable from "@/components/InvoicesTable";
import InvoiceForm from "@/components/invoicing/InvoiceForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [invoices, paConnection] = await Promise.all([
    listInvoices("BA_MARAICHAGE"),
    getPaConnection(),
  ]);

  return (
    <div className="space-y-4">
      <InvoiceForm
        activity="BA_MARAICHAGE"
        vatApplicable={isVatApplicable("BA_MARAICHAGE")}
        accentColorHex="#2f7d4f"
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
