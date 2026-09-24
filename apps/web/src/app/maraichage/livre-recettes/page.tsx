import Link from "next/link";
import { computeReceiptBook, RECEIPT_RATES, type ReceiptRow, type ReceiptTotals } from "@/lib/livres";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

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

// Livre des recettes (Maraîchage) — lecture seule, voir lib/livres. Tient
// aussi lieu de livre des ventes (ventilation par taux de TVA).
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear;
  const book = await computeReceiptBook(year);
  // Colonne 20 % seulement si l'année en contient (rare en maraîchage).
  const rates = RECEIPT_RATES.filter((r) => r !== 20 || book.totals.byRate[20].ht !== 0);
  const colCount = 8 + rates.length * 2;

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
            <a href={`/api/livres/recettes/${year}/pdf`} className="font-medium text-slate-700 underline">
              PDF à imprimer
            </a>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Registre obligatoire, rempli tout seul à partir de tes saisies validées (Recettes, Facturation) : rien à
          ressaisir ici. Ordre des dates d&apos;encaissement, espèces séparées des autres paiements, ventes de 76 € ou
          moins regroupées par jour, TVA par taux (il sert aussi de livre des ventes), totaux par trimestre et par an.
          Les saisies encore « en attente » n&apos;y figurent pas tant qu&apos;elles ne sont pas validées.
        </p>
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
