// Types de présentation (vue) pour les tableaux d'écritures/factures.
// Les noms "Fake*" datent du squelette d'interface (phase 2, données
// factices) ; ils servent maintenant de format de sortie pour les
// sérialiseurs de src/lib/serialize.ts qui convertissent les enregistrements
// Prisma (enums en majuscules, Decimal, dates) vers ces valeurs d'affichage.

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
  paExternalId: string | null;
}
