import { ca12aFixture } from "@/lib/fixtures/maraichage-admin";
import { formatDate } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export default function Page() {
  const d = ca12aFixture;
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          Déclaration CA12A — exercice {d.exercice}
        </p>
        <StatusBadge status={d.statut === "a_preparer" ? "pending" : "validated"} />
      </div>
      <p className="mt-2 text-sm text-slate-500">
        Date limite de dépôt : {formatDate(d.dateLimite)}
      </p>
    </div>
  );
}
