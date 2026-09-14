"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FakeBankTransaction, FakeEntry, FakeInvoice, FakeCashJournalEntry } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";

interface Candidates {
  entries: FakeEntry[];
  invoices: FakeInvoice[];
  cashJournalEntries: FakeCashJournalEntry[];
}

function UnreconcileButton({ transactionId }: { transactionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await fetch(`/api/bank-transactions/${transactionId}/unreconcile`, { method: "POST" });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="text-xs font-medium text-red-600 underline disabled:opacity-50"
    >
      {isPending ? "…" : "Annuler le rapprochement"}
    </button>
  );
}

function ReconcilePicker({ transaction }: { transaction: FakeBankTransaction }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidates | null>(null);
  const [selected, setSelected] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function openPicker() {
    setOpen(true);
    if (candidates) return;
    setLoading(true);
    const res = await fetch(`/api/bank-transactions/${transaction.id}/candidates`);
    const data = await res.json();
    setCandidates(data);
    setLoading(false);
  }

  function handleConfirm() {
    if (!selected) return;
    const [targetType, targetId] = selected.split(":");
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/bank-transactions/${transaction.id}/reconcile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });
      if (!res.ok) {
        setError("Échec du rapprochement.");
        return;
      }
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={openPicker}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
      >
        Rapprocher
      </button>
    );
  }

  const options = candidates
    ? transaction.direction === "DEBIT"
      ? candidates.entries.map((e) => ({
          value: `entry:${e.id}`,
          label: `${formatDate(e.date)} — ${e.counterpartyName} — ${formatEuro(e.amountTtc)}`,
        }))
      : [
          ...candidates.invoices.map((i) => ({
            value: `invoice:${i.id}`,
            label: `Facture ${i.number} — ${formatDate(i.issueDate)} — ${formatEuro(i.totalTtc)}`,
          })),
          ...candidates.cashJournalEntries.map((c) => ({
            value: `cashJournal:${c.id}`,
            label: `Vente directe — ${formatDate(c.date)} — ${formatEuro(c.totalTtc)}`,
          })),
        ]
    : [];

  return (
    <div className="flex flex-col items-end gap-1">
      {loading ? (
        <span className="text-xs text-slate-400">Chargement…</span>
      ) : options.length === 0 ? (
        <span className="text-xs text-slate-400">
          Aucun candidat trouvé (jusqu&apos;à 100 jours avant, 7 jours après).
        </span>
      ) : (
        <div className="flex items-center gap-1.5">
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
          >
            <option value="">Choisir…</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected || isPending}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 disabled:opacity-50"
          >
            {isPending ? "…" : "Valider"}
          </button>
        </div>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

export default function BankTransactionsTable({
  transactions,
}: {
  transactions: FakeBankTransaction[];
}) {
  if (transactions.length === 0) {
    return <p className="p-6 text-sm text-slate-500">Aucune opération importée pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Libellé</th>
            <th className="px-4 py-2.5">Sens</th>
            <th className="px-4 py-2.5 text-right">Montant</th>
            <th className="px-4 py-2.5">Rapprochement</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(tx.date)}</td>
              <td className="px-4 py-2.5 text-slate-600">{tx.label}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    tx.direction === "DEBIT" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {tx.direction === "DEBIT" ? "Débit" : "Crédit"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right font-medium">{formatEuro(tx.amount)}</td>
              <td className="px-4 py-2.5">
                {tx.reconciled ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-emerald-700">✓ {tx.reconciledWith}</span>
                    <UnreconcileButton transactionId={tx.id} />
                  </div>
                ) : (
                  <ReconcilePicker transaction={tx} />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
