"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FakeEntry } from "@/lib/types";

const toInput = (n: number) => String(n).replace(".", ",");
const toNumber = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const round2 = (n: number) => Math.round(n * 100) / 100;
const RATES = [0, 5.5, 10, 20];

// Taux de TVA de la pièce déduit de ses montants (le plus proche des taux
// usuels), pour recalculer HT/TVA/TTC quand on en modifie un.
function guessRate(ht: number, vat: number): number {
  if (ht <= 0) return 0;
  const r = (vat / ht) * 100;
  const nearest = RATES.reduce((a, b) => (Math.abs(b - r) < Math.abs(a - r) ? b : a), 0);
  return Math.abs(nearest - r) < 0.5 ? nearest : round2(r);
}

// Modifier une dépense encore en attente (la lecture automatique s'est
// trompée de date, de fournisseur ou de montant) — impossible une fois
// validée, voir correctEntry.
export default function EditEntryButton({ entry }: { entry: FakeEntry }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [rate, setRate] = useState(guessRate(entry.amountHt, entry.amountVat));
  const [form, setForm] = useState({
    date: entry.date.slice(0, 10),
    counterpartyName: entry.counterpartyName,
    nature: entry.nature,
    amountHt: toInput(entry.amountHt),
    amountVat: toInput(entry.amountVat),
    amountTtc: toInput(entry.amountTtc),
  });

  // Recalcul automatique : HT modifié → TVA et TTC ; TTC modifié → HT et TVA ;
  // TVA modifiée → TTC ; taux changé → recalcul depuis le TTC (montant payé).
  function changeHt(v: string) {
    const n = toNumber(v);
    if (!Number.isFinite(n)) return setForm({ ...form, amountHt: v });
    const vatN = round2((n * rate) / 100);
    setForm({ ...form, amountHt: v, amountVat: toInput(vatN), amountTtc: toInput(round2(n + vatN)) });
  }
  function changeTtc(v: string) {
    const n = toNumber(v);
    if (!Number.isFinite(n)) return setForm({ ...form, amountTtc: v });
    const htN = round2(n / (1 + rate / 100));
    setForm({ ...form, amountTtc: v, amountHt: toInput(htN), amountVat: toInput(round2(n - htN)) });
  }
  function changeVat(v: string) {
    const n = toNumber(v);
    const htN = toNumber(form.amountHt);
    if (!Number.isFinite(n) || !Number.isFinite(htN)) return setForm({ ...form, amountVat: v });
    setForm({ ...form, amountVat: v, amountTtc: toInput(round2(htN + n)) });
  }
  function changeRate(r: number) {
    setRate(r);
    const n = toNumber(form.amountTtc);
    if (!Number.isFinite(n)) return;
    const htN = round2(n / (1 + r / 100));
    setForm({ ...form, amountHt: toInput(htN), amountVat: toInput(round2(n - htN)) });
  }

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
      <label className="block text-xs text-slate-600">
        Taux de TVA
        <select value={String(rate)} onChange={(e) => changeRate(Number(e.target.value))} className={field}>
          {[...new Set([...RATES, rate])].sort((a, b) => a - b).map((r) => (
            <option key={r} value={String(r)}>
              {String(r).replace(".", ",")} %
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-2">
        <label className="block text-xs text-slate-600">
          HT
          <input inputMode="decimal" value={form.amountHt} onChange={(e) => changeHt(e.target.value)} className={field} />
        </label>
        <label className="block text-xs text-slate-600">
          TVA
          <input inputMode="decimal" value={form.amountVat} onChange={(e) => changeVat(e.target.value)} className={field} />
        </label>
        <label className="block text-xs text-slate-600">
          TTC
          <input inputMode="decimal" value={form.amountTtc} onChange={(e) => changeTtc(e.target.value)} className={field} />
        </label>
      </div>
      <p className="text-xs text-slate-400">Modifie le HT ou le TTC : le reste se recalcule avec le taux.</p>
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
