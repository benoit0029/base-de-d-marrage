import { getEntries } from "@/lib/fixtures/entries";
import EntriesTable from "@/components/EntriesTable";

export default function Page() {
  const entries = getEntries("maraichage").filter((e) => e.type === "recette");
  return (
    <div className="rounded-lg border bg-white">
      <EntriesTable entries={entries} />
    </div>
  );
}
