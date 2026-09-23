// Intl.NumberFormat("fr-FR") utilise une espace fine insécable (U+202F) comme
// séparateur de milliers, absente de la police Helvetica standard des PDF
// (@react-pdf/renderer) — elle s'affichait comme un "/" au rendu. On formate
// donc les milliers nous-mêmes avec une espace normale (U+0020), sans
// dépendre des caractères choisis par l'ICU de la locale.
export function euro(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  const [intPart, decimalPart] = rounded.toFixed(2).split(".");
  const negative = intPart.startsWith("-");
  const digits = negative ? intPart.slice(1) : intPart;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}${grouped},${decimalPart} €`;
}

// Taux à la française (5,5 %) — même raison que ci-dessus pour l'espace
// normale plutôt qu'insécable.
export function percent(n: number): string {
  return `${String(Math.round(n * 100) / 100).replace(".", ",")} %`;
}
