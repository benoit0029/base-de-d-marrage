// Parseur CSV volontairement simple pour les relevés bancaires (v1) : gère
// les formats d'export les plus courants des banques françaises (colonnes
// Date/Libellé/Débit/Crédit ou Date/Libellé/Montant, délimiteur ";" ou ",").
// PAS un parseur CSV générique — pas de virgule/point-virgule échappé DANS
// un champ entre guillemets — mais gère bien les guillemets multi-lignes
// (voir splitIntoRows) : le Crédit Agricole, entre autres, étale le libellé
// de chaque opération sur plusieurs lignes physiques à l'intérieur des
// guillemets, ce qui casserait un simple split sur les retours à la ligne.

export interface ParsedBankLine {
  date: Date;
  label: string;
  amount: number; // toujours positif
  direction: "DEBIT" | "CREDIT";
}

const HEADER_ALIASES = {
  date: ["date", "dateoperation", "dateop", "datevaleur"],
  label: ["libelle", "libellé", "description", "operation", "opération", "communication"],
  debit: ["debit", "débit"],
  credit: ["credit", "crédit"],
  montant: ["montant", "amount"],
};

function normalizeHeader(cell: string): string {
  return cell
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z]/g, "");
}

function detectDelimiter(line: string): string {
  const semicolons = (line.match(/;/g) ?? []).length;
  const commas = (line.match(/,/g) ?? []).length;
  return semicolons >= commas ? ";" : ",";
}

function splitLine(line: string, delimiter: string): string[] {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

/**
 * Découpe le fichier en lignes LOGIQUES (une par ligne de tableau), pas en
 * lignes physiques : un retour à la ligne à l'intérieur d'un champ entre
 * guillemets (libellé multi-lignes, format Crédit Agricole notamment) ne
 * termine pas la ligne — il est remplacé par un espace pour garder un
 * libellé lisible sur une seule ligne logique.
 */
function splitIntoRows(content: string): string[] {
  let normalized = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      normalized += char;
      continue;
    }
    if (char === "\r" || char === "\n") {
      if (char === "\r" && content[i + 1] === "\n") i++; // \r\n compte pour un seul saut
      normalized += inQuotes ? " " : "\n";
      continue;
    }
    normalized += char;
  }

  return normalized.split("\n").map((row) => row.replace(/\s+/g, " ").trim());
}

function parseAmount(raw: string): number | null {
  if (!raw || raw.trim() === "") return null;
  // Formats français courants : "1 234,56", "1234,56", "-45.30", "45,30 €"
  const cleaned = raw
    .replace(/[€\s]/g, "")
    .replace(/ /g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function parseDate(raw: string): Date | null {
  const trimmed = raw.trim();
  // JJ/MM/AAAA ou JJ-MM-AAAA
  const frMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (frMatch) {
    const [, d, m, y] = frMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  // AAAA-MM-JJ (ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

export class BankStatementParseError extends Error {}

export function parseBankStatementCsv(content: string): ParsedBankLine[] {
  const lines = splitIntoRows(content).filter((l) => l !== "");
  if (lines.length < 2) {
    throw new BankStatementParseError("Fichier CSV vide ou illisible.");
  }

  const delimiter = detectDelimiter(lines[0]);

  let headerIndex = -1;
  let columns: Record<string, number> = {};
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = splitLine(lines[i], delimiter).map(normalizeHeader);
    const found: Record<string, number> = {};
    for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
      // startsWith, pas une égalité stricte : certaines banques (Crédit
      // Agricole notamment) libellent leurs colonnes "Débit euros"/"Crédit
      // euros" plutôt que juste "Débit"/"Crédit" — le mot-clé reste au
      // début, seul un suffixe est ajouté.
      const idx = cells.findIndex((c) => aliases.some((alias) => c === alias || c.startsWith(alias)));
      if (idx >= 0) found[key] = idx;
    }
    if (found.date !== undefined && found.label !== undefined && (found.montant !== undefined || (found.debit !== undefined && found.credit !== undefined))) {
      headerIndex = i;
      columns = found;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new BankStatementParseError(
      "Colonnes non reconnues (attendu : Date, Libellé, et Débit/Crédit ou Montant)."
    );
  }

  const result: ParsedBankLine[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const cells = splitLine(lines[i], delimiter);
    const date = parseDate(cells[columns.date] ?? "");
    const label = cells[columns.label] ?? "";
    if (!date || !label) continue;

    if (columns.montant !== undefined) {
      const montant = parseAmount(cells[columns.montant] ?? "");
      if (montant === null || montant === 0) continue;
      result.push({
        date,
        label,
        amount: Math.abs(montant),
        direction: montant < 0 ? "DEBIT" : "CREDIT",
      });
    } else {
      const debit = parseAmount(cells[columns.debit] ?? "");
      const credit = parseAmount(cells[columns.credit] ?? "");
      if (debit) {
        result.push({ date, label, amount: Math.abs(debit), direction: "DEBIT" });
      } else if (credit) {
        result.push({ date, label, amount: Math.abs(credit), direction: "CREDIT" });
      }
    }
  }

  if (result.length === 0) {
    throw new BankStatementParseError("Aucune ligne exploitable trouvée dans le fichier.");
  }

  return result;
}
