"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const today = () => new Date().toISOString().slice(0, 10);

// Renseigne manuellement la date d'encaissement/paiement d'une facture ou
// d'une Dépense (comptabilité de caisse — voir lib/cashStatus). Se pose
// aussi automatiquement au rapprochement bancaire (voir Relevé bancaire) —
// ce bouton sert au cas où le paiement est connu avant tout import de relevé.
export default function MarkPaidButton({ url, label }: { url: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today());
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paidAt: date }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs"
        />
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy}
          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 disabled:opacity-50"
        >
          {busy ? "…" : "Confirmer"}
        </button>
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
