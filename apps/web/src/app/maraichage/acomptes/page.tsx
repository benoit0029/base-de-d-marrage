import { listTvaInstallments } from "@/server/services/tvaInstallments";
import { listActivitySettings } from "@/server/services/settings";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toTvaInstallmentView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import TvaInstallmentForm from "@/components/TvaInstallmentForm";
import TvaInstallmentTable from "@/components/TvaInstallmentTable";
import YearFilter from "@/components/YearFilter";
import { computeInstallmentSchedule, type InstallmentSchedule } from "@/lib/tva/installments";
import { formatEuro } from "@/lib/format";

const frDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Acomptes attendus (1/5 de la TVA de l'année précédente, dates fixes) —
// voir lib/tva/installments. Affiche l'année en cours et la précédente, dont
// le 4e acompte tombe en février de l'année en cours.
function ExpectedInstallments({ schedules, enabled }: { schedules: InstallmentSchedule[]; enabled: boolean }) {
  const today = new Date();
  const anyRequired = schedules.some((s) => s.required);
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-sm font-medium text-slate-700">Acomptes attendus</p>
      <p className="mt-1 text-xs text-slate-500">
        Si la TVA nette de l&apos;année précédente atteint 1 000 € : 4 acomptes de 1/5 de cette TVA, au plus tard
        les 5 mai, 5 août, 5 novembre et 5 février, puis régularisation sur la CA12A. En dessous : aucun acompte.
        Règle tirée de ton document « Obligations micro-BA », à confirmer avant le premier paiement.
      </p>
      {anyRequired && !enabled && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          Des acomptes sont dus d&apos;après ce calcul, mais les acomptes sont désactivés dans Réglages : pense à les
          réactiver pour pouvoir enregistrer tes paiements.
        </p>
      )}
      {schedules.map((s) => (
        <div key={s.year} className="mt-3">
          <p className="text-sm text-slate-700">
            <strong>TVA {s.year}</strong> — base : TVA nette {s.baseYear} = {formatEuro(s.baseVat)}
            {s.required ? "" : " → sous 1 000 € : aucun acompte, seulement la CA12A"}
          </p>
          {s.required && (
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-slate-100">
                {s.installments.map((i) => {
                  const done = i.paid >= i.amount - 0.005;
                  const late = !done && i.dueDate < today;
                  return (
                    <tr key={i.label}>
                      <td className="py-1.5">
                        {i.number}
                        <sup>{i.number === 1 ? "er" : "e"}</sup> acompte ({i.label})
                      </td>
                      <td className="py-1.5">avant le {frDate(i.dueDate)}</td>
                      <td className="py-1.5 text-right font-medium">{formatEuro(i.amount)}</td>
                      <td className="py-1.5 text-right">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            done
                              ? "bg-emerald-100 text-emerald-800"
                              : late
                                ? "bg-red-100 text-red-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {done ? "Payé" : late ? "En retard" : i.paid > 0 ? `Payé ${formatEuro(i.paid)}` : "À payer"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}

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

  const currentYear = new Date().getFullYear();
  const [items, activitySettings, closedYears, previousSchedule, currentSchedule] = await Promise.all([
    listTvaInstallments(),
    listActivitySettings(),
    listClosedYears(),
    computeInstallmentSchedule(currentYear - 1),
    computeInstallmentSchedule(currentYear),
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
      <ExpectedInstallments schedules={[previousSchedule, currentSchedule]} enabled={enabled} />
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
