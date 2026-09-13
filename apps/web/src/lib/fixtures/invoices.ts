import type { Activity, FakeInvoice } from "@/lib/types";

// Données factices — phase 2 uniquement.
const fixtures: Record<Activity, FakeInvoice[]> = {
  maraichage: [
    {
      id: "inv-ba-1",
      type: "facture",
      number: "BA-2026-014",
      clientName: "Restaurant Le Goéland",
      issueDate: "2026-09-04",
      status: "sent",
      totalTtc: 210,
    },
    {
      id: "inv-ba-2",
      type: "devis",
      number: "BA-DEV-006",
      clientName: "Cantine scolaire de Loctudy",
      issueDate: "2026-09-11",
      status: "draft",
      totalTtc: 640,
    },
  ],
  "fruits-legumes": [],
  photobooth: [
    {
      id: "inv-pb-1",
      type: "facture",
      number: "PB-2026-009",
      clientName: "Mariage Le Guennec",
      issueDate: "2026-09-06",
      status: "paid",
      totalTtc: 450,
    },
  ],
};

export function getInvoices(activity: Activity): FakeInvoice[] {
  return fixtures[activity];
}
