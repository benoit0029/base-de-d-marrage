import { getEntries } from "@/lib/fixtures/entries";
import { bicCombinedThreshold, bicPlafondThreshold } from "@/lib/fixtures/thresholds";
import ThresholdBar from "@/components/ThresholdBar";
import { formatEuro } from "@/lib/format";

function caRecettes(activity: "fruits-legumes" | "photobooth") {
  return getEntries(activity)
    .filter((e) => e.type === "recette")
    .reduce((sum, e) => sum + e.amountHt, 0);
}

export default function Page() {
  const caFruits = caRecettes("fruits-legumes");
  const caPhotobooth = caRecettes("photobooth");
  const caTotal = caFruits + caPhotobooth;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-800">
          Synthèse micro-BIC
        </h1>
        <p className="text-sm text-slate-500">
          Revente Fruits/Légumes et Kerbooth 360° forment juridiquement une
          seule micro-entreprise : leurs chiffres d&apos;affaires et leurs
          seuils sont cumulés.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Fruits/Légumes</p>
          <p className="mt-1 text-xl font-semibold text-fruits">
            {formatEuro(caFruits)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-500">Kerbooth 360</p>
          <p className="mt-1 text-xl font-semibold text-photobooth">
            {formatEuro(caPhotobooth)}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs uppercase text-slate-500">CA cumulé micro-BIC</p>
          <p className="mt-1 text-xl font-semibold text-synthese">
            {formatEuro(caTotal)}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <ThresholdBar threshold={bicCombinedThreshold} />
        <ThresholdBar threshold={bicPlafondThreshold} />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <p className="text-sm font-medium text-slate-700">
          Déclaration 2042 C PRO (globale micro-BIC)
        </p>
        <p className="mt-1 text-sm text-slate-500">
          La consolidation automatique des deux activités micro-BIC pour la
          2042 C PRO sera disponible à partir de la phase 4, une fois le
          calcul des seuils branché sur les vraies écritures.
        </p>
      </div>
    </div>
  );
}
