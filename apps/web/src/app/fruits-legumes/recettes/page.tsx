import { listCashJournalEntries } from "@/server/services/cashJournal";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toCashJournalView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import CashJournalForm from "@/components/CashJournalForm";
import CashJournalTable from "@/components/CashJournalTable";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

// Revente Fruits/Légumes est confirmée 100% vente directe (facturation
// désactivée) : le livre des recettes de cette activité ne contient que les
// lignes du journal de caisse — pas de capture IA de documents ici.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [entries, closedYears] = await Promise.all([
    listCashJournalEntries("BIC_FRUITS_LEGUMES"),
    listClosedYears(),
  ]);
  const view = filterByYear(
    entries.map(toCashJournalView),
    (e) => yearOfIsoDate(e.date),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="space-y-4">
      <CashJournalForm activity="BIC_FRUITS_LEGUMES" />
      <div className="flex justify-end">
        <YearFilter closedYears={closedYears} />
      </div>
      <div className="rounded-lg border bg-white">
        <CashJournalTable entries={view} closedYears={closedYears} />
      </div>
    </div>
  );
}
