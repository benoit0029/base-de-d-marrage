import { createHash } from "node:crypto";

/**
 * Empreinte d'un fichier, utilisée partout où un même document peut arriver
 * par deux canaux différents (import manuel vs agent de veille email) : deux
 * fichiers strictement identiques ont le même hash, quel que soit le nom ou
 * la date d'envoi.
 */
export function hashFileBuffer(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export interface DuplicateWarning {
  matchedId: string;
  reason: "same_file" | "same_date_amount";
}

interface DuplicateCandidate {
  id: string;
  fileHash: string;
  date: Date;
  amountTtc: number | null;
}

/**
 * Doublon probable : soit le fichier est strictement identique (hash), soit
 * la date et le montant coïncident exactement (même pièce reçue par deux
 * canaux, scannée différemment). Le premier candidat trouvé suffit — c'est à
 * l'utilisateur de confirmer ou d'écarter, pas à l'algorithme de trancher.
 */
export function findProbableDuplicate(
  fileHash: string,
  date: Date,
  amountTtc: number | null,
  candidates: DuplicateCandidate[]
): DuplicateWarning | null {
  const sameFile = candidates.find((c) => c.fileHash === fileHash);
  if (sameFile) return { matchedId: sameFile.id, reason: "same_file" };

  if (amountTtc !== null) {
    const sameDayAmount = candidates.find(
      (c) =>
        c.amountTtc !== null &&
        Math.abs(c.amountTtc - amountTtc) < 0.01 &&
        isSameDay(c.date, date)
    );
    if (sameDayAmount) return { matchedId: sameDayAmount.id, reason: "same_date_amount" };
  }

  return null;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
