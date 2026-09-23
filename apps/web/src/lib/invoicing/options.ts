import type { Activity } from "@prisma/client";

// Taux de TVA proposés dans les listes déroulantes de facturation (un taux
// déjà enregistré hors de cette liste reste affiché en plus, jamais perdu) :
// 5,5 % fruits/légumes, 10 % plants potagers, 20 % prestations (Kerbooth).
export const VAT_RATE_OPTIONS = [5.5, 10, 20];

// Taux proposé par défaut sur une nouvelle ligne, selon l'activité.
export function defaultVatRate(activity: Activity): number {
  return activity === "BIC_PHOTOBOOTH" ? 20 : 5.5;
}

// Unités suggérées (saisie libre possible) pour la colonne unité.
export const UNIT_SUGGESTIONS = ["kg", "pièce", "botte", "barquette", "caisse", "godet", "plant", "jour", "forfait"];

export function formatRate(rate: number): string {
  return `${String(rate).replace(".", ",")} %`;
}
