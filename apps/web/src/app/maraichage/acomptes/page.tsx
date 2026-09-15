import { listTvaInstallments } from "@/server/services/tvaInstallments";
import { listActivitySettings } from "@/server/services/settings";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toTvaInstallmentView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import TvaInstallmentForm from "@/components/TvaInstallmentForm";
import TvaInstallmentTable from "@/components/TvaInstallmentTable";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

// Acompte TVA (Maraîchage, régime simplifié agricole) : simple import après
// paiement, justificatif à l'appui — plus une donnée de démonstration.
// Désactivable dans Réglages (dispense légale sous 1 000 € de TVA due
// l'année précédente) : le formulaire d'ajout disparaît alors, mais
// l'historique déjà enregistré reste consultable.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [items, activitySettings, closedYears] = await Promise.all([
    listTvaInstallments(),
    listActivitySettings(),
    listClosedYears(),
  ]);
  const enabled =
    activitySettings.find((s) => s.activity === "BA_MARAICHAGE")?.tvaInstallmentsEnabled ?? true;
  const view = filterByYear(
    items.map(toTvaInstallmentView),
    (i) => yearOfIsoDate(i.paidAt),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="space-y-4">
      {enabled ? (
        <TvaInstallmentForm />
      ) : (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          Acomptes trimestriels de TVA désactivés pour cette activité (dispense
          déclarée dans Réglages). Le Registre TVA reste calculé normalement ;
          réactivez cette option dans Réglages si votre situation change.
        </div>
      )}
      <div className="flex justify-end">
        <YearFilter closedYears={closedYears} />
      </div>
      <div className="rounded-lg border bg-white">
        <TvaInstallmentTable items={view} closedYears={closedYears} />
      </div>
    </div>
  );
}
