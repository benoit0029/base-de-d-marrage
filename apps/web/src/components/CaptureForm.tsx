"use client";

import { useActionState } from "react";
import { captureDocument, type CaptureState } from "@/app/actions/capture";

const statusStyles: Record<string, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  noise: "border-slate-200 bg-slate-50 text-slate-600",
  error: "border-red-200 bg-red-50 text-red-700",
};

const initialState: CaptureState = { status: "idle", message: "" };

export default function CaptureForm() {
  const [state, formAction, pending] = useActionState(captureDocument, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <p className="text-sm font-medium text-slate-700">
          Ajouter une facture ou un reçu
        </p>
        <p className="text-xs text-slate-500">
          Photo prise sur le terrain ou fichier (PDF/image) : l&apos;IA lit le
          document, le classe et crée une écriture en attente de validation.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="file"
          name="file"
          accept="image/*,application/pdf"
          capture="environment"
          required
          className="text-sm text-slate-600 file:mr-2 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <button
          type="submit"
          disabled={pending}
          className="whitespace-nowrap rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Analyse en cours…" : "Envoyer"}
        </button>
      </div>
      {state.status !== "idle" && (
        <p
          className={`rounded-md border px-3 py-2 text-sm sm:col-span-2 ${
            statusStyles[state.status] ?? ""
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
