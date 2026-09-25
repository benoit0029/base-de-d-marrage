// Règles du parcours « devis entreprise » Kerbooth (D-160, validées par
// Benoît le 25/09/2026).

/** Chèque de caution demandé pour CHAQUE photobooth loué. */
export const KERBOOTH_DEPOSIT_PER_UNIT = 1500;

/** Le devis expire s'il n'est pas signé dans ce délai (unités libérées). */
export const QUOTE_VALIDITY_DAYS = 15;

/** Relances automatiques du client, en jours après l'envoi. */
export const QUOTE_REMINDER_DAYS = [3, 10] as const;

/** Délai de paiement par défaut de la facture émise à la signature. */
export const DEFAULT_PAYMENT_TERM_DAYS = 30;

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatPeriod(start: Date, end: Date): string {
  const s = start.toLocaleDateString("fr-FR");
  const e = end.toLocaleDateString("fr-FR");
  return s === e ? `le ${s}` : `du ${s} au ${e}`;
}

/** Nombre de jours de la période, bornes comprises (usure des unités). */
export function periodDays(start: Date, end: Date): number {
  const day = 24 * 3600 * 1000;
  const a = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const b = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(1, Math.round((b - a) / day) + 1);
}
