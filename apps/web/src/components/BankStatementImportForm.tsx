"use client";

import { useActionState } from "react";
import { submitBankStatementImport, type BankImportFormState } from "@/app/actions/bankTransactions";
import type { Activity } from "@prisma/client";

const initialState: BankImportFormState = { status: "idle", message: "" };

export default function BankStatementImportForm({ activity }: { activity: Activity }) {
  const boundAction = submitBankStatementImport.bind(null, activity);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">Importer un relevé bancaire (CSV)</p>
        <p className="text-xs text-slate-500">
          Fichier CSV téléchargé depuis votre espace bancaire en ligne (pas de
          connexion bancaire automatisée en v1). Les colonnes Date/Libellé et
          Débit/Crédit (ou Montant signé) doivent être présentes ; le format
          exact varie selon les banques, donc vérifiez le résultat après
          import.
        </p>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600">Fichier CSV</span>
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className="mt-1 w-full text-sm text-slate-500"
        />
      </label>

      {state.status === "duplicate" && (
        <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <input type="checkbox" name="confirmDuplicate" className="mt-0.5" />
          <span>Importer quand même malgré le doublon probable détecté.</span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Import en cours…" : "Importer le relevé"}
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
