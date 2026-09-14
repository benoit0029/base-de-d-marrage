import type { FakeSimpleImport } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import { toDocumentHref } from "@/lib/storage/url";
import { SIMPLE_IMPORT_CATEGORY_LABELS } from "@/lib/simpleImportLabels";
import type { SimpleImportCategory } from "@prisma/client";

export default function SimpleImportTable({ items }: { items: FakeSimpleImport[] }) {
  if (items.length === 0) {
    return <p className="p-6 text-sm text-slate-500">Aucun document importé pour le moment.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Type</th>
            <th className="px-4 py-2.5">Période</th>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5 text-right">Montant TTC</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5">
                {SIMPLE_IMPORT_CATEGORY_LABELS[item.category as SimpleImportCategory] ?? item.category}
              </td>
              <td className="px-4 py-2.5 text-slate-600">{item.period ?? "—"}</td>
              <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(item.date)}</td>
              <td className="px-4 py-2.5 text-right font-medium">
                {item.amountTtc !== null ? formatEuro(item.amountTtc) : "—"}
              </td>
              <td className="px-4 py-2.5 text-right">
                <a
                  href={toDocumentHref(item.fileUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-slate-600 underline"
                >
                  Ouvrir
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
