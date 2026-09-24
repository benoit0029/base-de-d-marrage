"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FakeEntry } from "@/lib/types";

const toInput = (n: number) => String(n).replace(".", ",");
const toNumber = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));

// Modifier une dépense encore en attente (la lecture automatique s'est
// trompée de date, de fournisseur ou de montant) — impossible une fois
// validée, voir correctEntry.
export default function EditEntryButton({ entry }: { entry: FakeEntry }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    date: entry.date.slice(0, 10),
    counterpartyName: entry.counterpartyName,
    nature: entry.nature,
    amountHt: toInput(entry.amountHt),
    amountVat: toInput(entry.amountVat),
    amountTtc: toInput(entry.amountTtc),
  });

  const ht = toNumber(form.amountHt);
  const vat = toNumber(form.amountVat);
  const ttc = toNumber(form.amountTtc);
  const mismatch = [ht, vat, ttc].every(Number.isFinite) && Math.abs(ht + vat - ttc) > 0.01;

  function save() {
    setError(null);
    if (![ht, vat, ttc].every((n) => Number.isFinite(n) && n >= 0)) {
      setError("Montant invalide.");
      return;
    }
    if (!form.counterpartyName.trim() || !form.nature.trim()) {
      setError("Fournisseur et nature obligatoires.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: form.date,
          counterpartyName: form.counterpartyName.trim(),
          nature: form.nature.trim(),
          amountHt: ht,
          amountVat: vat,
          amountTtc: ttc,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Échec de l'enregistrement.");
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
        Modifier
      </button>
    );
  }

  const field = "mt-0.5 w-full rounded-md border border-slate-300 px-2 py-1 text-xs";
  return (
    <div className="w-72 space-y-2 rounded-md border border-slate-200 bg-white p-3 text-left shadow-sm">
      <p className="text-xs font-medium text-slate-700">Modifier la dépense (avant validation)</p>
      <label className="block text-xs text-slate-600">
        Date de facture
        <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={field} />
      </label>
      <label className="block text-xs text-slate-600">
        Fournisseur
        <input value={form.counterpartyName} onChange={(e) => setForm({ ...form, counterpartyName: e.target.value })} className={field} />
      </label>
      <label className="block text-xs text-slate-600">
        Nature
        <input value={form.nature} onChange={(e) => setForm({ ...form, nature: e.target.value })} className={field} />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {(["amountHt", "amountVat", "amountTtc"] as const).map((k) => (
          <label key={k} className="block text-xs text-slate-600">
            {k === "amountHt" ? "HT" : k === "amountVat" ? "TVA" : "TTC"}
            <input inputMode="decimal" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={field} />
          </label>
        ))}
      </div>
      {mismatch && <p className="text-xs text-amber-700">Attention : HT + TVA ≠ TTC.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? "…" : "Enregistrer"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 underline">
          Annuler
        </button>
      </div>
    </div>
  );
}
