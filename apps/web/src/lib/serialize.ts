import type {
  Document,
  Entry,
  Invoice,
  CashJournalEntry,
  SimpleImport,
  BankTransaction,
  TvaInstallment,
  Client,
  Product,
} from "@prisma/client";
import type {
  FakeEntry,
  FakeInvoice,
  FakeCashJournalEntry,
  FakeExceptionalSale,
  FakeSimpleImport,
  FakeBankTransaction,
  FakeTvaInstallment,
  FakeClient,
  FakeProduct,
  EntryStatus,
} from "@/lib/types";

const genericStatusMap: Record<"PENDING" | "VALIDATED", EntryStatus> = {
  PENDING: "pending",
  VALIDATED: "validated",
};

const typeMap: Record<Entry["type"], FakeEntry["type"]> = {
  RECETTE: "recette",
  ACHAT: "achat",
  IMMOBILISATION: "immobilisation",
};

const statusMap: Record<Entry["status"], FakeEntry["status"]> = {
  PENDING: "pending",
  VALIDATED: "validated",
};

const sourceMap: Record<Document["source"], FakeEntry["source"]> = {
  EMAIL: "email",
  PHOTO: "photo",
  UPLOAD: "manuel",
};

export function toEntryView(entry: Entry & { sourceDocument: Document | null }): FakeEntry {
  return {
    id: entry.id,
    type: typeMap[entry.type],
    status: statusMap[entry.status],
    date: entry.date.toISOString(),
    counterpartyName: entry.counterpartyName,
    nature: entry.nature,
    amountHt: Number(entry.amountHt),
    amountVat: Number(entry.amountVat),
    amountTtc: Number(entry.amountTtc),
    source: entry.sourceDocument ? sourceMap[entry.sourceDocument.source] : "manuel",
    reconciled: entry.bankTransactionId !== null,
    possibleDuplicate: entry.sourceDocument?.possibleDuplicateOfId != null,
    paidAt: entry.paidAt ? entry.paidAt.toISOString() : null,
  };
}

const invoiceTypeMap: Record<Invoice["type"], FakeInvoice["type"]> = {
  DEVIS: "devis",
  FACTURE: "facture",
};

const invoiceStatusMap: Record<Invoice["status"], FakeInvoice["status"]> = {
  DRAFT: "draft",
  SENT: "sent",
  PAID: "paid",
  CANCELLED: "cancelled",
};

export function toInvoiceView(invoice: Invoice): FakeInvoice {
  return {
    id: invoice.id,
    type: invoiceTypeMap[invoice.type],
    number: invoice.number,
    clientName: invoice.clientName,
    issueDate: invoice.issueDate.toISOString(),
    status: invoiceStatusMap[invoice.status],
    totalTtc: Number(invoice.totalTtc),
    paExternalId: invoice.paExternalId,
    reconciled: invoice.bankTransactionId !== null,
    paidAt: invoice.paidAt ? invoice.paidAt.toISOString() : null,
  };
}

function parseExceptionalSales(json: unknown): FakeExceptionalSale[] {
  if (!Array.isArray(json)) return [];
  return json
    .filter((s): s is Record<string, unknown> => Boolean(s) && typeof s === "object")
    .map((s) => ({
      amountTtc: Number(s.amountTtc) || 0,
      paymentMethod: typeof s.paymentMethod === "string" ? s.paymentMethod : "especes",
      description: typeof s.description === "string" ? s.description : undefined,
    }));
}

export function toSimpleImportView(item: SimpleImport): FakeSimpleImport {
  return {
    id: item.id,
    category: item.category,
    period: item.period,
    date: item.date.toISOString(),
    fileUrl: item.fileUrl,
    amountTtc: item.amountTtc ? Number(item.amountTtc) : null,
    linkedEntryId: item.linkedEntryId,
    status: genericStatusMap[item.status],
  };
}

export function toClientView(client: Client): FakeClient {
  return {
    id: client.id,
    name: client.name,
    address: client.address,
    siret: client.siret,
    vatNumber: client.vatNumber,
  };
}

export function toProductView(product: Product): FakeProduct {
  return {
    id: product.id,
    label: product.label,
    defaultUnitPrice: Number(product.defaultUnitPrice),
    vatRate: Number(product.vatRate),
  };
}

export function toTvaInstallmentView(item: TvaInstallment): FakeTvaInstallment {
  return {
    id: item.id,
    dueLabel: item.dueLabel,
    amountPaid: Number(item.amountPaid),
    paidAt: item.paidAt.toISOString(),
    justificatifUrl: item.justificatifUrl,
    status: genericStatusMap[item.status],
  };
}

type BankTransactionWithMatches = BankTransaction & {
  entry: { counterpartyName: string } | null;
  invoice: { number: string } | null;
  cashJournalEntry: { id: string } | null;
};

export function toBankTransactionView(tx: BankTransactionWithMatches): FakeBankTransaction {
  const reconciledWith = tx.entry
    ? `Dépense — ${tx.entry.counterpartyName}`
    : tx.invoice
      ? `Facture ${tx.invoice.number}`
      : tx.cashJournalEntry
        ? "Vente directe (caisse)"
        : null;

  return {
    id: tx.id,
    date: tx.date.toISOString(),
    label: tx.label,
    amount: Number(tx.amount),
    direction: tx.direction,
    reconciled: reconciledWith !== null,
    reconciledWith,
    status: genericStatusMap[tx.status],
  };
}

export function toCashJournalView(entry: CashJournalEntry): FakeCashJournalEntry {
  const exceptionalSales = parseExceptionalSales(entry.exceptionalSales);
  const cashAmount = Number(entry.cashAmount);
  const checkAmount = Number(entry.checkAmount);
  const cardAmount = Number(entry.cardAmount);
  const totalTtc =
    cashAmount + checkAmount + cardAmount + exceptionalSales.reduce((s, e) => s + e.amountTtc, 0);

  return {
    id: entry.id,
    date: entry.date.toISOString(),
    cashAmount,
    checkAmount,
    cardAmount,
    totalTtc,
    depositSlipUrl: entry.depositSlipUrl,
    cardStatementUrl: entry.cardStatementUrl,
    exceptionalSales,
    status: genericStatusMap[entry.status],
    reconciled: entry.bankTransactionId !== null,
  };
}
