// Année d'exercice d'une ligne de registre, pour le filtre "vue par
// exercice" (voir components/YearFilter.tsx). Une ligne sans date de
// règlement (créance/dette en cours, ou saisie encore en attente) n'est
// rattachée à aucun exercice : `null` signale qu'elle doit rester visible
// quel que soit le filtre sélectionné (voir docs/ARCHITECTURE.md, Module
// Clôture d'exercice).
export function yearOfIsoDate(date: string | null | undefined): number | null {
  if (!date) return null;
  const year = new Date(date).getFullYear();
  return Number.isFinite(year) ? year : null;
}

/** Filtre un tableau de lignes par année d'exercice, en gardant toujours celles sans exercice connu. */
export function filterByYear<T>(rows: T[], yearOf: (row: T) => number | null, year: number | null): T[] {
  if (year === null) return rows;
  return rows.filter((row) => {
    const y = yearOf(row);
    return y === null || y === year;
  });
}
