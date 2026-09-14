import { listInvoices } from "@/server/services/invoices";
import { toInvoiceView } from "@/lib/serialize";
import { formatDate, formatEuro } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";

// Kerbooth 360 est 100% facturé : le livre des recettes de cette activité ne
// contient que des lignes de factures — pas de journal de caisse, pas de
// capture IA de documents ici. Vue en lecture seule (la création/gestion des
// factures se fait dans l'onglet Facturation) : c'est le registre légal, pas
// l'espace de travail.
export default async function Page() {
  const invoices = (await listInvoices("BIC_PHOTOBOOTH"))
    .filter((i) => i.type === "FACTURE" && i.status !== "CANCELLED")
    .map(toInvoiceView);

  return (
    <div className="rounded-lg border bg-white">
      <div className="border-b bg-slate-50 p-3 text-xs text-slate-500">
        Livre des recettes — lecture seule. Pour créer ou envoyer une
        facture, utilisez l&apos;onglet Facturation.
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
                <th className="px-4 py-2.5">Date</th>
                <th className="px-4 py-2.5 text-right">Montant TTC</th>
                <th className="px-4 py-2.5">Statut</th>
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
                  <td className="px-4 py-2.5">
                    <StatusBadge status={invoice.status} />
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
