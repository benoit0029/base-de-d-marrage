import Link from "next/link";
import { computeBicEReporting, type BicEReportingTotals } from "@/lib/ereporting/bic";
import { getPaConnection } from "@/server/services/pa";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function Cells({ t }: { t: BicEReportingTotals }) {
  const c = (n: number) => <td className="px-3 py-2 text-right tabular-nums">{n ? formatEuro(n) : "—"}</td>;
  return (
    <>
      {c(t.ventesTtc)}
      {c(t.ventesVat)}
      {c(t.servicesTtc)}
      {c(t.servicesVat)}
    </>
  );
}

// Abby / E-reporting de la micro-BIC — voir lib/ereporting/bic. Lecture seule.
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear;
  const [{ months, total }, pa] = await Promise.all([computeBicEReporting(year), getPaConnection()]);
  const detail = monthParam ? months[Number(monthParam) - 1] : null;
  const connected = pa?.status === "CONNECTED";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Abby — facture électronique (micro-BIC)</p>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${connected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
            {connected ? "Abby connecté" : "Abby pas encore connecté"}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Même calendrier que le Maraîchage (sources secondaires, à revérifier) : réception des factures fournisseurs
          depuis le 1er septembre 2026 ; envoi des factures aux professionnels et e-reporting des ventes aux
          particuliers à partir du 1er septembre 2027. Tes factures se font dans cet outil (numérotation FA…), jamais
          sur Abby. <strong>Rien n&apos;est transmis pour l&apos;instant.</strong>
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <div className="flex items-center justify-between px-3 pt-3 text-sm">
          <p className="font-medium text-slate-700">E-reporting — ventes et prestations aux particuliers {year}</p>
          <div className="flex gap-2">
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
        <table className="mt-2 min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2">Mois</th>
              <th className="px-3 py-2 text-right">Ventes TTC (Revente)</th>
              <th className="px-3 py-2 text-right">TVA ventes</th>
              <th className="px-3 py-2 text-right">Prestations TTC (Kerbooth)</th>
              <th className="px-3 py-2 text-right">TVA prestations</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {months.map((m) => (
              <tr key={m.month} className={m.days.length === 0 ? "text-slate-400" : ""}>
                <td className="px-3 py-2">{MONTHS[m.month - 1]}</td>
                <Cells t={m} />
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
              <Cells t={total} />
              <td className="px-3 py-2 text-right">
                <a href={`/api/e-reporting-bic/${year}/csv`} className="text-xs font-medium text-slate-600 underline">
                  Export tableur
                </a>
              </td>
            </tr>
          </tbody>
        </table>
        <p className="p-3 text-xs text-slate-400">
          TVA à zéro tant que la micro-BIC est en franchise. Les réservations de clients professionnels passeront par
          la facture électronique plutôt que par l&apos;e-reporting.
        </p>
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
          <table className="mt-2 min-w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {detail.days.map((d) => (
                <tr key={d.date}>
                  <td className="px-3 py-2">{d.date.split("-").reverse().join("/")}</td>
                  <Cells t={d} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
