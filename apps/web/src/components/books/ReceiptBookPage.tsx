import Link from "next/link";
import { computeReceiptBook, RECEIPT_RATES, type ReceiptRow, type ReceiptTotals } from "@/lib/livres";
import type { Activity } from "@prisma/client";
import { formatEuro } from "@/lib/format";


const frDay = (d: Date) => d.toLocaleDateString("fr-FR");
const QUARTER_LABEL = ["1er trimestre", "2e trimestre", "3e trimestre", "4e trimestre"];

function AmountCells({ r, rates }: { r: ReceiptRow | ReceiptTotals; rates: readonly number[] }) {
  const cell = (n: number) => <td className="px-2 py-1.5 text-right tabular-nums">{n ? formatEuro(n) : "—"}</td>;
  return (
    <>
      {cell(r.cash)}
      {cell(r.check)}
      {cell(r.card)}
      {cell(r.other)}
      <td className="px-2 py-1.5 text-right font-medium tabular-nums">{formatEuro(r.ttc)}</td>
      {rates.map((rate) => (
        <FragmentCells key={rate} ht={r.byRate[rate as 5.5].ht} vat={r.byRate[rate as 5.5].vat} />
      ))}
    </>
  );
}

function FragmentCells({ ht, vat }: { ht: number; vat: number }) {
  return (
    <>
      <td className="px-2 py-1.5 text-right tabular-nums">{ht ? formatEuro(ht) : "—"}</td>
      <td className="px-2 py-1.5 text-right tabular-nums">{vat ? formatEuro(vat) : "—"}</td>
    </>
  );
}

const DESCRIPTION: Record<Activity, string> = {
  BA_MARAICHAGE:
    "Registre obligatoire, rempli tout seul à partir de tes saisies validées (Recettes, Facturation) : rien à ressaisir ici. Ordre des dates d'encaissement, espèces séparées des autres paiements, ventes de 76 € ou moins regroupées par jour, TVA par taux (il sert aussi de livre des ventes), totaux par trimestre et par an. Les saisies encore « en attente » n'y figurent pas tant qu'elles ne sont pas validées.",
  BIC_FRUITS_LEGUMES:
    "Livre-journal des recettes de ta micro-entreprise (activité Revente), rempli tout seul à partir de tes saisies validées : rien à ressaisir ici. Ordre des dates d'encaissement, mode de paiement, ventes de 76 € ou moins regroupées par jour, totaux par trimestre et par an. Les saisies encore « en attente » n'y figurent pas.",
  BIC_PHOTOBOOTH:
    "Livre-journal des recettes de ta micro-entreprise (activité Kerbooth), rempli tout seul à partir des factures encaissées (paiements des réservations, factures, avoirs remboursés) : rien à ressaisir ici. Ordre des dates d'encaissement, totaux par trimestre et par an.",
};

// Livre des recettes d'une activité — lecture seule, voir lib/livres. En
// Maraîchage, tient aussi lieu de livre des ventes (ventilation par taux).
// Colonnes de TVA seulement pour les taux présents dans l'année (aucune en
// micro-BIC sous franchise).
export default async function ReceiptBookPage({ activity, year }: { activity: Activity; year: number }) {
  const currentYear = new Date().getFullYear();
  const book = await computeReceiptBook(year, activity);
  const rates = RECEIPT_RATES.filter((r) =>
    activity === "BA_MARAICHAGE" ? r !== 20 || book.totals.byRate[20].ht !== 0 : book.totals.byRate[r].ht !== 0
  );
  const colCount = 8 + rates.length * 2;
  const pdfHref = `/api/livres/recettes/${year}/pdf?activity=${activity}`;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Livre des recettes {year}</p>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`?year=${year - 1}`} className="text-slate-500 underline">
              ← {year - 1}
            </Link>
            {year < currentYear && (
              <Link href={`?year=${year + 1}`} className="text-slate-500 underline">
                {year + 1} →
              </Link>
            )}
            <a href={pdfHref} className="font-medium text-slate-700 underline">
              PDF à imprimer
            </a>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">{DESCRIPTION[activity]}</p>
        {activity !== "BA_MARAICHAGE" && rates.length === 0 && (
          <p className="mt-1 text-xs text-slate-500">TVA non applicable (franchise en base) : pas de colonnes de TVA.</p>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-2 py-2">Date</th>
              <th className="px-2 py-2">Libellé</th>
              <th className="px-2 py-2">Justificatif</th>
              <th className="px-2 py-2 text-right">Espèces</th>
              <th className="px-2 py-2 text-right">Chèques</th>
              <th className="px-2 py-2 text-right">CB</th>
              <th className="px-2 py-2 text-right">Autres</th>
              <th className="px-2 py-2 text-right">Total TTC</th>
              {rates.map((rate) => (
                <FragmentHeaders key={rate} rate={rate} />
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {book.quarters.map((q) => (
              <QuarterBlock key={q.quarter} label={QUARTER_LABEL[q.quarter - 1]} rows={q.rows} totals={q.totals} rates={rates} colCount={colCount} />
            ))}
            <tr className="bg-slate-800 font-semibold text-white">
              <td className="px-2 py-2" colSpan={3}>
                Total {year}
              </td>
              <AmountCells r={book.totals} rates={rates} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FragmentHeaders({ rate }: { rate: number }) {
  const label = String(rate).replace(".", ",");
  return (
    <>
      <th className="px-2 py-2 text-right">HT {label} %</th>
      <th className="px-2 py-2 text-right">TVA {label} %</th>
    </>
  );
}

function QuarterBlock({
  label,
  rows,
  totals,
  rates,
  colCount,
}: {
  label: string;
  rows: ReceiptRow[];
  totals: ReceiptTotals;
  rates: readonly number[];
  colCount: number;
}) {
  return (
    <>
      <tr className="bg-slate-50">
        <td className="px-2 py-1.5 font-semibold text-slate-600" colSpan={colCount}>
          {label}
        </td>
      </tr>
      {rows.length === 0 ? (
        <tr>
          <td className="px-2 py-1.5 text-slate-400" colSpan={colCount}>
            Aucune recette.
          </td>
        </tr>
      ) : (
        rows.map((r, i) => (
          <tr key={i}>
            <td className="whitespace-nowrap px-2 py-1.5">{frDay(r.date)}</td>
            <td className="px-2 py-1.5">{r.label}</td>
            <td className="px-2 py-1.5 text-slate-500">{r.reference}</td>
            <AmountCells r={r} rates={rates} />
          </tr>
        ))
      )}
      <tr className="border-t border-slate-300 font-semibold">
        <td className="px-2 py-1.5" colSpan={3}>
          Total {label}
        </td>
        <AmountCells r={totals} rates={rates} />
      </tr>
    </>
  );
}
