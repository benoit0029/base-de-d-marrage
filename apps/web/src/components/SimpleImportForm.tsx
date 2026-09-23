"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { submitSimpleImport, type SimpleImportFormState } from "@/app/actions/simpleImports";
import { readImportedDocument } from "@/app/actions/documentReading";
import type { Activity, SimpleImportCategory } from "@prisma/client";

const initialState: SimpleImportFormState = { status: "idle", message: "" };
const today = () => new Date().toISOString().slice(0, 10);

export interface SimpleImportCategoryOption {
  value: SimpleImportCategory;
  label: string;
}

export default function SimpleImportForm({
  activity,
  categoryOptions,
  amountRequired,
  showPeriod,
  revalidatePaths,
  title,
  description,
  readKind,
}: {
  activity: Activity;
  categoryOptions: SimpleImportCategoryOption[];
  amountRequired: boolean;
  showPeriod: boolean;
  revalidatePaths: string[];
  title: string;
  description: string;
  // Type de document attendu, pour la lecture automatique à la sélection du
  // fichier (voir readImportedDocument) — pré-remplit, ne valide rien.
  readKind: "tesa" | "cotisation_msa";
}) {
  const boundAction = submitSimpleImport.bind(null, activity, revalidatePaths);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const defaultCategory = categoryOptions[0]?.value ?? "";
  const [category, setCategory] = useState<string>(defaultCategory);
  const [date, setDate] = useState(today());
  const [period, setPeriod] = useState("");
  const [amount, setAmount] = useState("");
  const [readNotice, setReadNotice] = useState<string | null>(null);
  const [isReading, startReading] = useTransition();

  useEffect(() => {
    if (state.status === "success") {
      setCategory(defaultCategory);
      setDate(today());
      setPeriod("");
      setAmount("");
      setReadNotice(null);
    }
  }, [state, defaultCategory]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setReadNotice(null);
    const data = new FormData();
    data.set("file", file);
    startReading(async () => {
      const r = await readImportedDocument(readKind, data);
      if (r.status === "error") {
        setReadNotice(r.message ?? "Lecture automatique impossible — remplis les champs toi-même.");
        return;
      }
      const read: string[] = [];
      if (r.category && categoryOptions.some((o) => o.value === r.category)) {
        setCategory(r.category);
        read.push("type");
      }
      if (r.date) {
        setDate(r.date);
        read.push("date");
      }
      if (showPeriod && r.period) {
        setPeriod(r.period);
        read.push("période");
      }
      if (r.amount !== null) {
        setAmount(String(r.amount).replace(".", ","));
        read.push("montant");
      }
      setReadNotice(
        read.length > 0
          ? `Lu automatiquement : ${read.join(", ")} — vérifie avant d'importer.`
          : "Rien n'a pu être lu sur ce document — remplis les champs toi-même."
      );
    });
  }

  return (
    <form action={formAction} className="space-y-3 rounded-lg border bg-white p-4">
      <div>
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>

      <label className="block text-sm">
        <span className="text-slate-600">Fichier (PDF/image) — les champs se remplissent automatiquement</span>
        <input
          type="file"
          name="file"
          accept="application/pdf,image/*"
          required
          onChange={handleFileChange}
          className="mt-1 w-full text-sm text-slate-500"
        />
        {isReading && <span className="mt-1 block text-xs text-slate-400">Lecture automatique du document…</span>}
        {readNotice && !isReading && <span className="mt-1 block text-xs text-amber-700">{readNotice}</span>}
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        {categoryOptions.length > 1 ? (
          <label className="text-sm">
            <span className="text-slate-600">Type de document</span>
            <select
              name="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {categoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <input type="hidden" name="category" value={categoryOptions[0]?.value} />
        )}

        <label className="text-sm">
          <span className="text-slate-600">Date du document</span>
          <input
            type="date"
            name="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        {showPeriod && (
          <label className="text-sm">
            <span className="text-slate-600">Période concernée</span>
            <input
              type="text"
              name="period"
              placeholder="ex. 2026-09"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
        )}

        <label className="text-sm">
          <span className="text-slate-600">
            Montant TTC (€){amountRequired ? "" : " — optionnel"}
          </span>
          <input
            type="text"
            inputMode="decimal"
            name="amountTtc"
            placeholder="0,00"
            required={amountRequired}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      {state.status === "duplicate" && (
        <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          <input type="checkbox" name="confirmDuplicate" className="mt-0.5" />
          <span>Enregistrer quand même malgré le doublon probable détecté.</span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending || isReading}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Enregistrement…" : "Importer"}
        </button>
        {state.status !== "idle" && (
          <span
            className={`text-sm ${
              state.status === "success"
                ? "text-emerald-700"
                : state.status === "duplicate"
                  ? "text-amber-700"
                  : "text-red-600"
            }`}
          >
            {state.message}
          </span>
        )}
      </div>
    </form>
  );
}
