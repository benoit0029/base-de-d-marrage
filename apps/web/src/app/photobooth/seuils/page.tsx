import Link from "next/link";
import ThresholdBar from "@/components/ThresholdBar";
import { computeBicThresholds } from "@/lib/thresholds";

export const dynamic = "force-dynamic";

export default async function Page() {
  const thresholds = await computeBicThresholds();

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Ces seuils sont partagés avec l&apos;activité Revente Fruits/Légumes
        (même micro-entreprise). Calculés sur les recettes{" "}
        <strong>validées</strong> de l&apos;année {thresholds.year}. Voir
        aussi la{" "}
        <Link href="/synthese" className="font-medium text-photobooth underline">
          synthèse micro-BIC
        </Link>{" "}
        pour le détail cumulé.
      </p>
      <ThresholdBar threshold={thresholds.franchiseService} />
      <ThresholdBar threshold={thresholds.plafondGlobalMixte} />
      <p className="text-xs text-slate-400">
        Seuils indicatifs (barème 2024-2025) — à vérifier sur impots.gouv.fr
        avant toute décision, notamment en fin d&apos;exercice.
      </p>
    </div>
  );
}
