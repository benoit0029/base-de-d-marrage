"use client";

import { useActionState, useState } from "react";
import { submitClient, type ClientFormState } from "@/app/actions/clients";
import type { FakeClient } from "@/lib/types";
import type { Activity } from "@prisma/client";

const initialState: ClientFormState = { status: "idle", message: "" };

// Répertoire Clients (module Facturation) : chaque client tapé sur une
// facture y est déjà ajouté automatiquement (voir createInvoice) — ce petit
// écran sert à corriger/compléter une fiche à tout moment (SIRET, TVA
// intracommunautaire), pas à la saisie initiale.
export default function ClientRepository({
  activity,
  clients,
}: {
  activity: Activity;
  clients: FakeClient[];
}) {
  const [editing, setEditing] = useState<FakeClient | null>(null);
  const boundAction = submitClient.bind(null, activity);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">
        Répertoire clients ({clients.length})
      </summary>

      <form action={formAction} key={editing?.id ?? "new"} className="mt-3 grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <label className="text-sm">
          <span className="text-slate-600">Nom / raison sociale</span>
          <input
            name="name"
            defaultValue={editing?.name ?? ""}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Adresse</span>
          <input
            name="address"
            defaultValue={editing?.address ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">SIRET</span>
          <input
            name="siret"
            defaultValue={editing?.siret ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">TVA intracommunautaire</span>
          <input
            name="vatNumber"
            defaultValue={editing?.vatNumber ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter au répertoire"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-sm text-slate-500 underline"
            >
              Annuler la modification
            </button>
          )}
          {state.status !== "idle" && (
            <span className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
              {state.message}
            </span>
          )}
        </div>
      </form>

      {clients.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Nom</th>
                <th className="px-3 py-2">Adresse</th>
                <th className="px-3 py-2">SIRET</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c) => (
                <tr key={c.id}>
                  <td className="px-3 py-2 font-medium">{c.name}</td>
                  <td className="px-3 py-2 text-slate-600">{c.address ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{c.siret ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="text-xs font-medium text-slate-600 underline"
                    >
                      Modifier
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
