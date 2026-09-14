import { listInvoices } from "@/server/services/invoices";
import { listCashJournalEntries } from "@/server/services/cashJournal";
import { toInvoiceView, toCashJournalView } from "@/lib/serialize";
import type { LivreRecettesLigne } from "@/lib/types";
import CashJournalForm from "@/components/CashJournalForm";
import MaraichageLedgerTable from "@/components/MaraichageLedgerTable";

export const dynamic = "force-dynamic";

// Livre des recettes du Maraîchage : factures ET vente directe coexistent
// (une ligne par facture, une ligne par jour de vente directe), jamais
// fusionnées même à date identique — voir docs/ARCHITECTURE.md.
export default async function Page() {
  const [invoices, cashJournalEntries] = await Promise.all([
    listInvoices("BA_MARAICHAGE"),
    listCashJournalEntries("BA_MARAICHAGE"),
  ]);

  const lignes: LivreRecettesLigne[] = [
    ...invoices
      .filter((i) => i.type === "FACTURE" && i.status !== "CANCELLED")
      .map((i) => {
        const data = toInvoiceView(i);
        return { kind: "invoice" as const, date: data.issueDate, data };
      }),
    ...cashJournalEntries.map((e) => {
      const data = toCashJournalView(e);
      return { kind: "cash_journal" as const, date: data.date, data };
    }),
  ];

  return (
    <div className="space-y-4">
      <CashJournalForm activity="BA_MARAICHAGE" />
      <div className="rounded-lg border bg-white">
        <MaraichageLedgerTable lignes={lignes} />
      </div>
    </div>
  );
}
