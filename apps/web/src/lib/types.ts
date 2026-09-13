// Types partagés pour le squelette d'interface (phase 2).
// Reflètent grossièrement prisma/schema.prisma, sans dépendance à Prisma ici :
// ce module ne fait que typer les données factices affichées en phase 2.

export type Activity = "maraichage" | "fruits-legumes" | "photobooth";

export type EntryType = "recette" | "achat" | "immobilisation";
export type EntryStatus = "pending" | "validated";

export interface FakeEntry {
  id: string;
  type: EntryType;
  status: EntryStatus;
  date: string;
  counterpartyName: string;
  nature: string;
  amountHt: number;
  amountVat: number;
  amountTtc: number;
  source: "email" | "photo" | "manuel";
}

export type InvoiceType = "devis" | "facture";
export type InvoiceStatus = "draft" | "sent" | "paid" | "cancelled";

export interface FakeInvoice {
  id: string;
  type: InvoiceType;
  number: string;
  clientName: string;
  issueDate: string;
  status: InvoiceStatus;
  totalTtc: number;
}

export interface ThresholdInfo {
  label: string;
  caCumule: number;
  seuil: number;
}
