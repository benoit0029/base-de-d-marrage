import Link from "next/link";
import { computeAnnualTvaDeclaration, TVA_INSTALLMENT_THRESHOLD } from "@/lib/tva";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

// Déclaration annuelle de régularisation TVA — régime simplifié agricole
// (RSA) : formulaire n°3517-AGR-SD, nommé "CA12A" dans l'espace
// professionnel impots.gouv.fr au moment du dépôt — les deux noms sont
// affichés pour que l'exploitant retrouve le même intitulé des deux côtés.
// Par défaut, l'exercice le plus récent déjà clos (l'année en cours n'est
// pas encore déclarable).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = Number.isInteger(Number(yearParam)) && yearParam ? Number(yearParam) : currentYear - 1;

  const d = await computeAnnualTvaDeclaration(year);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-white p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">
            Déclaration CA12A / 3517-AGR-SD (TVA) — exercice {year}
          </p>
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
          Date limite de dépôt : {d.deadline.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Chiffres calculés automatiquement depuis les factures et dépenses validées
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Ces montants aident à préremplir le formulaire officiel sur
          impots.gouv.fr — ils ne le remplacent pas. Si tes factures utilisent
          plusieurs taux de TVA différents, vérifie la répartition par taux
          (lignes 04, 5a, 5c) directement sur tes factures avant de reporter
          les montants.
        </p>

        <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">CA HT facturé</dt>
            <dd className="text-sm font-medium">{formatEuro(d.caHtFacture)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              TVA collectée <span className="normal-case text-slate-400">(factures + vente directe)</span>
            </dt>
            <dd className="text-sm font-medium">
              {formatEuro(d.collected)}
              <span className="ml-1 text-xs font-normal text-slate-400">
                dont {formatEuro(d.collectedFactures)} factures + {formatEuro(d.collectedVenteDirecte)} vente directe
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">TVA déductible — achats/services</dt>
            <dd className="text-sm font-medium">{formatEuro(d.deductibleAutres)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">TVA déductible — immobilisations</dt>
            <dd className="text-sm font-medium">{formatEuro(d.deductibleImmobilisations)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">TVA nette (collectée − déductible)</dt>
            <dd className="text-sm font-medium">{formatEuro(d.netVat)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Taxe ADAR</dt>
            <dd className="text-sm font-medium">{formatEuro(d.adar)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">Acomptes déjà versés cette année</dt>
            <dd className="text-sm font-medium">{formatEuro(d.acomptesDejaVerses)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-400">
              {d.soldeAPayer >= 0 ? "Solde à payer" : "Crédit de TVA (remboursable)"}
            </dt>
            <dd className="text-base font-semibold">{formatEuro(Math.abs(d.soldeAPayer))}</dd>
          </div>
        </dl>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-medium">⚠️ Limitation restante — à confirmer avec la MSA/Cerfrance</p>
        <p className="mt-1">
          La TVA de la vente directe distingue les deux taux grâce à la
          répartition &laquo; Fruits/légumes 5,5 % &raquo; et &laquo; Plants
          potagers 10 % &raquo; de la saisie du jour. Seules les ventes
          exceptionnelles ({">"} 76 €, saisies à part) sont comptées par défaut
          au taux réduit de 5,5 % — à corriger si l&apos;une d&apos;elles
          concerne aussi des plants. Pour tes factures, le détail de la TVA par
          taux figure sur chaque PDF : vérifie la répartition (lignes 04, 5a,
          5c) avant de reporter les montants sur le formulaire officiel.
        </p>
      </div>

      {d.installmentsRequiredNextYear && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="font-medium">Acomptes trimestriels à prévoir l&apos;année prochaine</p>
          <p className="mt-1">
            La TVA nette due au titre de {year} ({formatEuro(d.netVat)}) dépasse
            le seuil de dispense de {formatEuro(TVA_INSTALLMENT_THRESHOLD)} (article
            1693 bis du CGI) — 4 acomptes trimestriels seront à verser en{" "}
            {year + 1}. Pense à activer les acomptes dans Réglages.
          </p>
        </div>
      )}
    </div>
  );
}
