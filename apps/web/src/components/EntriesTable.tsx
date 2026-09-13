import type { FakeEntry } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

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

export default function EntriesTable({ entries }: { entries: FakeEntry[] }) {
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
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Tiers</th>
            <th className="px-4 py-2.5">Nature</th>
            <th className="px-4 py-2.5">Origine</th>
            <th className="px-4 py-2.5 text-right">Montant HT</th>
            <th className="px-4 py-2.5 text-right">TVA</th>
            <th className="px-4 py-2.5 text-right">Montant TTC</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <tr key={entry.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 whitespace-nowrap">
                {formatDate(entry.date)}
              </td>
              <td className="px-4 py-2.5">{typeLabel[entry.type]}</td>
              <td className="px-4 py-2.5">{entry.counterpartyName}</td>
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
              <td className="px-4 py-2.5">
                <StatusBadge status={entry.status} />
              </td>
              <td className="px-4 py-2.5 text-right">
                {entry.status === "pending" ? (
                  <button
                    type="button"
                    disabled
                    title="Disponible en phase 3 (pipeline de validation)"
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-400"
                  >
                    Valider
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
