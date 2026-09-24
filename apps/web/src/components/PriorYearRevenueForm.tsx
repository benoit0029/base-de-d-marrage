"use client";

import { useActionState, useState, useTransition } from "react";
import {
  removePriorYearRevenue,
  submitPriorYearRevenue,
  type PriorYearRevenueState,
} from "@/app/actions/priorYearRevenue";
import { formatEuro } from "@/lib/format";
import type { PriorYearRevenueView } from "@/lib/declaration/microBa";

const initialState: PriorYearRevenueState = { status: "idle", message: "" };

// Saisie des recettes HT des années d'avant l'outil (page Déclaration 2042),
// pour que la moyenne sur 3 ans soit juste dès la première année.
export default function PriorYearRevenueForm({
  rows,
  defaultYear,
}: {
  rows: PriorYearRevenueView[];
  defaultYear: number;
}) {
  const [state, formAction, pending] = useActionState(submitPriorYearRevenue, initialState);
  const [removeMessage, setRemoveMessage] = useState<PriorYearRevenueState | null>(null);
  const [removing, startRemove] = useTransition();
  const shown = removeMessage ?? state;

  function handleRemove(year: number) {
    if (!window.confirm(`Retirer la saisie ${year} ? L'année reprendra le calcul automatique de l'outil.`)) return;
    startRemove(async () => setRemoveMessage(await removePriorYearRevenue(year)));
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Recettes des années passées (avant l&apos;outil)</p>
      <p className="mt-1 text-xs text-slate-500">
        Indique les recettes HT des années qui ne sont pas dans l&apos;outil (montant déclaré en case 5XB ces
        années-là, sur tes anciennes déclarations). Une saisie remplace le calcul automatique de cette année.
      </p>

      <form action={(fd) => { setRemoveMessage(null); formAction(fd); }} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-slate-600">Année</span>
          <input
            type="number"
            name="year"
            defaultValue={defaultYear}
            min={2000}
            required
            className="mt-1 block w-28 rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Recettes HT (€)</span>
          <input
            name="amountHt"
            inputMode="decimal"
            required
            className="mt-1 block w-40 rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {shown.status !== "idle" && (
          <span className={`text-sm ${shown.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {shown.message}
          </span>
        )}
      </form>

      {rows.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.year}>
                <td className="py-1.5">{r.year}</td>
                <td className="py-1.5 text-right">{formatEuro(r.amountHt)}</td>
                <td className="py-1.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemove(r.year)}
                    disabled={removing}
                    className="text-xs font-medium text-red-600 underline disabled:opacity-50"
                  >
                    Retirer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
