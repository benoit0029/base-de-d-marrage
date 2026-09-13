import { tvaRegisterFixture } from "@/lib/fixtures/maraichage-admin";
import { formatEuro } from "@/lib/format";

export default function Page() {
  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
      <p className="p-4 text-sm text-slate-500">
        Registre TVA — régime simplifié agricole (RSA). Alimenté
        automatiquement à partir des recettes et achats validés (phase 3).
      </p>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Période</th>
            <th className="px-4 py-2.5 text-right">Base HT</th>
            <th className="px-4 py-2.5 text-right">TVA collectée</th>
            <th className="px-4 py-2.5 text-right">TVA déductible</th>
            <th className="px-4 py-2.5 text-right">Solde</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tvaRegisterFixture.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2.5">{row.periode}</td>
              <td className="px-4 py-2.5 text-right">{formatEuro(row.baseHt)}</td>
              <td className="px-4 py-2.5 text-right">{formatEuro(row.tvaCollectee)}</td>
              <td className="px-4 py-2.5 text-right">{formatEuro(row.tvaDeductible)}</td>
              <td className="px-4 py-2.5 text-right font-medium">
                {formatEuro(row.solde)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
