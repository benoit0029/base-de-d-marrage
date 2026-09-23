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
  reconciled: boolean; // rapproché avec une ligne du relevé bancaire (Dépenses)
  possibleDuplicate: boolean; // même document probablement déjà reçu par un autre canal
  // Comptabilité de caisse (BOI-BA-BASE-20-10) : date de PAIEMENT réel, pas
  // la date de facture ci-dessus. Vide = dette en cours (voir lib/cashStatus).
  paidAt: string | null;
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
  reconciled: boolean; // rapproché avec une ligne du relevé bancaire (Recettes)
  // Comptabilité de caisse (BOI-BA-BASE-20-10) : date d'ENCAISSEMENT réel,
  // pas issueDate ci-dessus. Vide = créance en cours (voir lib/cashStatus).
  paidAt: string | null;
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
  reconciled: boolean; // rapproché avec une ligne du relevé bancaire (Recettes)
}

// Ligne unifiée du livre des recettes (Maraîchage) : une ligne par facture
// ET une ligne par jour de vente directe, jamais additionnées même à date
// identique — voir docs/ARCHITECTURE.md.
export type LivreRecettesLigne =
  | { kind: "invoice"; date: string; data: FakeInvoice }
  | { kind: "cash_journal"; date: string; data: FakeCashJournalEntry };

// Import simple (Tesa+, Cotisations non salarié) : upload + date, sans
// calculateur — voir SimpleImport dans le schéma.
export interface FakeSimpleImport {
  id: string;
  category: string;
  period: string | null;
  date: string;
  fileUrl: string;
  amountTtc: number | null;
  linkedEntryId: string | null;
  status: EntryStatus;
}

// Ligne de relevé bancaire importée, avec son éventuel rapprochement.
// Rapprochement suggéré automatiquement (montant identique, unique candidat
// dans la fenêtre de date) — voir suggestReconciliationMatch. `null` :
// aucune suggestion fiable, retombe sur la sélection manuelle.
export type FakeSuggestedMatch =
  | { type: "entry" | "invoice" | "cashJournal"; id: string; label: string }
  // Plusieurs jours de vente directe cumulés dans un même dépôt hebdomadaire.
  | { type: "cashJournalGroup"; ids: string[]; label: string };

export interface FakeBankTransaction {
  id: string;
  date: string;
  label: string;
  amount: number;
  direction: "DEBIT" | "CREDIT";
  reconciled: boolean;
  reconciledWith: string | null; // libellé de la pièce rapprochée, pour affichage
  // Vide si le rapprochement n'est pas de type vente directe. Sinon, permet
  // d'ajouter d'autres jours au même dépôt même après un premier rapprochement
  // (voir BankTransactionsTable, "+ Ajouter un autre jour").
  reconciledCashJournalIds: string[];
  status: EntryStatus;
  suggestedMatch?: FakeSuggestedMatch | null;
}

// Acompte TVA (Maraîchage) — voir TvaInstallment dans le schéma.
export interface FakeTvaInstallment {
  id: string;
  dueLabel: string;
  amountPaid: number;
  paidAt: string;
  justificatifUrl: string | null;
  status: EntryStatus;
}

// Répertoire Clients / Catalogue Produits (module Facturation) — voir
// Client/Product dans le schéma.
export interface FakeClient {
  id: string;
  name: string;
  address: string | null;
  siret: string | null;
  vatNumber: string | null;
}

export interface FakeProduct {
  id: string;
  label: string;
  defaultUnitPrice: number;
  vatRate: number;
  unit: string | null;
}
