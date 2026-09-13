import type { ThresholdCheck } from "@/lib/thresholds";
import { formatEuro } from "@/lib/format";

const barColor: Record<ThresholdCheck["level"], string> = {
  ok: "bg-emerald-500",
  vigilance: "bg-amber-500",
  depassement: "bg-red-500",
};

const badge: Record<ThresholdCheck["level"], { text: string; cls: string }> = {
  ok: { text: "OK", cls: "bg-emerald-100 text-emerald-800" },
  vigilance: { text: "Vigilance", cls: "bg-amber-100 text-amber-800" },
  depassement: { text: "Seuil dépassé", cls: "bg-red-100 text-red-700" },
};

export default function ThresholdBar({ threshold }: { threshold: ThresholdCheck }) {
  const ratio = Math.min(threshold.caCumule / threshold.seuil, 1);

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{threshold.label}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge[threshold.level].cls}`}>
          {badge[threshold.level].text}
        </span>
      </div>
      <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${barColor[threshold.level]}`} style={{ width: `${ratio * 100}%` }} />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {formatEuro(threshold.caCumule)} sur {formatEuro(threshold.seuil)}
        {threshold.seuilTolerance
          ? ` (tolérance jusqu'à ${formatEuro(threshold.seuilTolerance)} l'année du dépassement)`
          : ""}
      </p>
    </div>
  );
}
