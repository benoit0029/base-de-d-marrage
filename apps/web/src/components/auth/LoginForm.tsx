"use client";

import { useActionState } from "react";
import { submitLogin, type AuthFormState } from "@/app/actions/auth";

const initialState: AuthFormState = { status: "idle", message: "" };

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(submitLogin, initialState);

  return (
    <form action={formAction} className="mx-auto mt-16 max-w-sm space-y-4 rounded-lg border bg-white p-6 shadow-sm">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Connexion</h1>
        <p className="mt-1 text-sm text-slate-500">Compta ferme &amp; activités</p>
      </div>
      <label className="block text-sm">
        <span className="text-slate-600">Email</span>
        <input
          name="email"
          type="email"
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Mot de passe</span>
        <input
          name="password"
          type="password"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Connexion…" : "Continuer"}
      </button>
    </form>
  );
}
