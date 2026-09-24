import Link from "next/link";
import { bicRevenueOfYear } from "@/lib/bic/revenue";
import { formatEuro } from "@/lib/format";
import { isActivityHidden } from "@/lib/visibility";
import { ABATTEMENT_SERVICES, ABATTEMENT_VENTES, bicTaxable as taxable } from "@/lib/bic/social";

export const dynamic = "force-dynamic";

// Déclaration de revenus de la micro-BIC (Revente + Kerbooth) : chiffres
// d'affaires encaissés de l'année, ventes et services sur deux lignes
// distinctes de la 2042-C-PRO.
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear - 1;
  const [ca, reventeHidden] = await Promise.all([bicRevenueOfYear(year), isActivityHidden("fruits-legumes")]);

  const allRows = [
    {
      label: "Ventes de marchandises (Revente fruits/légumes)",
      box: "5KO",
      ca: ca.ventes,
      rate: ABATTEMENT_VENTES,
    },
    {
      label: "Prestations de services (Kerbooth 360 — location)",
      box: "5KP",
      ca: ca.services,
      rate: ABATTEMENT_SERVICES,
    },
  ];
  // Installation sans Revente (partenaire) : seule la case services.
  const rows = reventeHidden ? allRows.filter((r) => r.box !== "5KO") : allRows;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Déclaration 2042-C-PRO (micro-BIC) — revenus {year}</p>
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
          À déclarer au printemps {year + 1} sur la même déclaration que ton maraîchage : chiffre d&apos;affaires
          encaissé, <strong>sans</strong> retirer toi-même l&apos;abattement. Ventes et services sur deux lignes
          distinctes.
          {year === currentYear && " Exercice en cours : les montants évolueront jusqu'au 31 décembre."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.box} className="rounded-lg border-2 border-sky-700 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-sky-800">À reporter sur la 2042-C-PRO</p>
            <p className="mt-1 text-sm text-slate-700">
              Case <strong>{r.box}</strong> — {r.label}
            </p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{formatEuro(r.ca)}</p>
            <p className="mt-2 text-xs text-slate-500">
              Revenu imposable estimé : {formatEuro(taxable(r.ca, r.rate))} (abattement de{" "}
              {Math.round(r.rate * 100)} %, minimum 305 €, calculé par l&apos;administration).
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        Abattements (71 % ventes, 50 % services, minimum 305 €) vérifiés le 24/09/2026. Numéros de case (5KO,
        5KP) : à contrôler sur le formulaire de l&apos;année avant de déclarer. Sources des montants : factures
        encaissées et ventes directes validées de {year} (onglets Livre des recettes).
      </div>
    </div>
  );
}
