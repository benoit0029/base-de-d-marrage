import type { FakeInvoice } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import SendToPaButton from "@/components/invoicing/SendToPaButton";

export default function InvoicesTable({
  invoices,
  paConnected,
}: {
  invoices: FakeInvoice[];
  paConnected: boolean;
}) {
  if (invoices.length === 0) {
    return (
      <p className="p-4 text-sm text-slate-500">
        Aucun document pour cette activité pour le moment.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Numéro</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Client</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5 text-right">Montant TTC</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5">Relevé bancaire</th>
            <th className="px-4 py-2.5" />
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 font-medium">{invoice.number}</td>
              <td className="px-4 py-2.5 capitalize">{invoice.type}</td>
              <td className="px-4 py-2.5">{invoice.clientName}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(invoice.issueDate)}</td>
              <td className="px-4 py-2.5 text-right font-medium">{formatEuro(invoice.totalTtc)}</td>
              <td className="px-4 py-2.5">
                <StatusBadge status={invoice.status} />
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
              <td className="px-4 py-2.5 text-right">
                {invoice.type === "facture" &&
                  (invoice.paExternalId ? (
                    <span className="text-xs text-emerald-700">Envoyé à Abby</span>
                  ) : paConnected ? (
                    <SendToPaButton invoiceId={invoice.id} />
                  ) : (
                    <span className="text-xs text-slate-400">PA non connectée</span>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
