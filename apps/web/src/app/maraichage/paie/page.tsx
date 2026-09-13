import { payslipsFixture } from "@/lib/fixtures/maraichage-admin";
import { formatEuro } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

const dsnStatusMap: Record<string, string> = {
  transmise: "validated",
  a_transmettre: "pending",
};

export default function Page() {
  return (
    <div className="rounded-lg border bg-white overflow-x-auto">
      <p className="p-4 text-sm text-slate-500">
        Bulletins de paie du salarié et statut de transmission DSN.
      </p>
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Période</th>
            <th className="px-4 py-2.5">Salarié</th>
            <th className="px-4 py-2.5 text-right">Brut</th>
            <th className="px-4 py-2.5 text-right">Net</th>
            <th className="px-4 py-2.5">DSN</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payslipsFixture.map((row) => (
            <tr key={row.id}>
              <td className="px-4 py-2.5">{row.periode}</td>
              <td className="px-4 py-2.5">{row.salarie}</td>
              <td className="px-4 py-2.5 text-right">{formatEuro(row.brut)}</td>
              <td className="px-4 py-2.5 text-right font-medium">{formatEuro(row.net)}</td>
              <td className="px-4 py-2.5">
                <StatusBadge status={dsnStatusMap[row.dsnStatut] ?? row.dsnStatut} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
