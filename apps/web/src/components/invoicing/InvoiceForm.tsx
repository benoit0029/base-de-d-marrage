"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction, type CreateInvoiceActionInput } from "@/app/actions/invoices";
import { quickCreateProduct } from "@/app/actions/products";
import { quickCreateClient } from "@/app/actions/clients";
import { defaultVatRate } from "@/lib/invoicing/options";
import VatRateSelect from "@/components/invoicing/VatRateSelect";
import UnitSuggestions from "@/components/invoicing/UnitSuggestions";
import type { FakeClient, FakeProduct } from "@/lib/types";
import type { Activity } from "@prisma/client";
import { formatEuro } from "@/lib/format";

const round2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: string) => Number(v.replace(",", "."));

// Totaux HT/TTC d'une ligne en cours de saisie, calculés comme à la création
// de la facture (TVA de la ligne arrondie au centime).
function lineTotals(line: { quantity: string; unitPrice: string; vatRate: string }, vatApplicable: boolean) {
  const ht = round2(num(line.quantity) * num(line.unitPrice));
  const vat = vatApplicable ? round2((ht * num(line.vatRate)) / 100) : 0;
  return Number.isFinite(ht) && Number.isFinite(vat) ? { ht, ttc: round2(ht + vat) } : null;
}

interface LineDraft {
  productId: string;
  description: string;
  quantity: string;
  unit: string;
  unitPrice: string;
  vatRate: string;
}

// Valeur spéciale des listes déroulantes : ouvre la petite fiche de création.
const NEW = "__new__";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const inputClass = "rounded-md border border-slate-300 px-2 py-1.5 text-sm";

