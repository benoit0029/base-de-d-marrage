import type { Document, Entry, Invoice } from "@prisma/client";
import type { FakeEntry, FakeInvoice } from "@/lib/types";

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
  };
}
