import { getCompanySettings } from "@/server/services/settings";
import type { BookHeader } from "@/lib/pdf/BooksDocument";

export function parseBookYear(raw: string): number | null {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 2000 && year <= 2100 ? year : null;
}

export async function bookHeader(): Promise<BookHeader> {
  const company = await getCompanySettings();
  return {
    legalName: company?.legalName ?? "(identité non renseignée — voir Réglages)",
    siren: company?.siren ?? "",
  };
}
