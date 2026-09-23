"use client";

import { useActionState, useState, useTransition } from "react";
import {
  confirmBicVatLiability,
  cancelBicVatLiability,
  type BicVatFormState,
} from "@/app/actions/bicVat";

const initialState: BicVatFormState = { status: "idle", message: "" };

export default function BicVatSwitchForm({
  proposedDate,
  vatNumber,
  pricing,
  confirmed,
}: {
  proposedDate: string; // YYYY-MM-DD, date d'effet proposée par la détection
  vatNumber: string;
  pricing: "INCLUDED" | "ADDED";
  confirmed: boolean;
}) {
  const [state, formAction, pending] = useActionState(confirmBicVatLiability, initialState);
  const [cancelMessage, setCancelMessage] = useState<BicVatFormState | null>(null);
  const [isCancelling, startCancel] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);

  function handleCancel() {
    if (!confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    startCancel(async () => {
      setCancelMessage(await cancelBicVatLiability());
      setConfirmCancel(false);
    });
  }

  return (
    <div className="space-y-3">
      <form action={formAction} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-slate-600">Date d&apos;effet (TVA appliquée à partir de ce jour)</span>
            <input
              type="date"
              name="liableFrom"
              defaultValue={proposedDate}
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="text-slate-600">Numéro de TVA intracommunautaire</span>
            <input
              type="text"
              name="vatNumber"
              defaultValue={vatNumber}
              placeholder="FR12533242053"
              required
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        </div>

        <fieldset className="text-sm">
          <legend className="text-slate-600">Prix Kerbooth pour le client</legend>
          <label className="mt-1 flex items-start gap-2">
            <input type="radio" name="pricing" value="INCLUDED" defaultChecked={pricing === "INCLUDED"} className="mt-1" />
            <span>
              <strong>Prix inchangé</strong> — 250 € restent 250 € TTC, la TVA (20 %) est prise sur ta marge. Rien
              à modifier sur le site.
            </span>
          </label>
          <label className="mt-1 flex items-start gap-2">
            <input type="radio" name="pricing" value="ADDED" defaultChecked={pricing === "ADDED"} className="mt-1" />
            <span>
              <strong>Prix + 20 %</strong> — 250 € deviennent 300 € TTC. Les nouvelles réservations sont facturées au
              prix majoré ; pense à mettre à jour les prix affichés sur kerbooth360.fr.
            </span>
          </label>
        </fieldset>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : confirmed ? "Mettre à jour" : "Confirmer la sortie de franchise"}
          </button>
          {state.status !== "idle" && (
            <span className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
              {state.message}
            </span>
          )}
        </div>
      </form>

      {confirmed && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isCancelling}
            className="text-xs font-medium text-red-600 underline disabled:opacity-50"
          >
            {confirmCancel ? "Confirmer l'annulation (retour à la franchise)" : "Annuler la bascule (erreur de saisie)"}
          </button>
          {cancelMessage && (
            <span className={`text-xs ${cancelMessage.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
              {cancelMessage.message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
