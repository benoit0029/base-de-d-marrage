"use client";

import { useActionState } from "react";
import { submitCashJournalEntry, type CashJournalFormState } from "@/app/actions/cashJournal";
import type { Activity } from "@prisma/client";

const initialState: CashJournalFormState = { status: "idle", message: "" };
const today = () => new Date().toISOString().slice(0, 10);

export default function CashJournalForm({ activity }: { activity: Activity }) {
  const isMaraichage = activity === "BA_MARAICHAGE";
  const boundAction = submitCashJournalEntry.bind(null, activity);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-4 rounded-lg border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Saisie du jour — vente directe</p>
        <p className="text-xs text-slate-500">
          Un seul enregistrement par jour : renvoyer ce formulaire le même
          jour met à jour la saisie précédente tant qu&apos;elle n&apos;est
          pas encore validée.
          {isMaraichage
            ? " Espèces, chèques et CB sont trois flux agrégés séparément."
            : " Espèces uniquement pour cette activité."}
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600">Date</span>
        <input
          type="date"
          name="date"
          defaultValue={today()}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 sm:w-48"
        />
      </label>

      <div className={`grid gap-3 ${isMaraichage ? "sm:grid-cols-3" : "sm:grid-cols-1 sm:max-w-xs"}`}>
        <label className="text-sm">
          <span className="text-slate-600">Espèces (€)</span>
          <input
            type="text"
            inputMode="decimal"
            name="cashAmount"
            placeholder="0,00"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        {isMaraichage && (
          <>
            <label className="text-sm">
              <span className="text-slate-600">Chèques (€)</span>
              <input
                type="text"
                inputMode="decimal"
                name="checkAmount"
                placeholder="0,00"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="text-slate-600">CB (€)</span>
              <input
                type="text"
                inputMode="decimal"
                name="cardAmount"
                placeholder="0,00"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </>
        )}
      </div>

      <div className={`grid gap-3 ${isMaraichage ? "sm:grid-cols-2" : "sm:grid-cols-1 sm:max-w-xs"}`}>
        <label className="text-sm">
          <span className="text-slate-600">Justificatif — photo du bordereau de dépôt</span>
          <input
            type="file"
            name="depositSlip"
            accept="image/*,application/pdf"
            capture="environment"
            className="mt-1 w-full text-sm text-slate-500"
          />
        </label>
        {isMaraichage && (
          <label className="text-sm">
            <span className="text-slate-600">
              Justificatif CB — capture d&apos;écran app bancaire Up2Pay
            </span>
            <input
              type="file"
              name="cardStatement"
              accept="image/*,application/pdf"
              className="mt-1 w-full text-sm text-slate-500"
            />
          </label>
        )}
      </div>

      <details className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
        <summary className="cursor-pointer font-medium text-amber-800">
          Vente exceptionnelle au-delà de 76 € (optionnel)
        </summary>
        <p className="mt-2 text-xs text-amber-800">
          La saisie globale journalière n&apos;est autorisée que pour des
          ventes unitaires ≤ 76 € (BOI-BIC-DECLA-30-30). Toute vente
          dépassant ce seuil doit être saisie ici, à part — ne l&apos;incluez
          pas dans les totaux ci-dessus.
        </p>
        <div className="mt-3 space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                inputMode="decimal"
                name={`exceptionalAmount${i}`}
                placeholder="Montant (€)"
                className="rounded-md border border-amber-300 px-2 py-1.5 text-sm"
              />
              <select
                name={`exceptionalMethod${i}`}
                defaultValue="especes"
                className="rounded-md border border-amber-300 px-2 py-1.5 text-sm"
              >
                <option value="especes">Espèces</option>
                <option value="cheque">Chèque</option>
                <option value="cb">CB</option>
              </select>
              <input
                type="text"
                name={`exceptionalDescription${i}`}
                placeholder="Description (optionnel)"
                className="rounded-md border border-amber-300 px-2 py-1.5 text-sm"
              />
            </div>
          ))}
        </div>
      </details>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer la saisie du jour"}
        </button>
        {state.status !== "idle" && (
          <span
            className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
