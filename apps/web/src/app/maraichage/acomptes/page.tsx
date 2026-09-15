import { listTvaInstallments } from "@/server/services/tvaInstallments";
import { toTvaInstallmentView } from "@/lib/serialize";
import TvaInstallmentForm from "@/components/TvaInstallmentForm";
import TvaInstallmentTable from "@/components/TvaInstallmentTable";

export const dynamic = "force-dynamic";

// Acompte TVA (Maraîchage, régime simplifié agricole) : simple import après
// paiement, justificatif à l'appui — plus une donnée de démonstration.
export default async function Page() {
  const items = await listTvaInstallments();

  return (
    <div className="space-y-4">
      <TvaInstallmentForm />
      <div className="rounded-lg border bg-white">
        <TvaInstallmentTable items={items.map(toTvaInstallmentView)} />
      </div>
    </div>
  );
}
