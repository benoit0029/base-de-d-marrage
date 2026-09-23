import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";

/**
 * Seuils légaux — barème triennal 2026-2028 (revalorisation confirmée,
 * corrige le barème 2024-2025 précédemment codé ici). À VÉRIFIER de nouveau
 * en 2029 sur impots.gouv.fr/BOI-BAREME-000044 avant toute décision : ces
 * montants sont revalorisés tous les 3 ans et ce module ne les met pas à
 * jour automatiquement.
 *
 * - Vente de marchandises (Revente Fruits/Légumes) : franchise TVA 85 000 €
 *   (tolérance jusqu'à 93 500 € l'année du dépassement, inchangée en 2026),
 *   plafond micro-BIC **203 100 €** (relevé de 188 700 €).
 * - Prestations de services BIC (Kerbooth 360°) : franchise TVA 37 500 €
 *   (tolérance jusqu'à 41 250 €, inchangée), plafond micro-BIC **83 600 €**
 *   (relevé de 77 700 €).
 * - Activité mixte dans une même micro-entreprise (les deux ci-dessus) :
 *   plafond global **203 100 €** (les seuils ne s'additionnent jamais), à
 *   condition que la part "services" ne dépasse pas 83 600 € à l'intérieur
 *   de ce total — deux conditions simultanées, pas une somme.
 * - Micro-BA (Maraîchage) : régime distinct, bascule vers le régime réel si
 *   la moyenne des recettes HT sur les 3 dernières années dépasse le seuil,
 *   désormais **129 200 €** (relevé de 120 000 €, l'ancienne valeur codée
 *   ici de 91 900 € était déjà erronée avant même la revalorisation 2026).
 */
export const LEGAL_THRESHOLDS = {
  VENTE: { franchiseTva: 85_000, franchiseTvaTolerance: 93_500, plafond: 203_100 },
  SERVICE: { franchiseTva: 37_500, franchiseTvaTolerance: 41_250, plafond: 83_600 },
  MIXTE_PLAFOND_GLOBAL: 203_100,
  BA_MOYENNE_TRIENNALE: 129_200,
};

/**
 * Seuil légal de la saisie globale journalière au livre des recettes
 * (BOI-BIC-DECLA-30-30) : autorisée uniquement pour des ventes unitaires
 * inférieures ou égales à ce montant. Au-delà, la vente doit être saisie à
 * part (voir CashJournalEntry.exceptionalSales), jamais agrégée dans le
 * total du jour.
 */
export const CASH_JOURNAL_DAILY_THRESHOLD = 76;

export type AlertLevel = "ok" | "vigilance" | "depassement";

export interface ThresholdCheck {
  label: string;
  caCumule: number;
  seuil: number;
  seuilTolerance?: number;
  level: AlertLevel;
}

export function levelFor(ca: number, seuil: number, tolerance?: number): AlertLevel {
  if (ca > (tolerance ?? seuil)) return "depassement";
  if (ca >= seuil * 0.8) return "vigilance";
  return "ok";
}

/**
 * CA encaissé (validé ET payé) d'une activité sur une période — source
 * Invoice, jamais Entry : le moteur de facturation ne crée aucune écriture
 * Entry, donc pour une activité 100% facturée (Kerbooth 360), c'est la
 * SEULE source de CA. Les devis (DEVIS) et factures annulées (CANCELLED) ne
 * comptent pas.
 *
 * Comptabilité de caisse (BOI-BA-BASE-20-10) : rattachement sur la date
 * d'ENCAISSEMENT (`paidAt`), pas la date de facture — une facture émise
 * mais non encore payée est une créance en cours, hors seuil tant qu'elle
 * n'est pas encaissée (elle rejoindra alors automatiquement l'année de son
 * encaissement réel, pas celle de sa facturation).
 *
 * Exportée pour être réutilisée telle quelle par le rapport de clôture
 * d'exercice (voir server/services/reports) : même calcul, pas de logique
 * dupliquée.
 */
