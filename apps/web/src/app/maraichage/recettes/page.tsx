import { listEntries } from "@/server/services/entries";
import { toEntryView } from "@/lib/serialize";
import EntriesTable from "@/components/EntriesTable";
import CaptureForm from "@/components/CaptureForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const entries = await listEntries("BA_MARAICHAGE");
  const recettes = entries.filter((e) => e.type === "RECETTE").map(toEntryView);

  return (
    <div className="space-y-4">
      <CaptureForm />
      <div className="rounded-lg border bg-white">
        <EntriesTable entries={recettes} />
      </div>
    </div>
  );
}
