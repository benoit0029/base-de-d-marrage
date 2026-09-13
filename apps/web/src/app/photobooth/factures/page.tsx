import { getInvoices } from "@/lib/fixtures/invoices";
import InvoicesTable from "@/components/InvoicesTable";

export default function Page() {
  const invoices = getInvoices("photobooth");
  return (
    <div className="rounded-lg border bg-white">
      <InvoicesTable invoices={invoices} accentColorHex="#7a4fc9" />
    </div>
  );
}
