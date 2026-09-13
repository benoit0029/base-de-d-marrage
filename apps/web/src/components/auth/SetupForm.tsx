"use client";

import { useActionState, useEffect, useState } from "react";
import {
  submitSetupAccount,
  submitSetupTotpConfirm,
  type AuthFormState,
} from "@/app/actions/auth";

const initialState: AuthFormState = { status: "idle", message: "" };

function AccountStep({ onSuccess }: { onSuccess: (qrCodeDataUrl: string, userId: string) => void }) {
  const [state, formAction, pending] = useActionState(submitSetupAccount, initialState);

  useEffect(() => {
    if (state.status === "success" && state.qrCodeDataUrl && state.userId) {
      onSuccess(state.qrCodeDataUrl, state.userId);
    }
  }, [state, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">Créer votre compte</h1>
        <p className="mt-1 text-sm text-slate-500">
          Première utilisation : ce compte unique administrera l&apos;outil.
          L&apos;authentification à deux facteurs est obligatoire, configurée
          juste après.
        </p>
      </div>
      <label className="block text-sm">
        <span className="text-slate-600">Email</span>
        <input
          name="email"
          type="email"
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="text-slate-600">Mot de passe (8 caractères minimum)</span>
        <input
          name="password"
          type="password"
          minLength={8}
          required
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Création…" : "Continuer"}
      </button>
    </form>
  );
}

function TotpStep({ qrCodeDataUrl, userId }: { qrCodeDataUrl: string; userId: string }) {
  const boundAction = submitSetupTotpConfirm.bind(null, userId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Activer la double authentification
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Scannez ce QR code avec une application d&apos;authentification
          (Google Authenticator, Ente Auth, 1Password…), puis saisissez le
          code à 6 chiffres généré.
        </p>
      </div>
      {/* Data URI générée côté serveur, taille fixe connue : <img> convient mieux qu'un <Image> Next.js ici. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrCodeDataUrl} alt="QR code 2FA" className="mx-auto h-48 w-48" />
      <label className="block text-sm">
        <span className="text-slate-600">Code à 6 chiffres</span>
        <input
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-center text-lg tracking-widest"
        />
      </label>
      {state.status === "error" && <p className="text-sm text-red-600">{state.message}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Vérification…" : "Activer et se connecter"}
      </button>
    </form>
  );
}

export default function SetupForm({
  resumeTotp,
}: {
  resumeTotp?: { qrCodeDataUrl: string; userId: string };
}) {
  const [totpData, setTotpData] = useState<{ qrCodeDataUrl: string; userId: string } | null>(
    resumeTotp ?? null
  );

  return (
    <div className="mx-auto mt-16 max-w-sm rounded-lg border bg-white p-6 shadow-sm">
      {totpData ? (
        <TotpStep qrCodeDataUrl={totpData.qrCodeDataUrl} userId={totpData.userId} />
      ) : (
        <AccountStep onSuccess={(qrCodeDataUrl, userId) => setTotpData({ qrCodeDataUrl, userId })} />
      )}
    </div>
  );
}
