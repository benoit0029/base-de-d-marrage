"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Bloc d'actions générique réutilisé sur tous les sous-onglets registre :
// "Valider" (ligne en attente), et un bouton de suppression dont le
// comportement change selon le statut — "Supprimer" (suppression réelle,
// ligne encore en attente) ou "Supprimer la ligne" (suppression douce,
// ligne déjà validée, conservée en base pour un contrôle fiscal éventuel).
export default function RegisterActions({
  pending,
  validateUrl,
  deleteUrl,
  deleteMethod,
  deleteLabel,
  confirmMessage,
  locked,
}: {
  pending: boolean;
  validateUrl?: string;
  deleteUrl: string;
  deleteMethod: "DELETE" | "POST";
  deleteLabel: string;
  confirmMessage: string;
  // Ligne déjà réglée (payée/encaissée) sur un exercice clôturé (voir
  // Module Clôture d'exercice) : le serveur refuse déjà la suppression,
  // ce booléen n'est qu'un affichage anticipé pour éviter l'aller-retour.
  locked?: boolean;
}) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleValidate() {
    if (!validateUrl) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(validateUrl, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Échec de la validation");
        return;
      }
      router.refresh();
    });
  }

  function handleDelete() {
    if (!confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const res = await fetch(deleteUrl, { method: deleteMethod });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Échec de la suppression");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {pending && validateUrl && (
          <button
            type="button"
            onClick={handleValidate}
            disabled={busy}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 disabled:opacity-50"
          >
            {busy ? "…" : "Valider"}
          </button>
        )}
        {locked ? (
          <span
            title="Exercice clôturé : cette ligne réglée n'est plus modifiable."
            className="text-xs font-medium text-slate-400"
          >
            🔒 Exercice clôturé
          </span>
        ) : (
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="text-xs font-medium text-red-600 underline disabled:opacity-50"
          >
            {busy ? "…" : deleteLabel}
          </button>
        )}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
