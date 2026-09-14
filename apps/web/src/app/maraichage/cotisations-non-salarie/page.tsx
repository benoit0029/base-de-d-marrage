import { listSimpleImports } from "@/server/services/simpleImports";
import { toSimpleImportView } from "@/lib/serialize";
import { SIMPLE_IMPORT_CATEGORY_LABELS } from "@/lib/simpleImportLabels";
import SimpleImportForm from "@/components/SimpleImportForm";
import SimpleImportTable from "@/components/SimpleImportTable";

export const dynamic = "force-dynamic";

// Cotisations non salarié (Maraîchage, séparé de Tesa+) : appels de
// cotisation MSA de l'exploitant lui-même, en tant que non salarié. Même
// logique de simple importation, mais chaque import génère en plus une
// ligne dans le registre des Dépenses (voir SimpleImport.linkedEntry).
export default async function Page() {
  const items = await listSimpleImports("BA_MARAICHAGE", "COTISATION_NON_SALARIE");

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
        description="Chaque import crée automatiquement une ligne dans le registre des Dépenses, en attente de validation."
      />
      <div className="rounded-lg border bg-white">
        <SimpleImportTable items={items.map(toSimpleImportView)} />
      </div>
    </div>
  );
}
