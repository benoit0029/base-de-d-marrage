import Link from "next/link";
import { computeEReporting, type EReportingTotals } from "@/lib/ereporting";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function TotalsCells({ t }: { t: EReportingTotals }) {
  return (
    <>
      <td className="px-3 py-2 text-right font-medium">{formatEuro(t.ttc)}</td>
      <td className="px-3 py-2 text-right">{formatEuro(t.reducedHt)}</td>
      <td className="px-3 py-2 text-right">{formatEuro(t.reducedVat)}</td>
      <td className="px-3 py-2 text-right">{formatEuro(t.plantsHt)}</td>
      <td className="px-3 py-2 text-right">{formatEuro(t.plantsVat)}</td>
    </>
  );
}

function HeaderCells() {
  return (
    <>
      <th className="px-3 py-2 text-right">Total TTC</th>
      <th className="px-3 py-2 text-right">HT 5,5 %</th>
      <th className="px-3 py-2 text-right">TVA 5,5 %</th>
      <th className="px-3 py-2 text-right">HT 10 % (plants)</th>
      <th className="px-3 py-2 text-right">TVA 10 %</th>
    </>
  );
}

// E-reporting (Maraîchage) : préparation des totaux de ventes aux
// particuliers à transmettre via la plateforme agréée à partir de septembre
// 2027 — voir lib/ereporting. Lecture seule du journal de caisse validé.
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear;
  const selectedMonth = monthParam ? Number(monthParam) : null;

  const { months, total } = await computeEReporting(year);
  const detail = selectedMonth ? months[selectedMonth - 1] : null;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">E-reporting — ventes aux particuliers {year}</p>
          <div className="flex items-center gap-2 text-sm">
            <Link href={`?year=${year - 1}`} className="text-slate-500 underline">
              ← {year - 1}
            </Link>
            {year < currentYear && (
              <Link href={`?year=${year + 1}`} className="text-slate-500 underline">
                {year + 1} →
              </Link>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          À partir du 1er septembre 2027, les totaux de tes ventes aux particuliers (marché, vente à la ferme)
          devront être transmis à l&apos;administration par ta plateforme agréée (Abby). Cet onglet les prépare
          depuis ton journal de caisse validé, par jour et par taux de TVA. <strong>Rien n&apos;est transmis pour
          l&apos;instant.</strong> Le format et la fréquence exacts seront à confirmer au moment de la mise en place.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Les factures ne sont pas comptées ici : celles aux professionnels passeront par la facture électronique.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mois</th>
              <HeaderCells />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map((m) => (
              <tr key={m.month} className={m.days.length === 0 ? "text-slate-400" : ""}>
                <td className="px-3 py-2">{MONTHS[m.month - 1]}</td>
                <TotalsCells t={m} />
                <td className="px-3 py-2 text-right">
                  {m.days.length > 0 && (
                    <Link href={`?year=${year}&month=${m.month}`} className="text-xs text-slate-600 underline">
                      Détail ({m.days.length} j)
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold">
              <td className="px-3 py-2">Total {year}</td>
              <TotalsCells t={total} />
              <td className="px-3 py-2 text-right">
                <a href={`/api/e-reporting/${year}/csv`} className="text-xs font-medium text-slate-600 underline">
                  Export tableur
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <div className="flex items-center justify-between px-3 pt-3">
            <p className="text-sm font-medium text-slate-700">
              Détail par jour — {MONTHS[detail.month - 1]} {year}
            </p>
            <Link href={`?year=${year}`} className="text-xs text-slate-500 underline">
              Fermer
            </Link>
          </div>
          <table className="mt-2 min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Jour</th>
                <HeaderCells />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {detail.days.map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-2">{d.date.split("-").reverse().join("/")}</td>
                  <TotalsCells t={d} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
