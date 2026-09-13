import type { Document, Entry } from "@prisma/client";
import type { FakeEntry } from "@/lib/types";

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
