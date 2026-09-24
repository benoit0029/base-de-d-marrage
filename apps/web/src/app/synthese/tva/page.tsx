import Link from "next/link";
import { computeBicAnnualVat, detectBicVatLiability, getBicVatSettings } from "@/lib/tva/bic";
import { formatEuro } from "@/lib/format";
import BicVatSwitchForm from "@/components/BicVatSwitchForm";

export const dynamic = "force-dynamic";

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const frDate = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// TVA de la micro-BIC (Revente + Kerbooth) : sortie de franchise détectée
// automatiquement puis confirmée par l'exploitant, et déclaration annuelle
// CA12 (3517-S-SD) une fois assujetti — voir lib/tva/bic.
export default async function Page({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  const { year: yearParam } = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = yearParam && Number.isInteger(Number(yearParam)) ? Number(yearParam) : currentYear - 1;

  const [settings, detection, decl] = await Promise.all([
    getBicVatSettings(),
    detectBicVatLiability(),
    computeBicAnnualVat(year),
  ]);

  const confirmed = settings.liableFrom !== null;
  const proposed =
    detection.status !== "franchise" ? detection.effectiveDate : settings.liableFrom ?? new Date();
  const detectionDiffers =
    detection.status !== "franchise" &&
    (!settings.liableFrom || settings.liableFrom.getTime() > detection.effectiveDate.getTime());

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">TVA de la micro-BIC</h2>
        <p className="text-sm text-slate-500">
          Revente Fruits/Légumes et Kerbooth 360° partagent une seule franchise de TVA : dépasser un seuil fait
          basculer les deux activités à la fois.
        </p>
      </div>

      {/* 1. Situation actuelle */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">Situation</p>
        {confirmed ? (
          <p className="text-sm text-slate-700">
            <strong>Assujetti à la TVA depuis le {frDate(settings.liableFrom!)}</strong> — n° {settings.vatNumber} —
            prix Kerbooth {settings.pricing === "ADDED" ? "majorés de 20 %" : "inchangés (TVA incluse)"}.
          </p>
        ) : (
          <p className="text-sm text-slate-700">
            <strong>Franchise en base</strong> : factures "TVA non applicable, art. 293 B du CGI".
          </p>
        )}

        {detection.status === "franchise" ? (
          <p className="text-sm text-emerald-700">
            Aucun dépassement détecté (année précédente et année en cours).
          </p>
        ) : (
          <div
            className={`rounded-md border p-3 text-sm ${
              detectionDiffers ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            <p className="font-medium">
              {detection.status === "liable"
                ? `Sortie de franchise détectée : TVA due depuis le ${frDate(detection.effectiveDate)}`
                : `Sortie de franchise à venir : TVA due à partir du ${frDate(detection.effectiveDate)}`}
            </p>
            <p className="mt-1">Motif : {detection.reason}.</p>
            {detectionDiffers && (
              <p className="mt-1">
                À confirmer ci-dessous, après avoir obtenu ton numéro de TVA auprès du service des impôts (SIE) et
                fait valider cette date par Cerfrance : la règle de calcul appliquée par l&apos;appli n&apos;a pas pu
                être vérifiée sur un texte officiel.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Confirmation de la bascule */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700">
          {confirmed ? "Bascule enregistrée" : "Confirmer la sortie de franchise"}
        </p>
        {!confirmed && detection.status === "franchise" ? (
          <details className="text-sm">
            <summary className="cursor-pointer text-slate-500">
              Aucun dépassement détecté — basculer quand même (option volontaire pour la TVA, décision Cerfrance)
            </summary>
            <div className="mt-3">
              <BicVatSwitchForm
                proposedDate={toInputDate(proposed)}
                vatNumber={settings.vatNumber ?? ""}
                pricing={settings.pricing}
                confirmed={confirmed}
              />
            </div>
          </details>
        ) : (
          <BicVatSwitchForm
            proposedDate={toInputDate(proposed)}
            vatNumber={settings.vatNumber ?? ""}
            pricing={settings.pricing}
            confirmed={confirmed}
          />
        )}
        {confirmed && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <p className="font-medium">À faire aussi, hors de l&apos;appli :</p>
            <ul className="mt-1 list-disc pl-4">
              <li>Retirer la mention "TVA non applicable, art. 293 B du CGI" des CGV (article 3) sur kerbooth360.fr.</li>
              {settings.pricing === "ADDED" && <li>Mettre à jour les prix affichés sur kerbooth360.fr (+20 %).</li>}
              <li>Revente Fruits/Légumes : tes ventes sont désormais soumises à la TVA à 5,5 %, déjà prise en compte dans la déclaration ci-dessous.</li>
            </ul>
          </div>
        )}
      </div>

      {/* 3. Déclaration annuelle CA12 */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Déclaration CA12 / 3517-S-SD (TVA) — exercice {year}</p>
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

        {!decl.liableThisYear ? (
          <p className="text-sm text-slate-500">
            Micro-BIC en franchise sur {year} : aucune déclaration de TVA à déposer pour cet exercice.
          </p>
        ) : (
          <>
            <p className="text-sm text-slate-500">
              Période déclarée : du {frDate(decl.periodStart!)} au 31 décembre {year} — date limite de dépôt :{" "}
              {frDate(decl.deadline)}.
            </p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">TVA collectée — Kerbooth (20 %)</dt>
                <dd className="text-sm font-medium">{formatEuro(decl.collectedKerbooth)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">TVA collectée — Revente (5,5 %)</dt>
                <dd className="text-sm font-medium">{formatEuro(decl.collectedFruitsLegumes)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">TVA déductible — achats/services</dt>
                <dd className="text-sm font-medium">{formatEuro(decl.deductibleAutres)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">TVA déductible — immobilisations</dt>
                <dd className="text-sm font-medium">{formatEuro(decl.deductibleImmobilisations)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">
                  {decl.netVat >= 0 ? "TVA nette à payer" : "Crédit de TVA (remboursable)"}
                </dt>
                <dd className="text-base font-semibold">{formatEuro(Math.abs(decl.netVat))}</dd>
              </div>
            </dl>
            <p className="text-sm text-slate-600">
              {decl.nextYearInstallments
                ? `Acomptes semestriels ${year + 1} : ${formatEuro(decl.nextYearInstallments.july)} en juillet et ${formatEuro(decl.nextYearInstallments.december)} en décembre (55 % et 40 % de la TVA de ${year}).`
                : `TVA nette ${year} inférieure à 1 000 € : pas d'acompte semestriel en ${year + 1}, un seul dépôt annuel.`}
            </p>
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              Montants calculés à partir des factures, ventes directes et dépenses validées, payées à partir de la date
              de bascule — ils aident à remplir le formulaire officiel sur impots.gouv.fr sans le remplacer. À faire
              vérifier par Cerfrance la première année : régularisation possible de la TVA sur les immobilisations
              achetées avant la bascule, et répartition des lignes du formulaire.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
