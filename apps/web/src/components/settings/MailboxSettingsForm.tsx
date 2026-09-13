"use client";

import { useActionState } from "react";
import { submitMailboxConnection, type MailboxFormState } from "@/app/actions/mailboxes";
import type { Activity } from "@prisma/client";

const initialState: MailboxFormState = { status: "idle", message: "" };

const statusBadge: Record<string, { text: string; cls: string }> = {
  NOT_TESTED: { text: "Jamais testée", cls: "bg-slate-100 text-slate-600" },
  CONNECTED: { text: "Connectée", cls: "bg-emerald-100 text-emerald-800" },
  ERROR: { text: "Erreur", cls: "bg-red-100 text-red-700" },
};

export default function MailboxSettingsForm({
  activity,
  label,
  initial,
}: {
  activity: Activity;
  label: string;
  initial: {
    imapHost: string;
    imapPort: number;
    imapUser: string;
    hasPassword: boolean;
    status: string;
    lastError: string | null;
  };
}) {
  const boundAction = submitMailboxConnection.bind(null, activity);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const badge = statusBadge[initial.status] ?? statusBadge.NOT_TESTED;

  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
          {badge.text}
        </span>
      </div>
      {initial.status === "ERROR" && initial.lastError && (
        <p className="mt-1 text-xs text-red-600">{initial.lastError}</p>
      )}

      <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-slate-600">Hôte IMAP</span>
          <input
            name="imapHost"
            defaultValue={initial.imapHost}
            placeholder="imap.exemple.fr"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Port</span>
          <input
            name="imapPort"
            type="number"
            defaultValue={initial.imapPort}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Identifiant</span>
          <input
            name="imapUser"
            defaultValue={initial.imapUser}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">
            Mot de passe {initial.hasPassword && "(laisser vide pour conserver l'actuel)"}
          </span>
          <input
            name="imapPassword"
            type="password"
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        <div className="sm:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
          >
            {pending ? "Test en cours…" : "Enregistrer et tester la connexion"}
          </button>
          {state.status !== "idle" && (
            <span
              className={`text-xs ${state.status === "connected" ? "text-emerald-700" : "text-red-600"}`}
            >
              {state.message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
