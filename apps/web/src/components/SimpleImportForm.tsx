"use client";

import { useActionState } from "react";
import { submitSimpleImport, type SimpleImportFormState } from "@/app/actions/simpleImports";
import type { Activity, SimpleImportCategory } from "@prisma/client";

const initialState: SimpleImportFormState = { status: "idle", message: "" };
const today = () => new Date().toISOString().slice(0, 10);

export interface SimpleImportCategoryOption {
  value: SimpleImportCategory;
  label: string;
}

export default function SimpleImportForm({
  activity,
  categoryOptions,
  amountRequired,
  showPeriod,
  revalidatePaths,
  title,
  description,
}: {
  activity: Activity;
  categoryOptions: SimpleImportCategoryOption[];
  amountRequired: boolean;
  showPeriod: boolean;
  revalidatePaths: string[];
  title: string;
  description: string;
}) {
  const boundAction = submitSimpleImport.bind(null, activity, revalidatePaths);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {categoryOptions.length > 1 ? (
          <label className="text-sm">
            <span className="text-slate-600">Type de document</span>
            <select
              name="category"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="category" value={categoryOptions[0]?.value} />
        )}

        <label className="text-sm">
          <span className="text-slate-600">Date du document</span>
          <input
            type="date"
            name="date"
            defaultValue={today()}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        {showPeriod && (
          <label className="text-sm">
            <span className="text-slate-600">Période concernée</span>
            <input
              type="text"
              name="period"
              placeholder="ex. 2026-09"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        )}

        <label className="text-sm">
          <span className="text-slate-600">
            Montant TTC (€){amountRequired ? "" : " — optionnel"}
          </span>
          <input
            type="text"
            inputMode="decimal"
            name="amountTtc"
            placeholder="0,00"
            required={amountRequired}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Fichier (PDF/image)</span>
          <input
            type="file"
            name="file"
            accept="application/pdf,image/*"
            required
            className="mt-1 w-full text-sm text-slate-500"
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
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Importer"}
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
