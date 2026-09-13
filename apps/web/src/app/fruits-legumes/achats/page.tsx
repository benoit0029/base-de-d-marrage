import { getEntries } from "@/lib/fixtures/entries";
import EntriesTable from "@/components/EntriesTable";

export default function Page() {
  const entries = getEntries("fruits-legumes").filter((e) => e.type === "achat");
  return (
    <div className="rounded-lg border bg-white">
      <EntriesTable entries={entries} />
    </div>
  );
}
