import type { FakeEntry } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import { entryCashLabel } from "@/lib/cashStatus";
import { yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import RegisterActions from "@/components/RegisterActions";
import MarkPaidButton from "@/components/MarkPaidButton";
import ReclassifyEntryButton from "@/components/ReclassifyEntryButton";

const sourceLabel: Record<FakeEntry["source"], string> = {
  email: "📧 Email",
  photo: "📷 Photo",
  manuel: "✍️ Manuel",
};

const typeLabel: Record<FakeEntry["type"], string> = {
  recette: "Recette",
  achat: "Achat",
  immobilisation: "Immobilisation",
};

export default function EntriesTable({
  entries,
  closedYears = [],
}: {
  entries: FakeEntry[];
  closedYears?: number[];
}) {
  if (entries.length === 0) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Aucune écriture pour le moment. Les factures reçues par email ou
        photographiées apparaîtront ici automatiquement, en attente de
        validation.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Date de facture</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Tiers</th>
            <th className="px-4 py-2.5">Nature</th>
            <th className="px-4 py-2.5">Origine</th>
            <th className="px-4 py-2.5 text-right">Montant HT</th>
            <th className="px-4 py-2.5 text-right">TVA</th>
            <th className="px-4 py-2.5 text-right">Montant TTC</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5">Date de paiement</th>
            <th className="px-4 py-2.5">Relevé bancaire</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => {
          const entryYear = yearOfIsoDate(entry.paidAt);
          const locked = entryYear !== null && closedYears.includes(entryYear);
          return (
            <tr key={entry.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 whitespace-nowrap">
                {formatDate(entry.date)}
              </td>
              <td className="px-4 py-2.5">
                {typeLabel[entry.type]}
                {entry.type !== "recette" && !locked && (
                  <ReclassifyEntryButton entryId={entry.id} type={entry.type} />
                )}
              </td>
              <td className="px-4 py-2.5">
                {entry.counterpartyName}
                {entry.possibleDuplicate && (
                  <span
                    title="Un document identique a probablement déjà été reçu par un autre canal (email/photo)."
                    className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                  >
                    ⚠ Doublon probable
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-slate-600">{entry.nature}</td>
              <td className="px-4 py-2.5">{sourceLabel[entry.source]}</td>
              <td className="px-4 py-2.5 text-right">
                {formatEuro(entry.amountHt)}
              </td>
              <td className="px-4 py-2.5 text-right">
                {formatEuro(entry.amountVat)}
              </td>
              <td className="px-4 py-2.5 text-right font-medium">
                {formatEuro(entry.amountTtc)}
              </td>
              <td className="px-4 py-2.5 text-xs">
                <span
                  className={
                    entry.status === "validated" && !entry.paidAt
                      ? "font-medium text-amber-700"
                      : entry.paidAt
                        ? "font-medium text-emerald-700"
                        : "text-slate-500"
                  }
                >
                  {entryCashLabel(entry)}
                </span>
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap text-xs">
                {entry.paidAt ? (
                  formatDate(entry.paidAt)
                ) : entry.status === "validated" ? (
                  <MarkPaidButton url={`/api/entries/${entry.id}/mark-paid`} label="Marquer payée" />
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2.5 text-xs">
                {entry.reconciled ? (
                  <span className="text-emerald-700">✓ Pointé</span>
                ) : (
                  <span className="text-slate-400">Non pointé</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">
                <RegisterActions
                  pending={entry.status === "pending"}
                  validateUrl={entry.status === "pending" ? `/api/entries/${entry.id}/validate` : undefined}
                  deleteUrl={
                    entry.status === "pending"
                      ? `/api/entries/${entry.id}`
                      : `/api/entries/${entry.id}/soft-delete`
                  }
                  deleteMethod={entry.status === "pending" ? "DELETE" : "POST"}
                  deleteLabel={entry.status === "pending" ? "Supprimer" : "Supprimer la ligne"}
                  confirmMessage={
                    entry.status === "pending"
                      ? "Supprimer cette écriture en attente ?"
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
