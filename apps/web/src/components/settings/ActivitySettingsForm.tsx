"use client";

import { useActionState } from "react";
import { submitActivitySettings, type SettingsFormState } from "@/app/actions/settings";
import type { Activity } from "@prisma/client";

const initialState: SettingsFormState = { status: "idle", message: "" };

export default function ActivitySettingsForm({
  activity,
  abEligible,
  companyContactEmail,
  initial,
}: {
  activity: Activity;
  abEligible: boolean;
  companyContactEmail: string;
  initial: {
    logoUrl: string | null;
    abCertificationCode: string | null;
    abLogoEnabled: boolean;
    invoicingEnabled: boolean;
    contactEmail: string;
    tvaInstallmentsEnabled: boolean;
    bankIban: string;
    bankBic: string;
  };
}) {
  const boundAction = submitActivitySettings.bind(null, activity);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="mt-2 grid gap-3 sm:grid-cols-2">
      <label className="text-sm">
        <span className="text-slate-600">Logo</span>
        <input
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/svg+xml"
          className="mt-1 w-full text-sm text-slate-500"
        />
        {initial.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={initial.logoUrl} alt="Logo actuel" className="mt-2 h-10 w-auto" />
        )}
      </label>

      {abEligible ? (
        <div className="text-sm">
          <label className="block">
            <span className="text-slate-600">Code organisme certificateur AB</span>
            <input
              name="abCertificationCode"
              defaultValue={initial.abCertificationCode ?? ""}
              placeholder="FR-BIO-XX"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="mt-2 flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              name="abLogoEnabled"
              defaultChecked={initial.abLogoEnabled}
              className="mt-0.5"
            />
            <span>
              Afficher le logo AB sur les factures/devis — à activer seulement
              après vérification du guide INAO « Règles d&apos;usage de la
              marque AB » (emplacement/taille non figés tant que ce n&apos;est
              pas confirmé).
            </span>
          </label>
        </div>
      ) : (
        <p className="self-end text-xs text-slate-400">
          Certification AB non applicable à cette activité.
        </p>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
        <input
          type="checkbox"
          name="invoicingEnabled"
          defaultChecked={initial.invoicingEnabled}
        />
        Facturation active pour cette activité
      </label>

      {activity === "BA_MARAICHAGE" && (
        <label className="flex items-start gap-2 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            name="tvaInstallmentsEnabled"
            defaultChecked={initial.tvaInstallmentsEnabled}
            className="mt-0.5"
          />
          <span>
            Acomptes trimestriels de TVA actifs (régime simplifié agricole).
            À décocher uniquement si vous êtes dispensé (TVA due l&apos;année
            précédente inférieure à 1 000 €, à vérifier vous-même chaque
            année) — le Registre TVA reste calculé dans tous les cas.
          </span>
        </label>
      )}

      <label className="text-sm sm:col-span-2">
        <span className="text-slate-600">
          Email de contact affiché sur les factures de cette activité
        </span>
        <input
          name="contactEmail"
          type="email"
          defaultValue={initial.contactEmail}
          placeholder={companyContactEmail || "contact@exploitation.fr"}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
        <span className="mt-1 block text-xs text-slate-400">
          Laissez vide pour reprendre l&apos;email de contact général
          {companyContactEmail ? ` (${companyContactEmail})` : ""}. Utile
          uniquement si la facturation est active pour cette activité.
        </span>
      </label>

      <label className="text-sm">
        <span className="text-slate-600">IBAN du compte pro de cette activité</span>
        <input
          name="bankIban"
          defaultValue={initial.bankIban}
          placeholder="FR76 …"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
        />
      </label>
      <label className="text-sm">
        <span className="text-slate-600">BIC</span>
        <input
          name="bankBic"
          defaultValue={initial.bankBic}
          placeholder="AGRIFRPP…"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
        />
      </label>
      <p className="-mt-1 text-xs text-slate-400 sm:col-span-2">
        Imprimé sur les factures à régler par virement (pas sur celles déjà
        payées par carte au moment de la facture). Laissez vide pour ne pas
        l&apos;afficher.
      </p>

      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
        {state.status !== "idle" && (
          <span
            className={`text-xs ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
