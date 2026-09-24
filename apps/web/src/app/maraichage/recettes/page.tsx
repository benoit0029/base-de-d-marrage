import { listInvoices } from "@/server/services/invoices";
import { listCashJournalEntries } from "@/server/services/cashJournal";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toInvoiceView, toCashJournalView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import type { LivreRecettesLigne } from "@/lib/types";
import CashJournalForm from "@/components/CashJournalForm";
import MaraichageLedgerTable from "@/components/MaraichageLedgerTable";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

// Livre des recettes du Maraîchage : factures ET vente directe coexistent
// (une ligne par facture, une ligne par jour de vente directe), jamais
// fusionnées même à date identique — voir docs/ARCHITECTURE.md.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [invoices, cashJournalEntries, closedYears] = await Promise.all([
    listInvoices("BA_MARAICHAGE"),
    listCashJournalEntries("BA_MARAICHAGE"),
    listClosedYears(),
  ]);

  // Lieux déjà saisis, proposés en suggestion dans le formulaire (du plus récent au plus ancien).
  const knownLocations = [...new Set(cashJournalEntries.map((e) => e.location?.trim()).filter((l): l is string => !!l))];

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

  const filtered = filterByYear(
    lignes,
    (l) => yearOfIsoDate(l.kind === "invoice" ? l.data.paidAt : l.data.date),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="space-y-4">
      <CashJournalForm activity="BA_MARAICHAGE" knownLocations={knownLocations} />
      <div className="flex items-center justify-between">
        <a
          href="/api/cash-journal/blank-sheets/BA_MARAICHAGE/pdf"
          target="_blank"
          rel="noopener"
          className="text-sm text-slate-600 underline"
        >
          Imprimer des fiches vierges (PDF)
        </a>
        <YearFilter closedYears={closedYears} />
      </div>
      <div className="rounded-lg border bg-white">
        <MaraichageLedgerTable lignes={filtered} closedYears={closedYears} />
      </div>
    </div>
  );
}
