"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { submitTvaInstallment, type TvaInstallmentFormState } from "@/app/actions/tvaInstallments";
import { readImportedDocument } from "@/app/actions/documentReading";

const initialState: TvaInstallmentFormState = { status: "idle", message: "" };
const today = () => new Date().toISOString().slice(0, 10);

export default function TvaInstallmentForm() {
  const [state, formAction, pending] = useActionState(submitTvaInstallment, initialState);

  // Lecture automatique du justificatif (voir readImportedDocument) :
  // pré-remplit échéance/montant/date, à vérifier avant d'enregistrer.
  const [dueLabel, setDueLabel] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paidAt, setPaidAt] = useState(today());
  const [readNotice, setReadNotice] = useState<string | null>(null);
  const [isReading, startReading] = useTransition();

  useEffect(() => {
    if (state.status === "success") {
      setDueLabel("");
      setAmountPaid("");
      setPaidAt(today());
      setReadNotice(null);
    }
  }, [state]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReadNotice(null);
    const data = new FormData();
    data.set("file", file);
    startReading(async () => {
      const r = await readImportedDocument("acompte_tva", data);
      if (r.status === "error") {
        setReadNotice(r.message ?? "Lecture automatique impossible — remplis les champs toi-même.");
        return;
      }
      const read: string[] = [];
      if (r.dueLabel) {
        setDueLabel(r.dueLabel);
        read.push("échéance");
      }
      if (r.amount !== null) {
        setAmountPaid(String(r.amount).replace(".", ","));
        read.push("montant");
      }
      if (r.date) {
        setPaidAt(r.date);
        read.push("date de paiement");
      }
      setReadNotice(
        read.length > 0
          ? `Lu automatiquement : ${read.join(", ")} — vérifie avant d'enregistrer.`
          : "Rien n'a pu être lu sur ce justificatif — remplis les champs toi-même."
      );
    });
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">
          Enregistrer un paiement d&apos;acompte TVA
        </p>
        <p className="text-xs text-slate-500">
          À saisir une fois le paiement effectué. Joins d&apos;abord le
          justificatif : l&apos;échéance, le montant et la date sont lus
          automatiquement.
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600">Justificatif (optionnel)</span>
        <input
          type="file"
          name="justificatif"
          accept="application/pdf,image/*"
          onChange={handleFileChange}
          className="mt-1 w-full text-sm text-slate-500"
        />
        {isReading && <span className="mt-1 block text-xs text-slate-400">Lecture automatique du justificatif…</span>}
        {readNotice && !isReading && <span className="mt-1 block text-xs text-amber-700">{readNotice}</span>}
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-600">Échéance</span>
          <input
            type="text"
            name="dueLabel"
            placeholder="2026-T3 ou « Régularisation annuelle »"
            required
            value={dueLabel}
            onChange={(e) => setDueLabel(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Montant versé (€)</span>
          <input
            type="text"
            inputMode="decimal"
            name="amountPaid"
            placeholder="0,00"
            required
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Date de paiement</span>
          <input
            type="date"
            name="paidAt"
            required
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {state.status === "duplicate" && (
        <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <input type="checkbox" name="confirmDuplicate" className="mt-0.5" />
          <span>Enregistrer quand même malgré le doublon probable détecté.</span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || isReading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state.status !== "idle" && (
          <span
            className={`text-sm ${
              state.status === "success"
                ? "text-emerald-700"
                : state.status === "duplicate"
                  ? "text-amber-700"
                  : "text-red-600"
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
