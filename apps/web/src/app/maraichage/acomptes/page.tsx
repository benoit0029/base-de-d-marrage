import { tvaInstallmentsFixture } from "@/lib/fixtures/maraichage-admin";
import { formatDate, formatEuro } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

const statusMap: Record<string, string> = {
  a_payer: "pending",
  a_venir: "draft",
  paye: "validated",
};

export default function Page() {
  return (
    <div className="rounded-lg border bg-white">
      <p className="p-4 text-sm text-slate-500">
        Échéancier des acomptes de TVA trimestriels (régime simplifié
        agricole).
      </p>
      <ul className="divide-y divide-slate-100">
        {tvaInstallmentsFixture.map((row) => (
          <li key={row.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">{row.periode}</p>
              <p className="text-xs text-slate-500">
                Échéance : {formatDate(row.echeance)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">{formatEuro(row.montant)}</span>
              <StatusBadge status={statusMap[row.statut] ?? row.statut} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
