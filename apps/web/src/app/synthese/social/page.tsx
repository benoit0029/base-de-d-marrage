import Link from "next/link";
import { getCompanySettings } from "@/server/services/settings";
import { bicRevenueByMonth, bicRevenueOfYear, type BicRevenue } from "@/lib/bic/revenue";
import { asBicSocialRegime, URSSAF_RATE_SERVICES, URSSAF_RATE_VENTES } from "@/lib/bic/social";
import { formatEuro } from "@/lib/format";
import BicSocialRegimeForm from "@/components/BicSocialRegimeForm";

export const dynamic = "force-dynamic";

const MONTHS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const round2 = (n: number) => Math.round(n * 100) / 100;
const cotisations = (r: BicRevenue) => round2(r.ventes * URSSAF_RATE_VENTES + r.services * URSSAF_RATE_SERVICES);
const frDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Cotisations sociales de la micro-BIC, selon le régime : rattachement à
// l'activité principale agricole (MSA, cas de Benoît) ou micro-entrepreneur
// qui déclare son chiffre d'affaires à l'URSSAF (cas du partenaire).
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear;
  const company = await getCompanySettings();
  const regime = asBicSocialRegime(company?.bicSocialRegime);

  let body: React.ReactNode = null;
  if (regime === "MSA") {
    const [previous, current] = await Promise.all([bicRevenueOfYear(currentYear - 1), bicRevenueOfYear(currentYear)]);
    body = (
      <div className="rounded-lg border bg-white p-4 text-sm">
        <p className="text-slate-700">
          Tes revenus micro-BIC sont <strong>rattachés à ton activité principale agricole</strong> : pas de
          déclaration URSSAF mensuelle. Tu les déclares une fois par an avec ta déclaration de revenus (onglet{" "}
          <Link href="/synthese/declaration" className="underline">
            Déclaration 2042
          </Link>
          ), et la MSA t&apos;envoie un appel de cotisations — à enregistrer dans Maraîchage →{" "}
          <Link href="/maraichage/cotisations-non-salarie" className="underline">
            Cotisations non salarié
          </Link>
          .
        </p>
        <table className="mt-3 w-full">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-1 font-medium">Année</th>
              <th className="py-1 text-right font-medium">Ventes (Revente)</th>
              <th className="py-1 text-right font-medium">Services (Kerbooth)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {[
              [currentYear - 1, previous],
              [currentYear, current],
            ].map(([y, r]) => (
              <tr key={y as number}>
                <td className="py-1.5">
                  {y as number}
                  {y === currentYear ? " (en cours)" : ""}
                </td>
                <td className="py-1.5 text-right">{formatEuro((r as BicRevenue).ventes)}</td>
                <td className="py-1.5 text-right">{formatEuro((r as BicRevenue).services)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-slate-500">
          Situation indiquée par toi (activité principale agricole). En cas de changement (par exemple si la micro-BIC
          devenait ton activité principale), change le réglage ci-dessus et vérifie avec la MSA.
        </p>
      </div>
    );
  } else if (regime === "URSSAF_MENSUEL" || regime === "URSSAF_TRIMESTRIEL") {
    const months = await bicRevenueByMonth(year);
    const periods =
      regime === "URSSAF_MENSUEL"
        ? months.map((m) => ({
            label: `${MONTHS[m.month - 1]} ${year}`,
            revenue: m,
            due: new Date(year, m.month + 1, 0), // fin du mois suivant
          }))
        : [0, 1, 2, 3].map((q) => {
            const ms = months.slice(q * 3, q * 3 + 3);
            return {
              label: `${q + 1}${q === 0 ? "er" : "e"} trimestre ${year}`,
              revenue: { ventes: round2(ms.reduce((s, m) => s + m.ventes, 0)), services: round2(ms.reduce((s, m) => s + m.services, 0)) },
              due: new Date(year, q * 3 + 4, 0), // fin du mois qui suit le trimestre
            };
          });
    body = (
      <div className="overflow-x-auto rounded-lg border bg-white">
        <div className="flex items-center justify-between px-3 pt-3 text-sm">
          <p className="font-medium text-slate-700">Chiffre d&apos;affaires à déclarer à l&apos;URSSAF — {year}</p>
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
              <th className="px-3 py-2">Période</th>
              <th className="px-3 py-2 text-right">Ventes</th>
              <th className="px-3 py-2 text-right">Services</th>
              <th className="px-3 py-2 text-right">Cotisations estimées</th>
              <th className="px-3 py-2">À déclarer avant le</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {periods.map((p) => (
              <tr key={p.label}>
                <td className="px-3 py-2">{p.label}</td>
                <td className="px-3 py-2 text-right">{formatEuro(p.revenue.ventes)}</td>
                <td className="px-3 py-2 text-right">{formatEuro(p.revenue.services)}</td>
                <td className="px-3 py-2 text-right font-medium">{formatEuro(cotisations(p.revenue))}</td>
                <td className="px-3 py-2">{frDate(p.due)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="p-3 text-xs text-amber-800">
          Taux utilisés : {String(URSSAF_RATE_VENTES * 100).replace(".", ",")} % sur les ventes,{" "}
          {String(URSSAF_RATE_SERVICES * 100).replace(".", ",")} % sur les services — valeurs connues mais non
          vérifiées, à contrôler sur autoentrepreneur.urssaf.fr (elles changent). Échéances : fin du mois suivant la
          période, à vérifier aussi. La déclaration se fait sur autoentrepreneur.urssaf.fr, l&apos;appli ne la
          transmet pas.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Cotisations sociales de la micro-BIC</p>
        <p className="mt-1 text-xs text-slate-500">
          Selon ta situation, tes cotisations passent par la MSA (micro-BIC rattachée à une activité principale
          agricole) ou par l&apos;URSSAF (micro-entrepreneur qui déclare son chiffre d&apos;affaires chaque mois ou
          trimestre).
        </p>
        <div className="mt-3">
          <BicSocialRegimeForm current={regime} />
        </div>
      </div>
      {body}
    </div>
  );
}
