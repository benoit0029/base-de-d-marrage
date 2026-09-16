"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction, type CreateInvoiceActionInput } from "@/app/actions/invoices";
import type { FakeClient, FakeProduct } from "@/lib/types";
import type { Activity } from "@prisma/client";

interface LineDraft {
  description: string;
  quantity: string;
  unitPrice: string;
  vatRate: string;
}

const emptyLine: LineDraft = { description: "", quantity: "1", unitPrice: "", vatRate: "0" };

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function InvoiceForm({
  activity,
  vatApplicable,
  accentColorHex,
  clients,
  products,
}: {
  activity: Activity;
  vatApplicable: boolean;
  accentColorHex: string;
  clients: FakeClient[];
  products: FakeProduct[];
}) {
  const router = useRouter();
  const [type, setType] = useState<"DEVIS" | "FACTURE">("FACTURE");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [lines, setLines] = useState<LineDraft[]>([{ ...emptyLine }]);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const input: CreateInvoiceActionInput = {
      activity,
      type,
      clientName,
      clientAddress: clientAddress || undefined,
      issueDate,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        vatRate: vatApplicable ? Number(l.vatRate) : 0,
      })),
    };

    startTransition(async () => {
      const result = await createInvoiceAction(input);
      if (result.status === "error") {
        setMessage({ kind: "error", text: result.message });
        return;
      }
      setMessage({ kind: "success", text: result.message });
      setClientName("");
      setClientAddress("");
      setLines([{ ...emptyLine }]);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {(["FACTURE", "DEVIS"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                type === t ? "text-white" : "border border-slate-300 text-slate-600"
              }`}
              style={type === t ? { backgroundColor: accentColorHex } : undefined}
            >
              {t === "FACTURE" ? "Facture" : "Devis"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {clients.length > 0 && (
          <label className="text-sm sm:col-span-2">
            <span className="text-slate-600">Client existant (répertoire)</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const client = clients.find((c) => c.id === e.target.value);
                if (client) {
                  setClientName(client.name);
                  setClientAddress(client.address ?? "");
                }
              }}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">— Nouveau client (ou saisie libre ci-dessous) —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-sm">
          <span className="text-slate-600">Client</span>
          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Adresse du client</span>
          <input
            value={clientAddress}
            onChange={(e) => setClientAddress(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Date</span>
          <input
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-500">
          <span className="col-span-5">Description</span>
          <span className="col-span-2">Qté</span>
          <span className="col-span-2">PU HT</span>
          <span className="col-span-2">{vatApplicable ? "TVA %" : ""}</span>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="space-y-1">
            {products.length > 0 && (
              <select
                defaultValue=""
                onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  if (product) {
                    updateLine(i, {
                      description: product.label,
                      unitPrice: String(product.defaultUnitPrice),
                      vatRate: String(product.vatRate),
                    });
                  }
                }}
                className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
              >
                <option value="">— Choisir un produit du catalogue —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            )}
            <div className="grid grid-cols-12 gap-2">
            <input
              placeholder="Description"
              value={line.description}
              onChange={(e) => updateLine(i, { description: e.target.value })}
              required
              className="col-span-5 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="Qté"
              value={line.quantity}
              onChange={(e) => updateLine(i, { quantity: e.target.value })}
              required
              className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="PU HT"
              value={line.unitPrice}
              onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
              required
              className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            {vatApplicable ? (
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="TVA %"
                value={line.vatRate}
                onChange={(e) => updateLine(i, { vatRate: e.target.value })}
                className="col-span-2 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            ) : (
              <span className="col-span-2 self-center text-xs text-slate-400">TVA non applicable</span>
            )}
            <button
              type="button"
              onClick={() => removeLine(i)}
              className="col-span-1 text-sm text-red-500"
              aria-label="Supprimer la ligne"
            >
              ✕
            </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addLine} className="text-sm font-medium text-slate-600">
          + Ajouter une ligne
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ backgroundColor: accentColorHex }}
        >
          {isPending ? "Création…" : `Créer ${type === "DEVIS" ? "le devis" : "la facture"}`}
        </button>
        {message && (
          <span className={`text-sm ${message.kind === "success" ? "text-emerald-700" : "text-red-600"}`}>
            {message.text}
          </span>
        )}
      </div>
    </form>
  );
}
