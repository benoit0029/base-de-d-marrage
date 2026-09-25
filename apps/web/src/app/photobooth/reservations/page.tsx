import { listBookings } from "@/server/services/kerbooth/bookings";
import { formatEuro } from "@/lib/format";
import type { KerboothBookingStatus, KerboothFormula } from "@prisma/client";

export const dynamic = "force-dynamic";

const statusLabel: Record<KerboothBookingStatus, string> = {
  PENDING_SIGNATURE: "En attente de signature (photobooth bloqué si devis)",
  PENDING_PAYMENT: "En attente de paiement",
  CONFIRMED: "Confirmée",
  CANCELLED: "Annulée",
};

const statusClass: Record<KerboothBookingStatus, string> = {
  PENDING_SIGNATURE: "bg-amber-100 text-amber-800",
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const formulaLabel: Record<KerboothFormula, string> = {
  ESSENTIEL: "Essentiel",
  POPULAIRE: "Populaire",
  ENTREPRISE: "Entreprise",
};

// Vue en lecture seule des réservations Kerbooth 360°, créées et suivies
// via les workflows n8n (voir kerbooth360/architecture-decision.md) — cet
// écran ne fait qu'afficher l'état, aucune action n'est possible ici.
export default async function Page() {
  const bookings = await listBookings();

  if (bookings.length === 0) {
    return (
      <p className="p-6 text-sm text-slate-500">
        Aucune réservation pour le moment. Les réservations créées via le
        site (dispatch automatique n8n) apparaîtront ici.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-2.5">Client</th>
            <th className="px-4 py-2.5">Événement</th>
            <th className="px-4 py-2.5">Formule</th>
            <th className="px-4 py-2.5">Unité</th>
            <th className="px-4 py-2.5 text-right">Montant</th>
            <th className="px-4 py-2.5">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {bookings.map((b) => (
            <tr key={b.id} className="hover:bg-slate-50">
              <td className="px-4 py-2.5">
                {b.clientName}
                {b.clientEmail && <div className="text-xs text-slate-400">{b.clientEmail}</div>}
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                {b.eventDateStart.toLocaleDateString("fr-FR")}
                {b.eventDateEnd.getTime() !== b.eventDateStart.getTime() &&
                  ` → ${b.eventDateEnd.toLocaleDateString("fr-FR")}`}
              </td>
              <td className="px-4 py-2.5">
                {formulaLabel[b.formula]}
                {b.quote && <div className="text-xs text-slate-400">Devis : {b.quote.formulaLabel}</div>}
              </td>
              <td className="px-4 py-2.5">{b.unit?.label ?? "—"}</td>
              <td className="px-4 py-2.5 text-right">
                {b.quote ? <span className="text-xs text-slate-500">voir le devis</span> : formatEuro(Number(b.totalAmount))}
              </td>
              <td className="px-4 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[b.status]}`}>
                  {statusLabel[b.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
