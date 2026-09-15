"use client";

import { Fragment, useState } from "react";
import type { LivreRecettesLigne } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import { CashJournalActions, CashJournalDetail } from "@/components/CashJournalTable";

// Livre des recettes du Maraîchage : une ligne par facture ET une ligne par
// jour de vente directe. Deux lignes à la même date restent deux lignes
// distinctes, jamais additionnées en un seul total — voir
// docs/ARCHITECTURE.md et le point de clarification du micro-BA.
export default function MaraichageLedgerTable({ lignes }: { lignes: LivreRecettesLigne[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const sorted = [...lignes].sort((a, b) => (a.date < b.date ? 1 : -1));

  if (sorted.length === 0) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Aucune recette pour le moment (ni facture, ni saisie de vente directe).
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Date</th>
            <th className="px-4 py-2.5">Origine</th>
            <th className="px-4 py-2.5 text-right">Montant TTC</th>
            <th className="px-4 py-2.5">Statut</th>
            <th className="px-4 py-2.5">Relevé bancaire</th>
            <th className="px-4 py-2.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sorted.map((ligne) => {
            const rowKey = `${ligne.kind}-${ligne.data.id}`;
            if (ligne.kind === "invoice") {
              const inv = ligne.data;
              return (
                <tr key={rowKey} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(inv.issueDate)}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800">
                      Facture {inv.number}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatEuro(inv.totalTtc)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {inv.reconciled ? (
                      <span className="text-emerald-700">✓ Pointé</span>
                    ) : (
                      <span className="text-slate-400">Non pointé</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-medium text-slate-600 underline"
                    >
                      PDF
                    </a>
                  </td>
                </tr>
              );
            }

            const cash = ligne.data;
            return (
              <Fragment key={rowKey}>
                <tr className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 whitespace-nowrap">{formatDate(cash.date)}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                      Vente directe (caisse)
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{formatEuro(cash.totalTtc)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={cash.status} />
                  </td>
                  <td className="px-4 py-2.5 text-xs">
                    {cash.reconciled ? (
                      <span className="text-emerald-700">✓ Pointé</span>
                    ) : (
                      <span className="text-slate-400">Non pointé</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === rowKey ? null : rowKey)}
                        className="text-xs font-medium text-slate-600 underline"
                      >
                        {expanded === rowKey ? "Masquer" : "Détail"}
                      </button>
                      <CashJournalActions entry={cash} />
                    </div>
                  </td>
                </tr>
                {expanded === rowKey && (
                  <tr>
                    <td colSpan={6} className="p-0">
                      <CashJournalDetail entry={cash} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
