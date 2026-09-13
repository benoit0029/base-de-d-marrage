import { annualDeclarationFixture } from "@/lib/fixtures/maraichage-admin";
import { formatEuro } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export default function Page() {
  const d = annualDeclarationFixture;
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          Déclaration 2042 + annexe micro-BA — exercice {d.annee}
        </p>
        <StatusBadge status={d.statut === "a_preparer" ? "pending" : "validated"} />
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Recettes totales</dt>
          <dd className="text-lg font-semibold">{formatEuro(d.recettesTotales)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Charges totales</dt>
          <dd className="text-lg font-semibold">{formatEuro(d.chargesTotales)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-sm text-slate-500">
        Le calcul du bénéfice forfaitaire et la pré-remplissage automatique
        de la 2042 C PRO seront disponibles à partir de la phase 4.
      </p>
    </div>
  );
}