export async function sumInvoicedTotal(
  activity: "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH",
  yearStart: Date,
  yearEnd: Date
): Promise<number> {
  const tenantId = await getDefaultTenantId();
  const result = await prisma.invoice.aggregate({
    where: {
      tenantId,
      activity,
      type: "FACTURE",
      status: { in: ["SENT", "PAID"] },
      paidAt: { gte: yearStart, lte: yearEnd },
    },
    _sum: { totalHt: true },
  });
  return Number(result._sum.totalHt ?? 0);
}

/**
 * CA de vente directe (validé) d'une activité sur une période — source
 * CashJournalEntry (journal de caisse), jamais Entry : pour Fruits/Légumes
 * (100% vente directe), c'est la SEULE source de CA. Les ventes
 * exceptionnelles (> seuil légal, voir CASH_JOURNAL_DAILY_THRESHOLD),
 * saisies à part dans exceptionalSales, sont réintégrées ici au CA — seule
 * leur saisie doit rester distincte de l'agrégat journalier, pas leur
 * comptage dans le chiffre d'affaires.
 *
 * Pas de distinction HT/TTC ici (à confirmer avec l'expert-comptable) : les
 * montants du journal de caisse sont utilisés tels quels, comme le sont déjà
 * les montants TTC de facture pour les deux activités micro-BIC sous
 * franchise en base (HT = TTC en l'absence de TVA).
 *
 * Exportée pour réutilisation par le rapport de clôture (voir
 * server/services/reports).
 */
export async function sumCashJournalTotal(
  activity: "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES",
  yearStart: Date,
  yearEnd: Date
): Promise<number> {
  const tenantId = await getDefaultTenantId();
  const entries = await prisma.cashJournalEntry.findMany({
    where: {
      tenantId,
      activity,
      status: "VALIDATED",
      deletedAt: null,
      date: { gte: yearStart, lte: yearEnd },
    },
    select: { cashAmount: true, checkAmount: true, cardAmount: true, exceptionalSales: true },
  });

  return entries.reduce((sum, e) => {
    const aggregated = Number(e.cashAmount) + Number(e.checkAmount) + Number(e.cardAmount);
    const exceptional = Array.isArray(e.exceptionalSales)
      ? e.exceptionalSales.reduce((s: number, sale) => {
          const amount =
            sale && typeof sale === "object" && "amountTtc" in sale
              ? Number((sale as { amountTtc: unknown }).amountTtc)
              : 0;
          return s + (Number.isFinite(amount) ? amount : 0);
        }, 0)
      : 0;
    return sum + aggregated + exceptional;
  }, 0);
}

/**
 * Dépenses payées (validées ET réglées) d'une activité sur une période —
 * Entry ACHAT/IMMOBILISATION, comptabilité de caisse sur `paidAt` (voir
 * sumInvoicedTotal ci-dessus, même principe). Utilisée par le rapport de
 * clôture ; n'entre dans aucun calcul de seuil (les seuils de franchise/
 * plafond ne portent que sur les recettes).
 */
export async function sumDepensesTotal(
  activity: "BA_MARAICHAGE" | "BIC_FRUITS_LEGUMES" | "BIC_PHOTOBOOTH",
  yearStart: Date,
  yearEnd: Date
): Promise<number> {
  const tenantId = await getDefaultTenantId();
  const result = await prisma.entry.aggregate({
    where: {
      tenantId,
      activity,
      type: { in: ["ACHAT", "IMMOBILISATION"] },
      status: "VALIDATED",
      deletedAt: null,
      paidAt: { gte: yearStart, lte: yearEnd },
    },
    _sum: { amountHt: true },
  });
  return Number(result._sum.amountHt ?? 0);
}

export function currentYearRange(year: number): { start: Date; end: Date } {
  return { start: new Date(year, 0, 1), end: new Date(year, 11, 31, 23, 59, 59) };
}

export interface BicThresholdsResult {
  year: number;
  caFruitsLegumes: number;
  caPhotobooth: number;
  caTotal: number;
  franchiseVente: ThresholdCheck;
  franchiseService: ThresholdCheck;
  plafondGlobalMixte: ThresholdCheck;
}

