"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelKerboothQuoteAction, sendKerboothQuoteAction } from "@/app/actions/invoices";
import type { KerboothQuoteView } from "@/lib/kerbooth/quoteView";

// Boutons du devis entreprise Kerbooth : « Envoyer au client » (bloque les
// photobooths, n8n envoie devis + contrat par Yousign) et annulation avant
// signature.
export default function KerboothQuoteActions({ quote }: { quote: KerboothQuoteView }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function run(action: () => Promise<{ status: string; message: string }>) {
    startTransition(async () => {
      const result = await action();
      setMessage({ ok: result.status === "success", text: result.message });
      router.refresh();
    });
  }

  return (
    <div className="space-y-1 text-right">
      {quote.status === "DRAFT" && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(`Envoyer le devis et le contrat à signer à ${quote.clientEmail} ?`)) {
              run(() => sendKerboothQuoteAction(quote.id));
            }
          }}
          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {pending ? "Envoi…" : "Envoyer au client"}
        </button>
      )}
      {["DRAFT", "TO_SEND", "SENT"].includes(quote.status) && (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Annuler ce devis ? Les photobooths bloqués seront libérés.")) {
              run(() => cancelKerboothQuoteAction(quote.id));
            }
          }}
          className="block w-full text-xs text-red-600 underline disabled:opacity-50"
        >
          Annuler le devis
        </button>
      )}
      {quote.units.length > 0 && ["TO_SEND", "SENT", "SIGNED"].includes(quote.status) && (
        <span className="block text-xs text-slate-500">Photobooths : {quote.units.join(", ")}</span>
      )}
      {message && (
        <span className={`block text-xs ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</span>
      )}
    </div>
  );
}
