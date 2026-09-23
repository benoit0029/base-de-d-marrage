"use client";

import { useActionState, useState, useTransition } from "react";
import { removeProduct, submitProduct, type ProductFormState } from "@/app/actions/products";
import { formatEuro } from "@/lib/format";
import { defaultVatRate, formatRate } from "@/lib/invoicing/options";
import VatRateSelect from "@/components/invoicing/VatRateSelect";
import type { FakeProduct } from "@/lib/types";
import type { Activity } from "@prisma/client";

const initialState: ProductFormState = { status: "idle", message: "" };

// Catalogue Produits/Prestations (module Facturation) : chaque désignation
// tapée sur une facture y est déjà ajoutée automatiquement, avec le prix et
// le taux de TVA de cette première facture (voir createInvoice) — ce petit
// écran sert à corriger un prix délibérément par la suite, jamais écrasé
// silencieusement par une remise ponctuelle sur une facture ultérieure.
export default function ProductCatalog({
  activity,
  products,
  vatApplicable,
}: {
  activity: Activity;
  products: FakeProduct[];
  vatApplicable: boolean;
}) {
  const [editing, setEditing] = useState<FakeProduct | null>(null);
  const boundAction = submitProduct.bind(null, activity);
  const [state, formAction, pending] = useActionState(boundAction, initialState);
  const [deleteMessage, setDeleteMessage] = useState<ProductFormState | null>(null);
  const [deleting, startDelete] = useTransition();

  function handleDelete(p: FakeProduct) {
    if (!window.confirm(`Retirer « ${p.label} » du catalogue ? Les factures déjà faites ne changent pas.`)) return;
    startDelete(async () => {
      setDeleteMessage(await removeProduct(activity, p.id));
      if (editing?.id === p.id) setEditing(null);
    });
  }

  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-700">
        Catalogue produits/prestations ({products.length})
      </summary>

      <form action={formAction} key={editing?.id ?? "new"} className="mt-3 grid gap-3 sm:grid-cols-3">
        <input type="hidden" name="id" value={editing?.id ?? ""} />
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">Désignation</span>
          <input
            name="label"
            defaultValue={editing?.label ?? ""}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Unité (kg, pièce, botte…)</span>
          <input
            name="unit"
            list="unit-suggestions" // suggestions fournies par InvoiceForm, toujours sur la même page
            defaultValue={editing?.unit ?? ""}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-600">Prix unitaire HT par défaut (€)</span>
          <input
            type="text"
            inputMode="decimal"
            name="defaultUnitPrice"
            defaultValue={editing ? String(editing.defaultUnitPrice) : ""}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        {vatApplicable && (
          <label className="text-sm">
            <span className="text-slate-600">Taux de TVA (%)</span>
            <VatRateSelect
              name="vatRate"
              defaultValue={String(editing ? editing.vatRate : defaultVatRate(activity))}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        )}
        <div className="flex items-center gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : editing ? "Mettre à jour" : "Ajouter au catalogue"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="text-sm text-slate-500 underline"
            >
              Annuler la modification
            </button>
          )}
          {state.status !== "idle" && (
            <span className={`text-sm ${state.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
              {state.message}
            </span>
          )}
        </div>
      </form>

      {deleteMessage && (
        <p className={`mt-3 text-sm ${deleteMessage.status === "success" ? "text-emerald-700" : "text-red-600"}`}>
          {deleteMessage.message}
        </p>
      )}

      {products.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Désignation</th>
                <th className="px-3 py-2">Unité</th>
                <th className="px-3 py-2 text-right">Prix unitaire HT</th>
                {vatApplicable && <th className="px-3 py-2 text-right">TVA</th>}
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p.id}>
                  <td className="px-3 py-2 font-medium">{p.label}</td>
                  <td className="px-3 py-2 text-slate-600">{p.unit ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{formatEuro(p.defaultUnitPrice)}</td>
                  {vatApplicable && <td className="px-3 py-2 text-right">{formatRate(p.vatRate)}</td>}
                  <td className="space-x-3 whitespace-nowrap px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(p)}
                      className="text-xs font-medium text-slate-600 underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p)}
                      disabled={deleting}
                      className="text-xs font-medium text-red-600 underline disabled:opacity-50"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </details>
  );
}
