"use client";

import { useActionState } from "react";
import { saveBicSocialRegime, type BicSocialState } from "@/app/actions/bicSocial";
import { BIC_SOCIAL_LABEL, BIC_SOCIAL_REGIMES, type BicSocialRegime } from "@/lib/bic/social";

const initialState: BicSocialState = { status: "idle", message: "" };

export default function BicSocialRegimeForm({ current }: { current: BicSocialRegime | null }) {
  const [state, formAction, pending] = useActionState(saveBicSocialRegime, initialState);
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="text-sm">
        <span className="text-slate-600">Mes cotisations sociales micro-BIC</span>
        <select
          name="regime"
          defaultValue={current ?? ""}
          required
          className="mt-1 block rounded-md border border-slate-300 px-3 py-2"
        >
          <option value="" disabled>
            — À choisir —
          </option>
          {BIC_SOCIAL_REGIMES.map((r) => (
            <option key={r} value={r}>
              {BIC_SOCIAL_LABEL[r]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "…" : "Enregistrer"}
      </button>
      {state.status !== "idle" && (
        <span className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </span>
      )}
    </form>
  );
}
