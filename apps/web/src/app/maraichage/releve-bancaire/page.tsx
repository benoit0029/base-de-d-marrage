import { listBankTransactions } from "@/server/services/bankTransactions";
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
  const view = filterByYear(
    transactions.map(toBankTransactionView),
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
