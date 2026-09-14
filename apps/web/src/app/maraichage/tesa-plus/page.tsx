import { listSimpleImports } from "@/server/services/simpleImports";
import { toSimpleImportView } from "@/lib/serialize";
import { TESA_CATEGORIES, SIMPLE_IMPORT_CATEGORY_LABELS } from "@/lib/simpleImportLabels";
import SimpleImportForm from "@/components/SimpleImportForm";
import SimpleImportTable from "@/components/SimpleImportTable";

export const dynamic = "force-dynamic";

// Tesa+ : simple importation de tous les documents liés au salarié
// (contrat, bulletin de paie, cotisations salariales, certificat de
// travail, attestation Pôle Emploi, solde de tout compte), traités de façon
// identique — upload + date, rattachés à la période de contrat, sans
// calculateur.
export default async function Page() {
  const items = (await listSimpleImports("BA_MARAICHAGE")).filter((i) =>
    (TESA_CATEGORIES as string[]).includes(i.category)
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
        description="Contrat, bulletin de paie, cotisations salariales, certificat de travail, attestation Pôle Emploi, solde de tout compte : tous traités de façon identique, sans calcul automatique."
      />
      <div className="rounded-lg border bg-white">
        <SimpleImportTable items={items.map(toSimpleImportView)} />
      </div>
    </div>
  );
}
