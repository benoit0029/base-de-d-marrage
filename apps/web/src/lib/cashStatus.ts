// Étiquette de statut "comptabilité de caisse" (BOI-BA-BASE-20-10) : une
// ligne validée mais pas encore encaissée/payée est une créance/dette en
// cours, distincte du statut "en attente de validation" (voir EntryStatus).

import type { FakeEntry, FakeInvoice } from "@/lib/types";

export function entryCashLabel(entry: Pick<FakeEntry, "status" | "paidAt">): string {
  if (entry.status === "pending") return "En attente";
  return entry.paidAt ? "Payée" : "Facture reçue — dette en cours";
}

export function invoiceCashLabel(invoice: Pick<FakeInvoice, "status" | "paidAt">): string {
  if (invoice.status === "draft") return "Brouillon";
  if (invoice.status === "cancelled") return "Annulée";
  return invoice.paidAt ? "Encaissée" : "Facturée — créance en cours";
}
