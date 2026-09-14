import { listBankTransactions } from "@/server/services/bankTransactions";
import { toBankTransactionView } from "@/lib/serialize";
import BankStatementImportForm from "@/components/BankStatementImportForm";
import BankTransactionsTable from "@/components/BankTransactionsTable";

export const dynamic = "force-dynamic";

// Compte bancaire dédié Maraîchage — distinct des deux autres activités.
export default async function Page() {
  const transactions = await listBankTransactions("BA_MARAICHAGE");

  return (
    <div className="space-y-4">
      <BankStatementImportForm activity="BA_MARAICHAGE" />
      <div className="rounded-lg border bg-white">
        <BankTransactionsTable transactions={transactions.map(toBankTransactionView)} />
      </div>
    </div>
  );
}
