import Link from "next/link";
import { computePurchaseBook, type PurchaseSection } from "@/lib/livres";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

const frDay = (d: Date) => d.toLocaleDateString("fr-FR");
const QUARTER_LABEL = ["1er trimestre", "2e trimestre", "3e trimestre", "4e trimestre"];

function Section({ title, hint, section }: { title: string; hint: string; section: PurchaseSection }) {
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <div className="px-3 pt-3">
        <p className="text-sm font-medium text-slate-700">{title}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <table className="mt-2 min-w-full text-xs">
        <thead className="bg-slate-50 text-left uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-2 py-2">Date de paiement</th>
            <th className="px-2 py-2">Fournisseur</th>
            <th className="px-2 py-2">Nature</th>
            <th className="px-2 py-2 text-right">HT</th>
            <th className="px-2 py-2 text-right">TVA</th>
            <th className="px-2 py-2 text-right">TTC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {section.quarters.map((q) => (
            <QuarterRows key={q.quarter} q={q} />
          ))}
          <tr className="bg-slate-800 font-semibold text-white">
            <td className="px-2 py-2" colSpan={3}>
              Total {title.toLowerCase()}
            </td>
            <td className="px-2 py-2 text-right">{formatEuro(section.totals.ht)}</td>
            <td className="px-2 py-2 text-right">{formatEuro(section.totals.vat)}</td>
            <td className="px-2 py-2 text-right">{formatEuro(section.totals.ttc)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function QuarterRows({ q }: { q: PurchaseSection["quarters"][number] }) {
  const label = QUARTER_LABEL[q.quarter - 1];
  return (
    <>
      <tr className="bg-slate-50">
        <td className="px-2 py-1.5 font-semibold text-slate-600" colSpan={6}>
          {label}
        </td>
      </tr>
      {q.rows.length === 0 ? (
        <tr>
          <td className="px-2 py-1.5 text-slate-400" colSpan={6}>
            Aucun achat.
          </td>
        </tr>
      ) : (
        q.rows.map((r, i) => (
          <tr key={i}>
            <td className="whitespace-nowrap px-2 py-1.5">{frDay(r.date)}</td>
            <td className="px-2 py-1.5">{r.supplier}</td>
            <td className="px-2 py-1.5 text-slate-600">{r.nature}</td>
            <td className="px-2 py-1.5 text-right">{formatEuro(r.ht)}</td>
            <td className="px-2 py-1.5 text-right">{formatEuro(r.vat)}</td>
            <td className="px-2 py-1.5 text-right">{formatEuro(r.ttc)}</td>
          </tr>
        ))
      )}
      <tr className="border-t border-slate-300 font-semibold">
        <td className="px-2 py-1.5" colSpan={3}>
          Total {label}
        </td>
        <td className="px-2 py-1.5 text-right">{formatEuro(q.totals.ht)}</td>
        <td className="px-2 py-1.5 text-right">{formatEuro(q.totals.vat)}</td>
        <td className="px-2 py-1.5 text-right">{formatEuro(q.totals.ttc)}</td>
      </tr>
    </>
  );
}

// Livre des achats (Maraîchage) — lecture seule des Dépenses validées et
// payées, voir lib/livres.
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear;
  const book = await computePurchaseBook(year);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Livre des achats {year}</p>
          <div className="flex items-center gap-3 text-sm">
            <Link href={`?year=${year - 1}`} className="text-slate-500 underline">
              ← {year - 1}
            </Link>
            {year < currentYear && (
              <Link href={`?year=${year + 1}`} className="text-slate-500 underline">
                {year + 1} →
              </Link>
            )}
            <a href={`/api/livres/achats/${year}/pdf`} className="font-medium text-slate-700 underline">
              PDF à imprimer
            </a>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Registre obligatoire, rempli tout seul à partir de tes Dépenses validées et payées : rien à ressaisir ici.
          Classé à la date de paiement, en séparant les immobilisations des autres achats, avec la TVA.
        </p>
        {book.unpaidCount > 0 && (
          <p className="mt-2 text-xs text-amber-700">
            {book.unpaidCount} dépense{book.unpaidCount > 1 ? "s" : ""} validée{book.unpaidCount > 1 ? "s" : ""} de{" "}
            {year} pas encore payée{book.unpaidCount > 1 ? "s" : ""} : elle{book.unpaidCount > 1 ? "s" : ""} entrera
            dans le livre à sa date de paiement.
          </p>
        )}
      </div>

      <Section
        title="Immobilisations"
        hint="Matériel durable (outillage, serre, véhicule…) — classé ainsi par la lecture automatique de la pièce."
        section={book.immobilisations}
      />
      <Section title="Autres achats" hint="Dépenses courantes (semences, fournitures, services…)." section={book.autres} />

      <div className="rounded-lg border bg-white p-4 text-sm">
        <div className="flex justify-between font-semibold">
          <span>Total des achats {year}</span>
          <span>
            {formatEuro(book.totals.ht)} HT · {formatEuro(book.totals.vat)} TVA · {formatEuro(book.totals.ttc)} TTC
          </span>
        </div>
      </div>
    </div>
  );
}
