"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Corrige le classement d'une dépense (achat courant ↔ immobilisation) quand
// la lecture automatique s'est trompée — voir reclassifyEntry.
export default function ReclassifyEntryButton({
  entryId,
  type,
}: {
  entryId: string;
  type: "achat" | "immobilisation";
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const target = type === "achat" ? "IMMOBILISATION" : "ACHAT";
  const targetLabel = type === "achat" ? "immobilisation" : "achat courant";

  function handleClick() {
    if (!window.confirm(`Classer cette dépense en ${targetLabel} ? Les montants ne changent pas.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(`/api/entries/${entryId}/reclassify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: target }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Échec");
        return;
      }
      router.refresh();
    });
  }

  return (
    <span className="block">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="text-xs text-slate-500 underline disabled:opacity-50"
        title="La lecture automatique s'est trompée de classement ? Corrige-le ici."
      >
        {busy ? "…" : `Corriger → ${targetLabel}`}
      </button>
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </span>
  );
}
