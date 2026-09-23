import { listSimpleImports } from "@/server/services/simpleImports";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toSimpleImportView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import { TESA_CATEGORIES, SIMPLE_IMPORT_CATEGORY_LABELS } from "@/lib/simpleImportLabels";
import SimpleImportForm from "@/components/SimpleImportForm";
import SimpleImportTable from "@/components/SimpleImportTable";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

// Tesa+ : simple importation de tous les documents liés au salarié
// (contrat, bulletin de paie, cotisations salariales, certificat de
// travail, attestation Pôle Emploi, solde de tout compte), traités de façon
// identique — upload + date, rattachés à la période de contrat, sans
// calculateur.
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [allItems, closedYears] = await Promise.all([
    listSimpleImports("BA_MARAICHAGE"),
    listClosedYears(),
  ]);
  const items = filterByYear(
    allItems.filter((i) => (TESA_CATEGORIES as string[]).includes(i.category)).map(toSimpleImportView),
    (i) => yearOfIsoDate(i.date),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="space-y-4">
      <SimpleImportForm
        activity="BA_MARAICHAGE"
        categoryOptions={TESA_CATEGORIES.map((value) => ({
          value,
          label: SIMPLE_IMPORT_CATEGORY_LABELS[value],
        }))}
        amountRequired={false}
        showPeriod
        revalidatePaths={["/maraichage/tesa-plus"]}
        title="Importer un document Tesa+"
        description="Contrat, bulletin de paie, cotisations salariales, certificat de travail, attestation Pôle Emploi, solde de tout compte : choisis le fichier, le type, la date, la période et le montant sont lus automatiquement — à vérifier avant d'importer."
        readKind="tesa"
      />
      <div className="flex justify-end">
        <YearFilter closedYears={closedYears} />
      </div>
      <div className="rounded-lg border bg-white">
        <SimpleImportTable items={items} closedYears={closedYears} />
      </div>
    </div>
  );
}
