import type { FakeSimpleImport } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import { toDocumentHref } from "@/lib/storage/url";
import { SIMPLE_IMPORT_CATEGORY_LABELS } from "@/lib/simpleImportLabels";
import { yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import StatusBadge from "@/components/StatusBadge";
import RegisterActions from "@/components/RegisterActions";
import type { SimpleImportCategory } from "@prisma/client";

export default function SimpleImportTable({
  items,
  closedYears = [],
}: {
  items: FakeSimpleImport[];
  closedYears?: number[];
}) {
  if (items.length === 0) {
    return <p className="p-6 text-sm text-slate-500">Aucun document importé pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Période</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5 text-right">Montant TTC</th>
            <th className="px-4 py-2.5">Justificatif</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => {
            const pending = item.status === "pending";
            const itemYear = yearOfIsoDate(item.date);
            // Seuls les documents qui ont généré une Dépense (cotisations)
            // peuvent être bloqués par une clôture — les autres catégories
            // (contrat, bulletin de paie...) ne sont jamais rattachées à un
            // exercice. Approximation sur `item.date` (pas la vraie `paidAt`
            // de la Dépense liée, non exposée ici) : purement indicative,
            // le serveur reste la seule source de vérité (voir softDeleteSimpleImport).
            const locked =
              !pending && item.linkedEntryId != null && itemYear !== null && closedYears.includes(itemYear);
            return (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  {SIMPLE_IMPORT_CATEGORY_LABELS[item.category as SimpleImportCategory] ?? item.category}
                </td>
                <td className="px-4 py-2.5 text-slate-600">{item.period ?? "—"}</td>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(item.date)}</td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {item.amountTtc !== null ? formatEuro(item.amountTtc) : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <a
                    href={toDocumentHref(item.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-medium text-slate-600 underline"
                  >
                    Ouvrir
                  </a>
                </td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <RegisterActions
                    pending={pending}
                    validateUrl={pending ? `/api/simple-imports/${item.id}/validate` : undefined}
                    deleteUrl={
                      pending
                        ? `/api/simple-imports/${item.id}`
                        : `/api/simple-imports/${item.id}/soft-delete`
                    }
                    deleteMethod={pending ? "DELETE" : "POST"}
                    deleteLabel={pending ? "Supprimer" : "Supprimer la ligne"}
                    confirmMessage={
                      pending
                        ? "Supprimer ce document en attente ?"
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
