"use client";

import { Fragment, useState } from "react";
import type { FakeCashJournalEntry } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import { toDocumentHref } from "@/lib/storage/url";
import { yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import StatusBadge from "@/components/StatusBadge";
import RegisterActions from "@/components/RegisterActions";

const paymentMethodLabel: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèque",
  cb: "CB",
};

export function CashJournalActions({
  entry,
  closedYears = [],
}: {
  entry: FakeCashJournalEntry;
  closedYears?: number[];
}) {
  const pending = entry.status === "pending";
  const entryYear = yearOfIsoDate(entry.date);
  const locked = !pending && entryYear !== null && closedYears.includes(entryYear);
  return (
    <RegisterActions
      pending={pending}
      validateUrl={pending ? `/api/cash-journal/${entry.id}/validate` : undefined}
      deleteUrl={pending ? `/api/cash-journal/${entry.id}` : `/api/cash-journal/${entry.id}/soft-delete`}
      deleteMethod={pending ? "DELETE" : "POST"}
      deleteLabel={pending ? "Supprimer" : "Supprimer la ligne"}
      confirmMessage={
        pending
          ? "Supprimer cette saisie en attente ?"
          : "Supprimer définitivement cette ligne validée de l'affichage ? Elle restera conservée en base en cas de contrôle fiscal."
      }
      locked={locked}
    />
  );
}

export function CashJournalDetail({ entry }: { entry: FakeCashJournalEntry }) {
  return (
    <div className="grid gap-2 bg-slate-50 p-3 text-xs text-slate-600 sm:grid-cols-2">
      <div>
        <p>Espèces : {formatEuro(entry.cashAmount)}</p>
        {entry.checkAmount > 0 && <p>Chèques : {formatEuro(entry.checkAmount)}</p>}
        {entry.cardAmount > 0 && <p>CB : {formatEuro(entry.cardAmount)}</p>}
      </div>
      <div className="space-y-1">
        {entry.depositSlipUrl && (
          <a
            href={toDocumentHref(entry.depositSlipUrl)}
            target="_blank"
            rel="noreferrer"
            className="block underline"
          >
            Bordereau de dépôt
          </a>
        )}
      </div>
      {entry.exceptionalSales.length > 0 && (
        <div className="sm:col-span-2">
          <p className="font-medium text-amber-700">Ventes exceptionnelles (&gt; 76 €)</p>
          <ul className="list-disc pl-4">
            {entry.exceptionalSales.map((sale, i) => (
              <li key={i}>
                {formatEuro(sale.amountTtc)} — {paymentMethodLabel[sale.paymentMethod] ?? sale.paymentMethod}
                {sale.description ? ` — ${sale.description}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function CashJournalTable({
  entries,
  closedYears = [],
}: {
  entries: FakeCashJournalEntry[];
  closedYears?: number[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Aucune saisie de journal de caisse pour le moment.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5 text-right">Montant TTC</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5">Relevé bancaire</th>
            <th className="px-4 py-2.5" />
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {entries.map((entry) => (
            <Fragment key={entry.id}>
              <tr className="hover:bg-slate-50">
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(entry.date)}</td>
                <td className="px-4 py-2.5 text-right font-medium">{formatEuro(entry.totalTtc)}</td>
                <td className="px-4 py-2.5">
                  <StatusBadge status={entry.status} />
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {entry.reconciled ? (
                    <span className="text-emerald-700">✓ Pointé</span>
                  ) : (
                    <span className="text-slate-400">Non pointé</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    className="text-xs font-medium text-slate-600 underline"
                  >
                    {expanded === entry.id ? "Masquer" : "Détail"}
                  </button>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <CashJournalActions entry={entry} closedYears={closedYears} />
                </td>
              </tr>
              {expanded === entry.id && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <CashJournalDetail entry={entry} />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
