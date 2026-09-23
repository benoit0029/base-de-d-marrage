"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import type { Activity } from "@prisma/client";

export interface BankStatementImportView {
  fileHash: string;
  count: number;
  minDate: string;
  maxDate: string;
}

// Permet de supprimer en un clic toutes les lignes d'un même relevé importé
// (import de test, mauvais fichier) plutôt que de forcer une suppression
// ligne par ligne dans le tableau — voir deleteBankStatementImport.
export default function BankStatementImportsList({
  activity,
  imports,
}: {
  activity: Activity;
  imports: BankStatementImportView[];
}) {
  const router = useRouter();
  const [busyHash, setBusyHash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (imports.length === 0) return null;

  function handleDelete(imp: BankStatementImportView) {
    const confirmMessage =
      imp.count === 1
        ? "Supprimer cette opération importée ?"
        : `Supprimer les ${imp.count} opérations de ce relevé importé ?`;
    if (!confirm(confirmMessage)) return;
    setError(null);
    setBusyHash(imp.fileHash);
    startTransition(async () => {
      const res = await fetch(`/api/bank-transactions/imports/${imp.fileHash}?activity=${activity}`, {
        method: "DELETE",
      });
      setBusyHash(null);
      if (!res.ok) {
        setError("Échec de la suppression.");
        return;
      }
      const result = await res.json();
      if (result.blocked > 0) {
        setError(
          `${result.blocked} ligne(s) n'ont pas pu être supprimées (exercice clôturé) — les autres ont été retirées.`
        );
      }
      router.refresh();
    });
  }

  return (
    <details className="rounded-lg border bg-white p-3 text-sm">
      <summary className="cursor-pointer font-medium text-slate-700">
        Relevés déjà importés ({imports.length})
      </summary>
      <ul className="mt-2 divide-y divide-slate-100">
        {imports.map((imp) => (
          <li key={imp.fileHash} className="flex items-center justify-between gap-3 py-2">
            <span className="text-slate-600">
              {imp.count} opération(s) — du {formatDate(imp.minDate)} au {formatDate(imp.maxDate)}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(imp)}
              disabled={isPending && busyHash === imp.fileHash}
              className="text-xs font-medium text-red-600 underline disabled:opacity-50"
            >
              {isPending && busyHash === imp.fileHash ? "…" : "Supprimer ce relevé"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </details>
  );
}
