import type { FakeTvaInstallment } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import { toDocumentHref } from "@/lib/storage/url";
import { yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import StatusBadge from "@/components/StatusBadge";
import RegisterActions from "@/components/RegisterActions";

export default function TvaInstallmentTable({
  items,
  closedYears = [],
}: {
  items: FakeTvaInstallment[];
  closedYears?: number[];
}) {
  if (items.length === 0) {
    return <p className="p-6 text-sm text-slate-500">Aucun paiement d&apos;acompte enregistré pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Échéance</th>
            <th className="px-4 py-2.5 text-right">Montant versé</th>
            <th className="px-4 py-2.5">Date de paiement</th>
            <th className="px-4 py-2.5">Justificatif</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const pending = item.status === "pending";
            const itemYear = yearOfIsoDate(item.paidAt);
            const locked = !pending && itemYear !== null && closedYears.includes(itemYear);
            return (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{item.dueLabel}</td>
                <td className="px-4 py-2.5 text-right">{formatEuro(item.amountPaid)}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(item.paidAt)}</td>
                <td className="px-4 py-2.5">
                  {item.justificatifUrl ? (
                    <a
                      href={toDocumentHref(item.justificatifUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-600 underline"
                    >
                      Ouvrir
                    </a>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <RegisterActions
                    pending={pending}
                    validateUrl={pending ? `/api/tva-installments/${item.id}/validate` : undefined}
                    deleteUrl={
                      pending
                        ? `/api/tva-installments/${item.id}`
                        : `/api/tva-installments/${item.id}/soft-delete`
                    }
                    deleteMethod={pending ? "DELETE" : "POST"}
                    deleteLabel={pending ? "Supprimer" : "Supprimer la ligne"}
                    confirmMessage={
                      pending
                        ? "Supprimer ce paiement en attente ?"
                        : "Supprimer définitivement cette ligne validée de l'affichage ? Elle restera conservée en base en cas de contrôle fiscal."
                    }
                    locked={locked}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
