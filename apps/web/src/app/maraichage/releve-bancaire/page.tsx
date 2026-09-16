import { listBankTransactions, suggestReconciliationMatches } from "@/server/services/bankTransactions";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toBankTransactionView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import BankStatementImportForm from "@/components/BankStatementImportForm";
import BankTransactionsTable from "@/components/BankTransactionsTable";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

// Compte bancaire dédié Maraîchage — distinct des deux autres activités.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [transactions, closedYears] = await Promise.all([
    listBankTransactions("BA_MARAICHAGE"),
    listClosedYears(),
  ]);

  // Rapprochement suggéré automatiquement (montant identique, candidat
  // unique) pour chaque ligne pas encore pointée — évite d'avoir à ouvrir
  // "Rapprocher" pour découvrir s'il y a une correspondance, voir
  // docs/ARCHITECTURE.md.
  const unreconciled = transactions.filter((t) => !t.entry && !t.invoice && !t.cashJournalEntry);
  const suggestions = await suggestReconciliationMatches(
    "BA_MARAICHAGE",
    unreconciled.map((t) => ({ id: t.id, direction: t.direction, date: t.date, amount: Number(t.amount) }))
  );

  const view = filterByYear(
    transactions.map((t) => ({ ...toBankTransactionView(t), suggestedMatch: suggestions[t.id] ?? null })),
    (t) => yearOfIsoDate(t.date),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="space-y-4">
      <BankStatementImportForm activity="BA_MARAICHAGE" />
      <div className="flex justify-end">
        <YearFilter closedYears={closedYears} />
      </div>
      <div className="rounded-lg border bg-white">
        <BankTransactionsTable transactions={view} closedYears={closedYears} />
      </div>
    </div>
  );
}
