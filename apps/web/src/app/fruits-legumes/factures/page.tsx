import { getInvoices } from "@/lib/fixtures/invoices";
import InvoicesTable from "@/components/InvoicesTable";

export default function Page() {
  const invoices = getInvoices("fruits-legumes");
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
        Le moteur de facturation est disponible mais pas activé par défaut
        sur cette activité : à confirmer si vous facturez chaque vente ou si
        un simple ticket agrégé dans le livre des recettes suffit (voir
        Réglages → Fruits/Légumes).
      </div>
      <div className="rounded-lg border bg-white">
        <InvoicesTable invoices={invoices} accentColorHex="#c9762c" />
      </div>
    </div>
  );
}