export async function computeBicThresholds(year = new Date().getFullYear()): Promise<BicThresholdsResult> {
  const { start, end } = currentYearRange(year);
  const [caFruitsLegumes, caPhotobooth] = await Promise.all([
    // Fruits/Légumes est confirmé 100% vente directe : le journal de caisse
    // est la seule source de CA (facturation désactivée pour cette activité).
    sumCashJournalTotal("BIC_FRUITS_LEGUMES", start, end),
    // Kerbooth 360 est 100% facturé : la facturation est la seule source de CA.
    sumInvoicedTotal("BIC_PHOTOBOOTH", start, end),
  ]);
  const caTotal = caFruitsLegumes + caPhotobooth;

  return {
    year,
    caFruitsLegumes,
    caPhotobooth,
    caTotal,
    franchiseVente: {
      label: "Franchise TVA — vente de marchandises (Fruits/Légumes)",
      caCumule: caFruitsLegumes,
      seuil: LEGAL_THRESHOLDS.VENTE.franchiseTva,
      seuilTolerance: LEGAL_THRESHOLDS.VENTE.franchiseTvaTolerance,
      level: levelFor(
        caFruitsLegumes,
        LEGAL_THRESHOLDS.VENTE.franchiseTva,
        LEGAL_THRESHOLDS.VENTE.franchiseTvaTolerance
      ),
    },
    franchiseService: {
      label: "Franchise TVA — prestations de services (Kerbooth 360°)",
      caCumule: caPhotobooth,
      seuil: LEGAL_THRESHOLDS.SERVICE.franchiseTva,
      seuilTolerance: LEGAL_THRESHOLDS.SERVICE.franchiseTvaTolerance,
      level: levelFor(
        caPhotobooth,
        LEGAL_THRESHOLDS.SERVICE.franchiseTva,
        LEGAL_THRESHOLDS.SERVICE.franchiseTvaTolerance
      ),
    },
    plafondGlobalMixte: {
      label: "Plafond micro-BIC cumulé (activité mixte)",
      caCumule: caTotal,
      seuil: LEGAL_THRESHOLDS.MIXTE_PLAFOND_GLOBAL,
      level: levelFor(caTotal, LEGAL_THRESHOLDS.MIXTE_PLAFOND_GLOBAL),
    },
  };
}

export interface BaThresholdResult {
  yearsConsidered: number[];
  recettesParAnnee: Record<number, number>;
  moyenneTriennale: number;
  check: ThresholdCheck;
}

export async function computeBaThreshold(referenceYear = new Date().getFullYear()): Promise<BaThresholdResult> {
  // Fenêtre dynamique (année en cours + 2 précédentes) : jamais codée en dur,
  // recalculée à chaque appel à partir de `referenceYear`.
  const years = [referenceYear - 2, referenceYear - 1, referenceYear];
  const recettesParAnnee: Record<number, number> = {};

  for (const year of years) {
    const { start, end } = currentYearRange(year);
    // Maraîchage combine facturation ET vente directe : les deux comptent
    // dans le CA du seuil, même si elles restent deux lignes distinctes dans
    // le livre des recettes affiché (jamais fusionnées à l'affichage).
    const [invoiced, cashJournal] = await Promise.all([
      sumInvoicedTotal("BA_MARAICHAGE", start, end),
      sumCashJournalTotal("BA_MARAICHAGE", start, end),
    ]);
    recettesParAnnee[year] = invoiced + cashJournal;
  }

  // Moyenne sur les seules années où l'activité a généré des recettes
  // (approximation raisonnable en l'absence de date de création connue) —
  // à affiner une fois l'historique complet disponible.
  const activeYears = years.filter((y) => recettesParAnnee[y] > 0);
  const consideredYears = activeYears.length > 0 ? activeYears : years;
  const moyenneTriennale =
    consideredYears.reduce((sum, y) => sum + recettesParAnnee[y], 0) / consideredYears.length;

  return {
    yearsConsidered: consideredYears,
    recettesParAnnee,
    moyenneTriennale,
    check: {
      label: "Micro-BA — moyenne triennale des recettes (maraîchage)",
      caCumule: moyenneTriennale,
      seuil: LEGAL_THRESHOLDS.BA_MOYENNE_TRIENNALE,
      level: levelFor(moyenneTriennale, LEGAL_THRESHOLDS.BA_MOYENNE_TRIENNALE),
    },
  };
}
