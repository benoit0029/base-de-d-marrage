import { listInvoices } from "@/server/services/invoices";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toInvoiceView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import { formatDate, formatEuro } from "@/lib/format";
import { invoiceCashLabel } from "@/lib/cashStatus";
import MarkPaidButton from "@/components/MarkPaidButton";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

// Kerbooth 360 est 100% facturé : le livre des recettes de cette activité ne
// contient que des lignes de factures — pas de journal de caisse, pas de
// capture IA de documents ici. La création/gestion des factures se fait
// dans l'onglet Facturation ; seul l'encaissement (comptabilité de caisse,
// voir lib/cashStatus) se renseigne depuis cette vue ou automatiquement via
// le rapprochement bancaire.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [allInvoices, closedYears] = await Promise.all([
    listInvoices("BIC_PHOTOBOOTH"),
    listClosedYears(),
  ]);
  const invoices = filterByYear(
    allInvoices
      // Factures + avoirs remboursés (montant négatif à la date du remboursement).
      .filter((i) => (i.type === "FACTURE" && i.status !== "CANCELLED") || (i.type === "AVOIR" && i.paidAt))
      .map(toInvoiceView),
    (i) => yearOfIsoDate(i.paidAt),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between gap-3 border-b bg-slate-50 p-3 text-xs text-slate-500">
        <span>
          Encaissements des factures (le registre officiel est l&apos;onglet
          « Livre des recettes »). Pour créer une facture : onglet Factures.
        </span>
        <YearFilter closedYears={closedYears} />
      </div>
      {invoices.length === 0 ? (
        <p className="p-6 text-sm text-slate-500">Aucune facture pour le moment.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Numéro</th>
                <th className="px-4 py-2.5">Client</th>
                <th className="px-4 py-2.5">Date de facture</th>
                <th className="px-4 py-2.5 text-right">Montant TTC</th>
                <th className="px-4 py-2.5">Statut</th>
                <th className="px-4 py-2.5">Date d&apos;encaissement</th>
                <th className="px-4 py-2.5">Relevé bancaire</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium">{invoice.number}</td>
                  <td className="px-4 py-2.5">{invoice.clientName}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(invoice.issueDate)}</td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatEuro(invoice.totalTtc)}</td>
                  <td className="px-4 py-2.5 text-xs">
                    <span
                      className={
                        !invoice.paidAt ? "font-medium text-amber-700" : "font-medium text-emerald-700"
                      }
                    >
                      {invoiceCashLabel(invoice)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                    {invoice.paidAt ? (
                      formatDate(invoice.paidAt)
                    ) : (
                      <MarkPaidButton url={`/api/invoices/${invoice.id}/mark-paid`} label="Marquer encaissée" />
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {invoice.reconciled ? (
                      <span className="text-emerald-700">✓ Pointé</span>
                    ) : (
                      <span className="text-slate-400">Non pointé</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <a
                      href={`/api/invoices/${invoice.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-600 underline"
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
