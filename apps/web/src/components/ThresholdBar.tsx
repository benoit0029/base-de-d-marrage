import type { ThresholdInfo } from "@/lib/types";
import { formatEuro } from "@/lib/format";

export default function ThresholdBar({ threshold }: { threshold: ThresholdInfo }) {
  const ratio = Math.min(threshold.caCumule / threshold.seuil, 1);
  const level =
    ratio >= 0.9 ? "danger" : ratio >= 0.7 ? "warning" : "ok";

  const barColor = {
    ok: "bg-emerald-500",
    warning: "bg-amber-500",
    danger: "bg-red-500",
  }[level];

  const badge = {
    ok: { text: "OK", cls: "bg-emerald-100 text-emerald-800" },
    warning: { text: "Vigilance", cls: "bg-amber-100 text-amber-800" },
    danger: { text: "Proche du seuil", cls: "bg-red-100 text-red-700" },
  }[level];

  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">{threshold.label}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
          {badge.text}
        </span>
      </div>
      <div className="mt-3 h-2.5 w-full rounded-full bg-slate-100">
        <div
          className={`h-2.5 rounded-full ${barColor}`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        {formatEuro(threshold.caCumule)} sur {formatEuro(threshold.seuil)}
      </p>
    </div>
  );
}
