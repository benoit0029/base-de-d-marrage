"use client";

import { useActionState } from "react";
import { submitCompanySettings, type SettingsFormState } from "@/app/actions/settings";

const initialState: SettingsFormState = { status: "idle", message: "" };

export default function CompanySettingsForm({
  initial,
}: {
  initial: {
    legalName: string;
    address: string;
    siren: string;
    vatNumber: string;
  };
}) {
  const [state, formAction, pending] = useActionState(submitCompanySettings, initialState);

  return (
    <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="text-sm">
        <span className="text-slate-600">Nom / raison sociale</span>
        <input
          name="legalName"
          defaultValue={initial.legalName}
          placeholder="Ex. Ferme de Kerbooth"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-600">SIREN</span>
        <input
          name="siren"
          defaultValue={initial.siren}
          placeholder="123 456 789"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm sm:col-span-2">
        <span className="text-slate-600">Adresse</span>
        <input
          name="address"
          defaultValue={initial.address}
          placeholder="Adresse complète de l'exploitation"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-600">TVA intracommunautaire</span>
        <input
          name="vatNumber"
          defaultValue={initial.vatNumber}
          placeholder="FR XX 123456789"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
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
