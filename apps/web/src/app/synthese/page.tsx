import Link from "next/link";
import ThresholdBar from "@/components/ThresholdBar";
import { computeBaThreshold, computeBicThresholds } from "@/lib/thresholds";
import { detectBicVatLiability, getBicVatSettings } from "@/lib/tva/bic";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [bic, ba, vatSettings, vatDetection] = await Promise.all([
    computeBicThresholds(),
    computeBaThreshold(),
    getBicVatSettings(),
    detectBicVatLiability(),
  ]);
  const vatToConfirm =
    vatDetection.status !== "franchise" &&
    (!vatSettings.liableFrom || vatSettings.liableFrom.getTime() > vatDetection.effectiveDate.getTime());

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Synthèse micro-BIC
        </h1>
        <p className="text-sm text-slate-500">
          Revente Fruits/Légumes et Kerbooth 360° forment juridiquement une
          seule micro-entreprise : leurs chiffres d&apos;affaires et leurs
          seuils sont cumulés. Les montants ci-dessous ne comptent que les
          recettes <strong>validées</strong> de {bic.year}.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Fruits/Légumes</p>
          <p className="mt-1 text-xl font-semibold text-fruits">
            {formatEuro(bic.caFruitsLegumes)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Kerbooth 360</p>
          <p className="mt-1 text-xl font-semibold text-photobooth">
            {formatEuro(bic.caPhotobooth)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-500">CA cumulé micro-BIC</p>
          <p className="mt-1 text-xl font-semibold text-synthese">
            {formatEuro(bic.caTotal)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <ThresholdBar threshold={bic.franchiseVente} />
        <ThresholdBar threshold={bic.franchiseService} />
        <ThresholdBar threshold={bic.plafondGlobalMixte} />
      </div>

      <Link
        href="/synthese/tva"
        className={`block rounded-lg border p-4 ${vatToConfirm ? "border-red-200 bg-red-50" : "bg-white"}`}
      >
        <p className="text-sm font-medium text-slate-700">TVA de la micro-BIC →</p>
        <p className="mt-1 text-sm text-slate-500">
          {vatSettings.liableFrom
            ? `Assujetti depuis le ${vatSettings.liableFrom.toLocaleDateString("fr-FR")} — déclaration CA12 (3517-S-SD).`
            : vatToConfirm
              ? "Sortie de franchise détectée : à confirmer."
              : "Franchise en base — bascule automatique détectée en cas de dépassement de seuil."}
        </p>
      </Link>

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Micro-BA — Maraîchage (pour information)
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Régime distinct (activité agricole séparée) : le seuil pertinent est
          la moyenne des recettes HT validées sur {ba.yearsConsidered.length === 1 ? "la dernière année disponible" : `les années ${ba.yearsConsidered.join(", ")}`}.
        </p>
        <div className="mt-3">
          <ThresholdBar threshold={ba.check} />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Déclaration 2042 C PRO (globale micro-BIC)
        </p>
        <p className="mt-1 text-sm text-slate-500">
          Le pré-remplissage automatique de la 2042 C PRO à partir de ces
          montants sera ajouté dans une prochaine itération ; les seuils et
          alertes ci-dessus sont d&apos;ores et déjà calculés en continu sur
          vos écritures validées.
        </p>
      </div>

      <p className="text-xs text-slate-400">
        Seuils indicatifs (barème 2026-2028) — à vérifier sur impots.gouv.fr
        avant toute décision, notamment en fin d&apos;exercice.
      </p>
    </div>
  );
}
