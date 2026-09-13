const styles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  validated: "bg-emerald-100 text-emerald-800",
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-sky-100 text-sky-800",
  paid: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-700",
};

const labels: Record<string, string> = {
  pending: "En attente de validation",
  validated: "Validée",
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  cancelled: "Annulée",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {labels[status] ?? status}
    </span>
  );
}
