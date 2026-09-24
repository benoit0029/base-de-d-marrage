"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Activity } from "@prisma/client";

const ACTIVITY_LABEL: Record<Activity, string> = {
  BA_MARAICHAGE: "Maraîchage",
  BIC_FRUITS_LEGUMES: "Revente Fruits/Légumes",
  BIC_PHOTOBOOTH: "Kerbooth 360",
};

// Déplace une dépense rangée dans la mauvaise activité — voir
// changeEntryActivity (refusé si rapprochée d'un relevé bancaire).
export default function ChangeActivityButton({ entryId, current }: { entryId: string; current: Activity }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const others = (Object.keys(ACTIVITY_LABEL) as Activity[]).filter((a) => a !== current);

  function move(target: Activity) {
    if (!window.confirm(`Déplacer cette dépense vers ${ACTIVITY_LABEL[target]} ? Elle disparaîtra de cet onglet.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/entries/${entryId}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activity: target }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Échec");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="whitespace-nowrap rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700"
      >
        Changer d&apos;activité
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {others.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => move(a)}
          disabled={busy}
          className="whitespace-nowrap rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 disabled:opacity-50"
        >
          → {ACTIVITY_LABEL[a]}
        </button>
      ))}
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 underline">
        Annuler
      </button>
      {error && <span className="max-w-[14rem] text-right text-xs text-red-600">{error}</span>}
    </span>
  );
}