// Ajoute les fiches créées pendant la saisie aux listes reçues du serveur,
// le temps que la page se rafraîchisse (sans doublon une fois rafraîchie).
function mergeById<T extends { id: string }>(base: T[], added: T[]): T[] {
  const ids = new Set(base.map((x) => x.id));
  return [...base, ...added.filter((x) => !ids.has(x.id))];
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
  const emptyLine = (): LineDraft => ({
    productId: "",
    description: "",
    quantity: "1",
    unit: "",
    unitPrice: "",
    vatRate: String(defaultVatRate(activity)),
  });

  const [type, setType] = useState<"DEVIS" | "FACTURE">("FACTURE");
  const [clientId, setClientId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const [addedClients, setAddedClients] = useState<FakeClient[]>([]);
  const [addedProducts, setAddedProducts] = useState<FakeProduct[]>([]);
  const allClients = mergeById(clients, addedClients).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const allProducts = mergeById(products, addedProducts).sort((a, b) => a.label.localeCompare(b.label, "fr"));

  // Petite fiche de création rapide (client, ou produit pour la ligne n°).
  const [newClient, setNewClient] = useState<{ name: string; address: string; siret: string; vatNumber: string } | null>(null);
  const [newProduct, setNewProduct] = useState<{
    line: number;
    label: string;
    unit: string;
    defaultUnitPrice: string;
    vatRate: string;
  } | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickPending, startQuick] = useTransition();

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function fillLineFromProduct(index: number, product: FakeProduct) {
    updateLine(index, {
      productId: product.id,
      description: product.label,
      unit: product.unit ?? "",
      unitPrice: String(product.defaultUnitPrice),
      vatRate: String(product.vatRate),
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(index: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
    setNewProduct(null);
  }

  function selectClient(id: string) {
    setQuickError(null);
    if (id === NEW) {
      setNewClient({ name: "", address: "", siret: "", vatNumber: "" });
      return;
    }
    setNewClient(null);
    setClientId(id);
    const client = allClients.find((c) => c.id === id);
    if (client) {
      setClientName(client.name);
      setClientAddress(client.address ?? "");
    }
  }

  function selectProduct(index: number, id: string) {
    setQuickError(null);
    if (id === NEW) {
      setNewProduct({
        line: index,
        label: "",
        unit: "",
        defaultUnitPrice: "",
        vatRate: String(defaultVatRate(activity)),
      });
      return;
    }
    setNewProduct(null);
    const product = allProducts.find((p) => p.id === id);
    if (product) fillLineFromProduct(index, product);
    else updateLine(index, { productId: "" });
  }

  function saveNewClient() {
    if (!newClient) return;
    startQuick(async () => {
      const result = await quickCreateClient(activity, newClient);
      if (result.status === "error") {
        setQuickError(result.message);
        return;
      }
      setAddedClients((prev) => [...prev, result.client]);
      setClientId(result.client.id);
      setClientName(result.client.name);
      setClientAddress(result.client.address ?? "");
      setNewClient(null);
      setQuickError(null);
      router.refresh();
    });
  }

  function saveNewProduct() {
    if (!newProduct) return;
    const { line, ...raw } = newProduct;
    startQuick(async () => {
      const result = await quickCreateProduct(activity, {
        ...raw,
        vatRate: vatApplicable ? raw.vatRate : "0",
      });
      if (result.status === "error") {
        setQuickError(result.message);
        return;
      }
      setAddedProducts((prev) => [...prev, result.product]);
      fillLineFromProduct(line, result.product);
      setNewProduct(null);
      setQuickError(null);
      router.refresh();
    });
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
        unit: l.unit.trim() || undefined,
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
      setClientId("");
      setClientName("");
      setClientAddress("");
      setLines([emptyLine()]);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border bg-white p-4">
      <UnitSuggestions />
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
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Client (répertoire)</span>
          <select
            value={newClient ? NEW : clientId}
            onChange={(e) => selectClient(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">— Choisir un client (ou saisie libre ci-dessous) —</option>
            {allClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
            <option value={NEW}>+ Créer un nouveau client…</option>
          </select>
        </label>

        {newClient && (
          <div
            onKeyDown={(e) => onEnter(e, saveNewClient)}
            className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3 sm:col-span-2"
          >
            <p className="text-sm font-medium text-slate-700">Nouveau client</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                placeholder="Nom / raison sociale *"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="Adresse"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="SIRET (professionnels)"
                value={newClient.siret}
                onChange={(e) => setNewClient({ ...newClient, siret: e.target.value })}
                className={inputClass}
              />
              <input
                placeholder="N° TVA intracommunautaire"
                value={newClient.vatNumber}
                onChange={(e) => setNewClient({ ...newClient, vatNumber: e.target.value })}
                className={inputClass}
              />
            </div>
            <QuickActions
              pending={quickPending}
              error={quickError}
              onSave={saveNewClient}
              onCancel={() => {
                setNewClient(null);
                setQuickError(null);
              }}
            />
          </div>
        )}

        <label className="text-sm">
          <span className="text-slate-600">Client</span>
          <input
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
              setClientId("");
            }}
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
          <span className="col-span-4">Description</span>
          <span className="col-span-1">Qté</span>
          <span className="col-span-2">Unité</span>
          <span className="col-span-2">PU HT</span>
          <span className="col-span-2">{vatApplicable ? "TVA" : ""}</span>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="space-y-1">
            <select
              value={newProduct?.line === i ? NEW : line.productId}
              onChange={(e) => selectProduct(i, e.target.value)}
              className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500"
            >
              <option value="">— Choisir un produit du catalogue —</option>
              {allProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.unit ? ` (${p.unit})` : ""}
                </option>
              ))}
              <option value={NEW}>+ Créer un nouveau produit…</option>
            </select>

            {newProduct?.line === i && (
              <div
                onKeyDown={(e) => onEnter(e, saveNewProduct)}
                className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3"
              >
                <p className="text-sm font-medium text-slate-700">Nouveau produit (ajouté au catalogue)</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <input
                    placeholder="Désignation *"
                    value={newProduct.label}
                    onChange={(e) => setNewProduct({ ...newProduct, label: e.target.value })}
                    className={`col-span-2 ${inputClass}`}
                  />
                  <input
                    placeholder="Unité (kg, botte…)"
                    list="unit-suggestions"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({ ...newProduct, unit: e.target.value })}
                    className={inputClass}
                  />
                  <input
                    placeholder="Prix HT *"
                    inputMode="decimal"
                    value={newProduct.defaultUnitPrice}
                    onChange={(e) => setNewProduct({ ...newProduct, defaultUnitPrice: e.target.value })}
                    className={inputClass}
                  />
                  {vatApplicable && (
                    <VatRateSelect
                      value={newProduct.vatRate}
                      onChange={(v) => setNewProduct({ ...newProduct, vatRate: v })}
                      className={inputClass}
                    />
                  )}
                </div>
                <QuickActions
                  pending={quickPending}
                  error={quickError}
                  onSave={saveNewProduct}
                  onCancel={() => {
                    setNewProduct(null);
                    setQuickError(null);
                  }}
                />
              </div>
            )}

            <div className="grid grid-cols-12 gap-2">
              <input
                placeholder="Description"
                value={line.description}
                onChange={(e) => updateLine(i, { description: e.target.value })}
                required
                className={`col-span-4 ${inputClass}`}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Qté"
                value={line.quantity}
                onChange={(e) => updateLine(i, { quantity: e.target.value })}
                required
                className={`col-span-1 ${inputClass}`}
              />
              <input
                placeholder="kg…"
                list="unit-suggestions"
                value={line.unit}
                onChange={(e) => updateLine(i, { unit: e.target.value })}
                className={`col-span-2 ${inputClass}`}
              />
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="PU HT"
                value={line.unitPrice}
                onChange={(e) => updateLine(i, { unitPrice: e.target.value })}
                required
                className={`col-span-2 ${inputClass}`}
              />
              {vatApplicable ? (
                <VatRateSelect
                  value={line.vatRate}
                  onChange={(v) => updateLine(i, { vatRate: v })}
                  className={`col-span-2 ${inputClass}`}
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
            {(() => {
              const t = lineTotals(line, vatApplicable);
              return t && t.ht > 0 ? (
                <p className="text-right text-xs text-slate-500">
                  Total ligne : {formatEuro(t.ht)} HT{vatApplicable ? ` · ${formatEuro(t.ttc)} TTC` : ""}
                </p>
              ) : null;
            })()}
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

// Entrée dans une fiche de création rapide enregistre la fiche, sans jamais
// soumettre (donc créer) la facture en cours de saisie.
function onEnter(e: React.KeyboardEvent, save: () => void) {
  if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
    e.preventDefault();
    save();
  }
}

function QuickActions({
  pending,
  error,
  onSave,
  onCancel,
}: {
  pending: boolean;
  error: string | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
      <button type="button" onClick={onCancel} className="text-sm text-slate-500 underline">
        Annuler
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
