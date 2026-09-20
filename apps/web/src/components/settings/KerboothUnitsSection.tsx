"use client";

import { useActionState, useTransition } from "react";
import { submitKerboothUnit, toggleKerboothUnitAction, type KerboothUnitFormState } from "@/app/actions/kerbooth";

const initialState: KerboothUnitFormState = { status: "idle", message: "" };

export interface KerboothUnitView {
  id: string;
  label: string;
  baseLocation: string;
  ownerLabel: string;
  active: boolean;
}

function UnitRow({ unit }: { unit: KerboothUnitView }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="flex items-center justify-between py-2 text-sm">
      <span>
        <span className="font-medium">{unit.label}</span> — {unit.baseLocation} ({unit.ownerLabel})
      </span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => startTransition(() => toggleKerboothUnitAction(unit.id, !unit.active))}
        className={`rounded-md border px-2.5 py-1 text-xs font-medium disabled:opacity-50 ${
          unit.active
            ? "border-slate-300 text-slate-600"
            : "border-amber-300 bg-amber-50 text-amber-700"
        }`}
      >
        {isPending ? "…" : unit.active ? "Active" : "Désactivée"}
      </button>
    </li>
  );
}

export default function KerboothUnitsSection({ units }: { units: KerboothUnitView[] }) {
  const [state, formAction, pending] = useActionState(submitKerboothUnit, initialState);

  return (
    <section className="rounded-lg border bg-white p-4 md:p-6">
      <h2 className="text-lg font-semibold text-slate-800">Kerbooth 360° — Unités</h2>
      <p className="mt-1 text-sm text-slate-500">
        Une unité = un photobooth + son iPhone associé (même nom collé en
        sticker sur les deux). Le dispatch automatique des réservations
        (voir kerbooth360/architecture-technique-kerbooth360.md) ne choisit
        qu'entre les unités actives.
      </p>

      {units.length > 0 && (
        <ul className="mt-4 divide-y divide-slate-100">
          {units.map((u) => (
            <UnitRow key={u.id} unit={u} />
          ))}
        </ul>
      )}

      <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-slate-600">Nom (ex. nom de fleur)</span>
          <input
            name="label"
            required
            placeholder="Camélia"
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Lieu de base</span>
          <input
            name="baseLocation"
            required
            defaultValue="Tourc'h"
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          {pending ? "Ajout…" : "Ajouter l'unité"}
        </button>
        {state.status !== "idle" && (
          <span className={`text-xs ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {state.message}
          </span>
        )}
      </form>
    </section>
  );
}
