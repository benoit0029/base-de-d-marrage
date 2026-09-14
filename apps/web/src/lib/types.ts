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

// Journal de caisse (vente directe) — voir CashJournalEntry dans le schéma.
// Distinct du livre des recettes lui-même : une des sources qui l'alimente
// (avec les factures), jamais fusionnée avec elles à l'affichage.
export interface FakeExceptionalSale {
  amountTtc: number;
  paymentMethod: string;
  description?: string;
}

export interface FakeCashJournalEntry {
  id: string;
  date: string;
  cashAmount: number;
  checkAmount: number;
  cardAmount: number;
  totalTtc: number;
  depositSlipUrl: string | null;
  cardStatementUrl: string | null;
  exceptionalSales: FakeExceptionalSale[];
  status: EntryStatus;
}

// Ligne unifiée du livre des recettes (Maraîchage) : une ligne par facture
// ET une ligne par jour de vente directe, jamais additionnées même à date
// identique — voir docs/ARCHITECTURE.md.
export type LivreRecettesLigne =
  | { kind: "invoice"; date: string; data: FakeInvoice }
  | { kind: "cash_journal"; date: string; data: FakeCashJournalEntry };
