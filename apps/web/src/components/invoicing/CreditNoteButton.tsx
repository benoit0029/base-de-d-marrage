"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const today = () => new Date().toISOString().slice(0, 10);

// Annule une facture par une facture d'avoir (jamais de suppression) — voir
// createCreditNote.
export default function CreditNoteButton({ invoiceId, invoiceNumber }: { invoiceId: string; invoiceNumber: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function confirm() {
    if (!window.confirm(`Annuler la facture ${invoiceNumber} par un avoir ? L'avoir sera numéroté et ne pourra pas être supprimé.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/invoices/${invoiceId}/credit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueDate: date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Échec");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
      >
        Annuler par un avoir
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="flex items-center gap-1.5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Date de l'avoir"
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Créer l'avoir"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 underline">
          Annuler
        </button>
      </span>
      {error && <span className="max-w-[16rem] text-right text-xs text-red-600">{error}</span>}
    </span>
  );
}
