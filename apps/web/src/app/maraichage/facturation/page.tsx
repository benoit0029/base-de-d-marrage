import { getInvoices } from "@/lib/fixtures/invoices";
import InvoicesTable from "@/components/InvoicesTable";

export default function Page() {
  const invoices = getInvoices("maraichage");
  return (
    <div className="rounded-lg border bg-white">
      <InvoicesTable invoices={invoices} accentColorHex="#2f7d4f" />
    </div>
  );
}
