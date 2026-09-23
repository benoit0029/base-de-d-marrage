export interface SubTab {
  slug: string;
  label: string;
}

export interface ActivityNav {
  slug: "maraichage" | "fruits-legumes" | "photobooth";
  label: string;
  colorClass: string; // classe Tailwind d'accent (bandeau/liseré), jamais en fond plein
  subTabs: SubTab[];
}

export const activities: ActivityNav[] = [
  {
    slug: "maraichage",
    label: "Maraîchage",
    colorClass: "border-maraichage text-maraichage",
    subTabs: [
      { slug: "recettes", label: "Recettes" },
      { slug: "achats", label: "Dépenses" },
      { slug: "releve-bancaire", label: "Relevé bancaire" },
      { slug: "tva", label: "Registre TVA" },
      { slug: "acomptes", label: "Acompte TVA" },
      { slug: "tesa-plus", label: "Tesa+" },
      { slug: "cotisations-non-salarie", label: "Cotisations non salarié" },
      { slug: "declaration-annuelle", label: "Déclaration 2042" },
      { slug: "ca12a", label: "CA12A / 3517-AGR-SD (TVA)" },
      { slug: "facturation", label: "Facturation" },
    ],
  },
  {
    slug: "fruits-legumes",
    label: "Revente Fruits/Légumes",
    colorClass: "border-fruits text-fruits",
    subTabs: [
      { slug: "recettes", label: "Recettes" },
      { slug: "achats", label: "Dépenses" },
      { slug: "releve-bancaire", label: "Relevé bancaire" },
      { slug: "factures", label: "Factures" },
      { slug: "seuils", label: "Suivi des seuils" },
    ],
  },
  {
    slug: "photobooth",
    label: "Kerbooth 360",
    colorClass: "border-photobooth text-photobooth",
    subTabs: [
      { slug: "recettes", label: "Recettes" },
      { slug: "achats", label: "Dépenses" },
      { slug: "releve-bancaire", label: "Relevé bancaire" },
      { slug: "factures", label: "Factures" },
      { slug: "seuils", label: "Suivi des seuils" },
      { slug: "reservations", label: "Réservations" },
    ],
  },
];

export const topLevelNav = [
  ...activities.map((a) => ({ slug: a.slug, label: a.label })),
  { slug: "synthese", label: "Synthèse micro-BIC" },
];
