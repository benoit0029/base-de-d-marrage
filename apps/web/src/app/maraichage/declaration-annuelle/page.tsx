import Link from "next/link";
import { computeMicroBaDeclaration } from "@/lib/declaration/microBa";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

// Déclaration 2042-C-PRO du micro-BA (Maraîchage), calculée depuis les
// recettes réellement encaissées et validées — voir lib/declaration/microBa.
// Par défaut, le dernier exercice clos (celui qu'on déclare au printemps).
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear - 1;

  const d = await computeMicroBaDeclaration(year);
  const r = d.recettes;
  const partialAverage = d.yearsAveraged.length < 3;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Déclaration 2042-C-PRO (micro-BA) — revenus {year}</p>
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
          À déclarer au printemps {year + 1} avec ta déclaration de revenus (dates exactes publiées chaque année sur
          impots.gouv.fr). Une seule déclaration : la MSA calcule tes cotisations à partir de celle-ci.
          {year === currentYear && " Exercice en cours : les montants évolueront jusqu'au 31 décembre."}
        </p>
      </div>

      <div className="rounded-lg border-2 border-emerald-600 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-emerald-700">À reporter sur la 2042-C-PRO</p>
        <p className="mt-1 text-sm text-slate-700">
          Case <strong>5XB</strong> — recettes HT {year} (micro-BA)
        </p>
        <p className="mt-1 text-3xl font-semibold text-slate-900">{formatEuro(r.total)}</p>
        <p className="mt-2 text-xs text-slate-500">
          Montant des recettes, <strong>sans</strong> retirer toi-même l&apos;abattement : l&apos;administration
          calcule la moyenne sur 3 ans et applique l&apos;abattement. Vérifie le numéro de case sur le formulaire de
          l&apos;année (il peut changer).
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Détail des recettes HT {year}</p>
        <p className="mt-1 text-xs text-slate-500">
          Recettes encaissées dans l&apos;année et validées (comptabilité de caisse).
        </p>
        <dl className="mt-3 divide-y divide-slate-100 text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-slate-600">Ventes directes (journal de caisse)</dt>
            <dd className="text-right">
              <span className="font-medium">{formatEuro(r.venteDirecteHt)}</span>
              <span className="block text-xs text-slate-400">
                {formatEuro(r.venteDirecteTtc)} encaissés − {formatEuro(r.venteDirecteTva)} de TVA (5,5 % et 10 %)
              </span>
            </dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-600">Factures encaissées</dt>
            <dd className="font-medium">{formatEuro(r.factures)}</dd>
          </div>
          {r.autres > 0 && (
            <div className="flex justify-between py-2">
              <dt className="text-slate-600">Autres recettes validées (documents)</dt>
              <dd className="font-medium">{formatEuro(r.autres)}</dd>
            </div>
          )}
          <div className="flex justify-between py-2 font-semibold">
            <dt>Total recettes HT</dt>
            <dd>{formatEuro(r.total)}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">Estimation du revenu imposable (calculé par l&apos;administration)</p>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th className="py-1 font-medium">Année</th>
              <th className="py-1 text-right font-medium">Recettes HT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {d.history.map((h) => (
              <tr key={h.year} className={d.yearsAveraged.includes(h.year) ? "" : "text-slate-400"}>
                <td className="py-1.5">
                  {h.year}
                  {!d.yearsAveraged.includes(h.year) && " (aucune recette, non comptée)"}
                </td>
                <td className="py-1.5 text-right">{formatEuro(h.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <dl className="mt-3 divide-y divide-slate-100 border-t text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-slate-600">
              Moyenne des recettes ({d.yearsAveraged.length} an{d.yearsAveraged.length > 1 ? "s" : ""})
            </dt>
            <dd className="font-medium">{formatEuro(d.moyenne)}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-slate-600">Abattement forfaitaire (87 %, minimum 305 €)</dt>
            <dd className="font-medium">− {formatEuro(d.abattement)}</dd>
          </div>
          <div className="flex justify-between py-2 font-semibold">
            <dt>Revenu imposable estimé (et base des cotisations MSA)</dt>
            <dd>{formatEuro(d.benefice)}</dd>
          </div>
        </dl>
        {partialAverage && (
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            Moins de 3 années de recettes dans l&apos;outil : la moyenne est faite sur les seules années connues. La
            règle exacte pour les premières années d&apos;activité (ou des années saisies ailleurs avant l&apos;outil)
            est à vérifier : l&apos;estimation peut différer du calcul de l&apos;administration.
          </p>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Estimation seulement, pour anticiper ton impôt et tes cotisations : tu ne reportes que la case 5XB
          ci-dessus. Pas de charges à déclarer au micro-BA (l&apos;abattement les remplace).
        </p>
      </div>
    </div>
  );
}
