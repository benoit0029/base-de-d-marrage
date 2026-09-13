"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendInvoiceToPaAction } from "@/app/actions/pa";

export default function SendToPaButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await sendInvoiceToPaAction(invoiceId);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs font-medium text-slate-600 underline disabled:opacity-50"
      >
        {isPending ? "Envoi…" : "Envoyer via Abby"}
      </button>
      {error && <span className="max-w-[180px] text-right text-[11px] text-red-600">{error}</span>}
    </div>
  );
}
