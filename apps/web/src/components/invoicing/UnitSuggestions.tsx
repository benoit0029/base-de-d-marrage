import { UNIT_SUGGESTIONS } from "@/lib/invoicing/options";

// Suggestions pour les champs "unité" (list="unit-suggestions") : saisie
// libre toujours possible.
export default function UnitSuggestions() {
  return (
    <datalist id="unit-suggestions">
      {UNIT_SUGGESTIONS.map((u) => (
        <option key={u} value={u} />
      ))}
    </datalist>
  );
}
