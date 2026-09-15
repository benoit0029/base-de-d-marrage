"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Sélecteur d'exercice réutilisé sur chaque sous-onglet registre : filtre
// via le paramètre d'URL `?year=`, sans jamais masquer les lignes sans
// exercice connu (créances/dettes en cours, voir lib/fiscalYear/rowYear) —
// c'est le rôle de filterByYear côté page, pas de ce composant.
export default function YearFilter({ closedYears }: { closedYears: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selected = searchParams.get("year") ?? "all";

  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set([currentYear, currentYear - 1, currentYear - 2, ...closedYears])).sort(
    (a, b) => b - a
  );

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("year");
    } else {
      params.set("year", value);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <span>Exercice</span>
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      >
        <option value="all">Toutes les années</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
            {closedYears.includes(y) ? " — clôturé" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
