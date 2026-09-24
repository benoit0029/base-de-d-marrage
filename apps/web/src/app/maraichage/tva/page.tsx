import { computeTvaRegister } from "@/lib/tva";
import { formatEuro } from "@/lib/format";

export const dynamic = "force-dynamic";

// Registre TVA (régime simplifié agricole) : calculé automatiquement à
// partir des factures et du journal de caisse (TVA collectée) et des Dépenses validées
// (TVA déductible) — plus une donnée de démonstration. Le statut confronte
// ce calcul aux paiements d'acompte réellement enregistrés (onglet Acompte TVA).
export default async function Page() {
  const rows = await computeTvaRegister();

  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
      <p className="p-4 text-sm text-slate-500">
        Registre TVA — régime simplifié agricole (RSA). Calculé
        automatiquement à partir des factures, des ventes directes (journal de
        caisse) et des Dépenses validées.
      </p>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Période</th>
            <th className="px-4 py-2.5 text-right">TVA collectée</th>
            <th className="px-4 py-2.5 text-right">TVA déductible</th>
            <th className="px-4 py-2.5 text-right">TVA nette due</th>
            <th className="px-4 py-2.5">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.period}>
              <td className="px-4 py-2.5">{row.period}</td>
              <td className="px-4 py-2.5 text-right">
                {formatEuro(row.collected)}
                {row.collectedDirect > 0 && (
                  <span className="block text-xs text-slate-400">dont {formatEuro(row.collectedDirect)} vente directe</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-right">{formatEuro(row.deductible)}</td>
              <td className="px-4 py-2.5 text-right font-medium">{formatEuro(row.net)}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    row.status === "réglé"
                      ? "bg-emerald-100 text-emerald-800"
                      : row.status === "dispensé"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {row.status === "réglé" ? "Réglé" : row.status === "dispensé" ? "Dispensé" : "À traiter"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
