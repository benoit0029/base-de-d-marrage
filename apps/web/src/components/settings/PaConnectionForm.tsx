"use client";

import { useActionState } from "react";
import { submitPaConnection, type PaConnectionState } from "@/app/actions/pa";

const initialState: PaConnectionState = { status: "idle", message: "" };

const statusBadge: Record<string, { text: string; cls: string }> = {
  DISCONNECTED: { text: "Non connecté", cls: "bg-slate-100 text-slate-600" },
  CONNECTED: { text: "Connecté", cls: "bg-emerald-100 text-emerald-800" },
  ERROR: { text: "Erreur", cls: "bg-red-100 text-red-700" },
};

export default function PaConnectionForm({ status }: { status: string }) {
  const [state, formAction, pending] = useActionState(submitPaConnection, initialState);
  const badge = statusBadge[status] ?? statusBadge.DISCONNECTED;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Fournisseur : Abby (plan gratuit ou payant selon l&apos;accès API
          requis — à vérifier sur docs.abby.fr).
        </p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
          {badge.text}
        </span>
      </div>
      <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2">
        <input
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder="Clé API Abby"
          className="min-w-[240px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Test en cours…" : "Connecter Abby"}
        </button>
      </form>
      {state.status !== "idle" && (
        <p className={`mt-2 text-xs ${state.status === "connected" ? "text-emerald-700" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
