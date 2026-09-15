"use client";

import { useActionState } from "react";
import {
  submitFiscalYearClosure,
  type FiscalYearClosureFormState,
} from "@/app/actions/fiscalYearClosure";
import { toDocumentHref } from "@/lib/storage/url";

const initialState: FiscalYearClosureFormState = { status: "idle", message: "" };

export interface ClosureRecordView {
  year: number;
  closedAt: string;
  zipFileUrl: string | null;
}

export interface PendingBlockerView {
  label: string;
  count: number;
}

export default function FiscalYearClosureSection({
  closures,
  blockers,
  nextClosableYear,
}: {
  closures: ClosureRecordView[];
  blockers: PendingBlockerView[];
  nextClosableYear: number | null;
}) {
  const [state, formAction, pending] = useActionState(submitFiscalYearClosure, initialState);
  const canClose = blockers.length === 0 && nextClosableYear !== null;

  return (
    <section className="rounded-lg border bg-white p-4 md:p-6">
      <h2 className="text-lg font-semibold text-slate-800">Clôture d&apos;exercice</h2>
      <p className="mt-1 text-sm text-slate-500">
        Verrouille un exercice en lecture seule une fois qu&apos;il n&apos;y a plus aucune
        ligne en attente nulle part dans l&apos;application, et génère un dossier ZIP
        téléchargeable (synthèse, créances/dettes en cours, pièces sources).
        Ne bloque jamais sur les créances/dettes en cours : elles restent
        modifiables et rejoignent l&apos;exercice de leur règlement réel.
        Clôture uniquement possible dans l&apos;ordre chronologique.
      </p>

      {blockers.length > 0 && (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p className="font-medium">Lignes encore en attente — clôture impossible :</p>
          <ul className="mt-1 list-inside list-disc">
            {blockers.map((b, i) => (
              <li key={i}>
                {b.label} : {b.count} ligne{b.count > 1 ? "s" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {blockers.length === 0 && nextClosableYear === null && (
        <p className="mt-4 text-sm text-slate-500">
          Aucun exercice n&apos;attend de clôture pour le moment.
        </p>
      )}

      {canClose && (
        <form action={formAction} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="year" value={nextClosableYear} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            onClick={(e) => {
              if (
                !confirm(
                  `Clôturer l'exercice ${nextClosableYear} ? Cette action verrouille l'exercice en lecture seule et n'est pas réversible depuis l'interface.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            {pending ? "Clôture en cours…" : `Clôturer l'exercice ${nextClosableYear}`}
          </button>
          {state.status !== "idle" && (
            <span
              className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}
            >
              {state.message}
            </span>
          )}
        </form>
      )}

      {closures.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-slate-700">Exercices clôturés</h3>
          <ul className="mt-2 divide-y divide-slate-100 text-sm">
            {closures.map((c) => (
              <li key={c.year} className="flex items-center justify-between py-2">
                <span>
                  Exercice {c.year} — clôturé le {c.closedAt}
                </span>
                {c.zipFileUrl && (
                  <a
                    href={toDocumentHref(c.zipFileUrl)}
                    className="text-xs font-medium text-emerald-700 underline"
                  >
                    Télécharger le dossier ZIP
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
