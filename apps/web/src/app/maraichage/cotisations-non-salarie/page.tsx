import { listSimpleImports } from "@/server/services/simpleImports";
import { listClosedYears } from "@/server/services/fiscalYearClosure";
import { toSimpleImportView } from "@/lib/serialize";
import { filterByYear, yearOfIsoDate } from "@/lib/fiscalYear/rowYear";
import { SIMPLE_IMPORT_CATEGORY_LABELS } from "@/lib/simpleImportLabels";
import SimpleImportForm from "@/components/SimpleImportForm";
import SimpleImportTable from "@/components/SimpleImportTable";
import YearFilter from "@/components/YearFilter";

export const dynamic = "force-dynamic";

// Cotisations non salarié (Maraîchage, séparé de Tesa+) : appels de
// cotisation MSA de l'exploitant lui-même, en tant que non salarié. Même
// logique de simple importation, mais chaque import génère en plus une
// ligne dans le registre des Dépenses (voir SimpleImport.linkedEntry).
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const { year: yearParam } = await searchParams;
  const year = yearParam ? Number(yearParam) : null;

  const [allItems, closedYears] = await Promise.all([
    listSimpleImports("BA_MARAICHAGE", "COTISATION_NON_SALARIE"),
    listClosedYears(),
  ]);
  const items = filterByYear(
    allItems.map(toSimpleImportView),
    (i) => yearOfIsoDate(i.date),
    Number.isInteger(year) ? year : null
  );

  return (
    <div className="space-y-4">
      <SimpleImportForm
        activity="BA_MARAICHAGE"
        categoryOptions={[
          { value: "COTISATION_NON_SALARIE", label: SIMPLE_IMPORT_CATEGORY_LABELS.COTISATION_NON_SALARIE },
        ]}
        amountRequired
        showPeriod
        revalidatePaths={["/maraichage/cotisations-non-salarie", "/maraichage/achats"]}
        title="Importer un appel de cotisation MSA (non salarié)"
        description="Choisis le fichier : la date, la période et le montant sont lus automatiquement — à vérifier avant d'importer. Chaque import crée une ligne dans le registre des Dépenses, en attente de validation."
        readKind="cotisation_msa"
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
