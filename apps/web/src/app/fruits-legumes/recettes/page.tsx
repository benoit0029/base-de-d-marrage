import { listCashJournalEntries } from "@/server/services/cashJournal";
import { toCashJournalView } from "@/lib/serialize";
import CashJournalForm from "@/components/CashJournalForm";
import CashJournalTable from "@/components/CashJournalTable";

export const dynamic = "force-dynamic";

// Revente Fruits/Légumes est confirmée 100% vente directe (facturation
// désactivée) : le livre des recettes de cette activité ne contient que les
// lignes du journal de caisse — pas de capture IA de documents ici.
export default async function Page() {
  const entries = await listCashJournalEntries("BIC_FRUITS_LEGUMES");
  const view = entries.map(toCashJournalView);

  return (
    <div className="space-y-4">
      <CashJournalForm activity="BIC_FRUITS_LEGUMES" />
      <div className="rounded-lg border bg-white">
        <CashJournalTable entries={view} />
      </div>
    </div>
  );
}
