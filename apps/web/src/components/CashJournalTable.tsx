"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FakeCashJournalEntry } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import { toDocumentHref } from "@/lib/storage/url";
import StatusBadge from "@/components/StatusBadge";

const paymentMethodLabel: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèque",
  cb: "CB",
};

export function CashJournalValidateButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/cash-journal/${entryId}/validate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Échec de la validation");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 disabled:opacity-50"
      >
        {isPending ? "…" : "Valider"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
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
        {entry.cardStatementUrl && (
          <a
            href={toDocumentHref(entry.cardStatementUrl)}
            target="_blank"
            rel="noreferrer"
            className="block underline"
          >
            Capture Up2Pay (CB)
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

export default function CashJournalTable({ entries }: { entries: FakeCashJournalEntry[] }) {
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
                  {entry.status === "pending" ? <CashJournalValidateButton entryId={entry.id} /> : null}
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
