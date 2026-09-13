import type { Activity, FakeEntry } from "@/lib/types";

// Données factices — phase 2 uniquement. Remplacées par la base de données réelle en phase 3.
const fixtures: Record<Activity, FakeEntry[]> = {
  maraichage: [
    {
      id: "ba-1",
      type: "recette",
      status: "validated",
      date: "2026-09-02",
      counterpartyName: "Marché de Quimper",
      nature: "Vente de légumes bio",
      amountHt: 320,
      amountVat: 0,
      amountTtc: 320,
      source: "manuel",
    },
    {
      id: "ba-2",
      type: "achat",
      status: "pending",
      date: "2026-09-08",
      counterpartyName: "Graineterie du Ponant",
      nature: "Semences bio",
      amountHt: 145.5,
      amountVat: 14.55,
      amountTtc: 160.05,
      source: "email",
    },
    {
      id: "ba-3",
      type: "immobilisation",
      status: "pending",
      date: "2026-09-10",
      counterpartyName: "Agri-Matériel 29",
      nature: "Motoculteur d'occasion",
      amountHt: 1800,
      amountVat: 180,
      amountTtc: 1980,
      source: "photo",
    },
  ],
  "fruits-legumes": [
    {
      id: "fl-1",
      type: "recette",
      status: "validated",
      date: "2026-09-05",
      counterpartyName: "Vente directe ferme",
      nature: "Cagette de pommes",
      amountHt: 45,
      amountVat: 0,
      amountTtc: 45,
      source: "manuel",
    },
    {
      id: "fl-2",
      type: "achat",
      status: "pending",
      date: "2026-09-09",
      counterpartyName: "Grossiste Primeur Sud",
      nature: "Achat de fruits pour revente",
      amountHt: 210,
      amountVat: 0,
      amountTtc: 210,
      source: "email",
    },
  ],
  photobooth: [
    {
      id: "pb-1",
      type: "recette",
      status: "pending",
      date: "2026-09-06",
      counterpartyName: "Mariage Le Guennec",
      nature: "Location Kerbooth 360°",
      amountHt: 450,
      amountVat: 0,
      amountTtc: 450,
      source: "email",
    },
    {
      id: "pb-2",
      type: "achat",
      status: "validated",
      date: "2026-09-01",
      counterpartyName: "Photobooth Store",
      nature: "Accessoires photobooth",
      amountHt: 89,
      amountVat: 0,
      amountTtc: 89,
      source: "photo",
    },
  ],
};

export function getEntries(activity: Activity): FakeEntry[] {
  return fixtures[activity];
}
