import { listEntries } from "@/server/services/entries";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toEntryView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import EntriesTable from "@/components/EntriesTable";
import CaptureForm from "@/components/CaptureForm";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [entries, closedYears] = await Promise.all([listEntries("BA_MARAICHAGE"), listClosedYears()]);
  const achats = filterByYear(
    entries.filter((e) => e.type === "ACHAT" || e.type === "IMMOBILISATION").map(toEntryView),
    (e) => yearOfIsoDate(e.paidAt),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="space-y-4">
      <CaptureForm />
      <div className="flex justify-end">
        <YearFilter closedYears={closedYears} />
      </div>
      <div className="rounded-lg border bg-white">
        <EntriesTable entries={achats} activity="BA_MARAICHAGE" closedYears={closedYears} />
      </div>
    </div>
  );
}
