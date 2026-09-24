import { getCompanySettings } from "@/server/services/settings";
import type { BookHeader } from "@/lib/pdf/BooksDocument";
import type { Activity } from "@prisma/client";

const ACTIVITIES: Activity[] = ["BA_MARAICHAGE", "BIC_FRUITS_LEGUMES", "BIC_PHOTOBOOTH"];

// Activité du livre demandé (?activity=…), Maraîchage par défaut.
export function parseBookActivity(raw: string | null): Activity {
  return ACTIVITIES.find((a) => a === raw) ?? "BA_MARAICHAGE";
}

const SUBTITLE: Record<"recettes" | "achats", Record<Activity, string>> = {
  recettes: {
    BA_MARAICHAGE: "Maraîchage (micro-BA) — tient lieu de livre des ventes (TVA par taux)",
    BIC_FRUITS_LEGUMES: "Revente fruits et légumes (micro-BIC)",
    BIC_PHOTOBOOTH: "Kerbooth 360 (micro-BIC)",
  },
  achats: {
    BA_MARAICHAGE: "Maraîchage (micro-BA) — immobilisations et autres achats, avec TVA",
    BIC_FRUITS_LEGUMES: "Revente fruits et légumes (micro-BIC) — vente de marchandises",
    BIC_PHOTOBOOTH: "Kerbooth 360 (micro-BIC)",
  },
};

export function parseBookYear(raw: string): number | null {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

export async function bookHeader(kind: "recettes" | "achats", activity: Activity): Promise<BookHeader> {
  const company = await getCompanySettings();
  return {
    legalName: company?.legalName ?? "(identité non renseignée — voir Réglages)",
    siren: company?.siren ?? "",
    title:
      kind === "recettes"
        ? activity === "BA_MARAICHAGE"
          ? "Livre des recettes"
          : "Livre-journal des recettes"
        : activity === "BA_MARAICHAGE"
          ? "Livre des achats"
          : "Registre des achats",
    subtitle: SUBTITLE[kind][activity],
  };
}
