"use client";

import { useActionState } from "react";
import { submitChecklistItem, type EmployerFormState } from "@/app/actions/employer";
import type { ChecklistKey } from "@/server/services/employer";

const initialState: EmployerFormState = { status: "idle", message: "" };

// Une obligation d'employeur à cocher (DUERP, affichages, mutuelle,
// prévoyance) : date de réalisation et note.
export default function ChecklistItemForm({
  itemKey,
  label,
  hint,
  doneAt,
  note,
}: {
  itemKey: ChecklistKey;
  label: string;
  hint: string;
  doneAt: string | null;
  note: string | null;
}) {
  const [state, formAction, pending] = useActionState(submitChecklistItem.bind(null, itemKey), initialState);
  return (
    <form action={formAction} className="space-y-2 border-t border-slate-100 py-3 first:border-t-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            doneAt ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
          }`}
        >
          {doneAt ? `Fait le ${doneAt.split("-").reverse().join("/")}` : "À faire"}
        </span>
      </div>
      <p className="text-xs text-slate-500">{hint}</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="text-slate-600">Fait / mis à jour le</span>
          <input
            type="date"
            name="doneAt"
            defaultValue={doneAt ?? ""}
            className="mt-1 block rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="flex-1 text-xs">
          <span className="text-slate-600">Note</span>
          <input
            name="note"
            defaultValue={note ?? ""}
            placeholder="ex. organisme, où est rangé le document…"
            className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "…" : "Enregistrer"}
        </button>
        {state.status !== "idle" && (
          <span className={`text-xs ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
