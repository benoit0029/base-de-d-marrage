"use client";

import { useActionState } from "react";
import { submitLoginTotp, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = { status: "idle", message: "" };

export default function TotpLoginForm() {
  const [state, formAction, pending] = useActionState(submitLoginTotp, initialState);

  return (
    <form action={formAction} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Code de vérification</h1>
        <p className="mt-1 text-sm text-slate-500">
          Saisissez le code à 6 chiffres de votre application d&apos;authentification.
        </p>
      </div>
      <label className="block text-sm">
        <span className="text-slate-600">Code</span>
        <input
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
        />
      </label>
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Vérification…" : "Se connecter"}
      </button>
    </form>
  );
}
