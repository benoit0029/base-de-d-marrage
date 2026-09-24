export interface SubTab {
  slug: string;
  label: string;
  // Section d'obligations (Maraîchage) : les onglets sont regroupés par
  // section dans la sous-navigation (voir SubNav). Sans section, simple liste.
  section?: string;
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
      { slug: "obligations", label: "Obligations", section: "Vue d'ensemble" },
      { slug: "recettes", label: "Recettes", section: "Comptable" },
      { slug: "achats", label: "Dépenses", section: "Comptable" },
      { slug: "releve-bancaire", label: "Relevé bancaire", section: "Comptable" },
      { slug: "facturation", label: "Facturation", section: "Comptable" },
      { slug: "livre-recettes", label: "Livre des recettes", section: "Comptable" },
      { slug: "livre-achats", label: "Livre des achats", section: "Comptable" },
      { slug: "tva", label: "Registre TVA", section: "Fiscal" },
      { slug: "acomptes", label: "Acompte TVA", section: "Fiscal" },
      { slug: "ca12a", label: "CA12A / 3517-AGR-SD (TVA)", section: "Fiscal" },
      { slug: "declaration-annuelle", label: "Déclaration 2042", section: "Fiscal" },
      { slug: "cotisations-non-salarie", label: "Cotisations non salarié", section: "Social" },
      { slug: "tesa-plus", label: "Tesa+", section: "Social" },
      { slug: "employeur", label: "Employeur", section: "Social" },
      { slug: "e-reporting", label: "Abby / E-reporting", section: "Abby" },
    ],
  },
  {
    slug: "fruits-legumes",
    label: "Revente Fruits/Légumes",
    colorClass: "border-fruits text-fruits",
    subTabs: [
      { slug: "recettes", label: "Recettes", section: "Comptable" },
      { slug: "achats", label: "Dépenses", section: "Comptable" },
      { slug: "releve-bancaire", label: "Relevé bancaire", section: "Comptable" },
      { slug: "factures", label: "Factures", section: "Comptable" },
      { slug: "livre-recettes", label: "Livre des recettes", section: "Comptable" },
      { slug: "registre-achats", label: "Registre des achats", section: "Comptable" },
      { slug: "seuils", label: "Suivi des seuils", section: "Fiscal" },
    ],
  },
  {
    slug: "photobooth",
    label: "Kerbooth 360",
    colorClass: "border-photobooth text-photobooth",
    subTabs: [
      { slug: "reservations", label: "Réservations", section: "Activité" },
      { slug: "recettes", label: "Recettes", section: "Comptable" },
      { slug: "achats", label: "Dépenses", section: "Comptable" },
      { slug: "releve-bancaire", label: "Relevé bancaire", section: "Comptable" },
      { slug: "factures", label: "Factures", section: "Comptable" },
      { slug: "livre-recettes", label: "Livre des recettes", section: "Comptable" },
      { slug: "seuils", label: "Suivi des seuils", section: "Fiscal" },
    ],
  },
];

// Synthèse micro-BIC : ce qui est COMMUN à Revente et Kerbooth (une seule
// micro-entreprise) — mêmes sections que le Maraîchage.
export const syntheseTabs: SubTab[] = [
  { slug: "obligations", label: "Obligations", section: "Vue d'ensemble" },
  { slug: "seuils", label: "Suivi des seuils", section: "Fiscal" },
  { slug: "tva", label: "TVA micro-BIC (CA12)", section: "Fiscal" },
  { slug: "declaration", label: "Déclaration 2042", section: "Fiscal" },
  { slug: "social", label: "Cotisations sociales", section: "Social" },
  { slug: "e-reporting", label: "Abby / E-reporting", section: "Abby" },
];

export const topLevelNav = [
  ...activities.map((a) => ({ slug: a.slug, label: a.label })),
  { slug: "synthese", label: "Synthèse micro-BIC" },
];
