// Vue d'un devis entreprise Kerbooth pour la liste des factures (utilisable
// côté serveur et côté navigateur).

export interface KerboothQuoteView {
  id: string;
  status: "DRAFT" | "TO_SEND" | "SENT" | "SIGNED" | "EXPIRED" | "CANCELLED";
  clientEmail: string;
  sentAt: string | null;
  expiresAt: string | null;
  signedAt: string | null;
  invoiceNumber: string | null;
  units: string[];
}

const fr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

export function quoteStatusLabel(q: KerboothQuoteView): string {
  switch (q.status) {
    case "DRAFT":
      return "Pas encore envoyé";
    case "TO_SEND":
      return "Envoi en cours…";
    case "SENT":
      return `Envoyé le ${fr(q.sentAt)} — en attente de signature (jusqu'au ${fr(q.expiresAt)})`;
    case "SIGNED":
      return `Signé le ${fr(q.signedAt)}${q.invoiceNumber ? ` — facture ${q.invoiceNumber}` : ""}`;
    case "EXPIRED":
      return "Expiré (non signé) — photobooths libérés";
    case "CANCELLED":
      return "Annulé — photobooths libérés";
  }
}
