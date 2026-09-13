import Link from "next/link";
import ThresholdBar from "@/components/ThresholdBar";
import { bicCombinedThreshold, bicPlafondThreshold } from "@/lib/fixtures/thresholds";

export default function Page() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Ces seuils sont partagés avec l&apos;activité Revente Fruits/Légumes
        (même micro-entreprise). Voir aussi la{" "}
        <Link href="/synthese" className="font-medium text-photobooth underline">
          synthèse micro-BIC
        </Link>{" "}
        pour le détail cumulé.
      </p>
      <ThresholdBar threshold={bicCombinedThreshold} />
      <ThresholdBar threshold={bicPlafondThreshold} />
    </div>
  );
}
