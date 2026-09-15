"use client";

import { useActionState } from "react";
import { submitTvaInstallment, type TvaInstallmentFormState } from "@/app/actions/tvaInstallments";

const initialState: TvaInstallmentFormState = { status: "idle", message: "" };
const today = () => new Date().toISOString().slice(0, 10);

export default function TvaInstallmentForm() {
  const [state, formAction, pending] = useActionState(submitTvaInstallment, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">
          Enregistrer un paiement d&apos;acompte TVA
        </p>
        <p className="text-xs text-slate-500">
          À saisir une fois le paiement effectué, justificatif à l&apos;appui.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">
          <span className="text-slate-600">Échéance</span>
          <input
            type="text"
            name="dueLabel"
            placeholder="2026-T3 ou « Régularisation annuelle »"
            required
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
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Date de paiement</span>
          <input
            type="date"
            name="paidAt"
            defaultValue={today()}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600">Justificatif (optionnel)</span>
        <input
          type="file"
          name="justificatif"
          accept="application/pdf,image/*"
          className="mt-1 w-full text-sm text-slate-500"
        />
      </label>

      {state.status === "duplicate" && (
        <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <input type="checkbox" name="confirmDuplicate" className="mt-0.5" />
          <span>Enregistrer quand même malgré le doublon probable détecté.</span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
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
