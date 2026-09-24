import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { currentYearRange, sumInvoicedTotal } from "@/lib/thresholds";

export interface TvaRegisterRow {
  period: string; // ex. "2026-T3"
  collected: number; // factures + vente directe
  collectedDirect: number; // dont vente directe (journal de caisse)
  deductible: number;
  net: number;
  // "dispensé" : acomptes trimestriels désactivés dans Réglages (voir
  // ActivitySettings.tvaInstallmentsEnabled) — la TVA nette reste calculée
  // à titre informatif, mais aucun acompte n'est attendu pour ce trimestre.
  status: "réglé" | "à traiter" | "dispensé";
}

function quarterRange(year: number, quarter: 1 | 2 | 3 | 4): { start: Date; end: Date } {
  const startMonth = (quarter - 1) * 3;
  return {
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 3, 0, 23, 59, 59),
  };
}

function quarterLabel(year: number, quarter: number): string {
  return `${year}-T${quarter}`;
}

/** Les N derniers trimestres jusqu'au trimestre courant inclus, calculés dynamiquement — jamais codés en dur. */
function recentQuarters(count: number, referenceDate = new Date()): { year: number; quarter: 1 | 2 | 3 | 4 }[] {
  const currentQuarter = (Math.floor(referenceDate.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  const result: { year: number; quarter: 1 | 2 | 3 | 4 }[] = [];
  let year = referenceDate.getFullYear();
  let quarter = currentQuarter;

  for (let i = 0; i < count; i++) {
    result.unshift({ year, quarter });
    quarter = (quarter - 1) as 1 | 2 | 3 | 4;
    if (quarter < 1) {
      quarter = 4;
      year -= 1;
    }
  }
  return result;
}

const QUARTERS_SHOWN = 6; // 1,5 an de recul — suffisant pour suivre l'historique récent sans remonter indéfiniment

/**
 * Registre TVA (régime simplifié agricole, Maraîchage uniquement) : calculé
 * automatiquement à partir des factures et du journal de caisse (TVA
 * collectée) et des Dépenses validées (TVA déductible) — jamais de saisie manuelle de ces montants.
 * Le statut confronte ce calcul aux acomptes réellement enregistrés
 * (TvaInstallment) pour la même période.
 *
 * Comptabilité de caisse (BOI-BA-BASE-20-10, BOI-TVA-SECT-80-30-30) : le
 * rattachement se fait sur la date d'ENCAISSEMENT/PAIEMENT réel (`paidAt`),
 * jamais sur la date de facture — une facture émise mais non encore
 * encaissée (créance en cours) n'entre dans aucun calcul tant que `paidAt`
 * est vide. ⚠️ Cas particulier non géré ici (à confirmer par Benoît auprès
 * de la MSA/Cerfrance, voir prompt de construction) : si une facture est
 * émise AVANT l'encaissement, la TVA peut devenir exigible dès la
 * facturation plutôt qu'à l'encaissement — cette exception à la règle par
 * défaut n'est pas implémentée.
 */
export async function computeTvaRegister(): Promise<TvaRegisterRow[]> {
  const tenantId = await getDefaultTenantId();
  const quarters = recentQuarters(QUARTERS_SHOWN);

  const activitySettings = await prisma.activitySettings.findUnique({
    where: { tenantId_activity: { tenantId, activity: "BA_MARAICHAGE" } },
    select: { tvaInstallmentsEnabled: true },
  });
  const installmentsEnabled = activitySettings?.tvaInstallmentsEnabled ?? true;

  const rows: TvaRegisterRow[] = [];
  for (const { year, quarter } of quarters) {
    const { start, end } = quarterRange(year, quarter);
    const label = quarterLabel(year, quarter);

    const [collectedAgg, deductibleAgg, settledInstallment, direct] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          tenantId,
          activity: "BA_MARAICHAGE",
          type: { in: ["FACTURE", "AVOIR"] }, // avoir remboursé : montants négatifs, à sa date de remboursement
          status: { in: ["SENT", "PAID"] },
          paidAt: { gte: start, lte: end },
        },
        _sum: { totalVat: true },
      }),
      prisma.entry.aggregate({
        where: {
          tenantId,
          activity: "BA_MARAICHAGE",
          type: { in: ["ACHAT", "IMMOBILISATION"] },
          status: "VALIDATED",
          deletedAt: null,
          paidAt: { gte: start, lte: end },
        },
        _sum: { amountVat: true },
      }),
      prisma.tvaInstallment.findFirst({
        where: { tenantId, dueLabel: label, status: "VALIDATED", deletedAt: null },
        select: { id: true },
      }),
      computeCashJournalVatBetween(start, end),
    ]);

    // TVA des ventes directes (journal de caisse) en plus de celle des
    // factures — même extraction 5,5 % / 10 % plants que la CA12A.
    const collectedDirect = Math.round(direct.collected * 100) / 100;
    const collected = Number(collectedAgg._sum.totalVat ?? 0) + collectedDirect;
    const deductible = Number(deductibleAgg._sum.amountVat ?? 0);

    rows.push({
      period: label,
      collected,
      collectedDirect,
      deductible,
      net: collected - deductible,
      status: !installmentsEnabled ? "dispensé" : settledInstallment ? "réglé" : "à traiter",
    });
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Déclaration annuelle de régularisation (CA12A / Cerfa 3517-AGR-SD) —
// régime simplifié agricole (RSA), Maraîchage uniquement.
// ---------------------------------------------------------------------------

// Seuil de dispense des acomptes trimestriels (art. 1693 bis du CGI) : sous
// ce montant de TVA nette due au titre de l'année, aucun acompte n'est
// obligatoire l'année suivante — un seul geste annuel (le CA12A) suffit.
export const TVA_INSTALLMENT_THRESHOLD = 1000;

// Taux réduit (fruits/légumes) et taux normal agricole (vente de plants) —
// vente directe Maraîchage, voir CashJournalEntry.plantSalesAmount. À
// revérifier si la gamme de produits vendus change (ex. produits transformés
// à un autre taux).
const VAT_RATE_REDUCED = 0.055;
const VAT_RATE_STANDARD = 0.10;

// Extrait la TVA d'un montant TTC à un taux donné : TVA = TTC × taux / (1 + taux).
export function vatFromTtc(ttc: number, rate: number): number {
  return ttc * (rate / (1 + rate));
}

export interface AnnualTvaDeclaration {
  year: number;
  caHtFacture: number; // CA HT facturé de l'année (base TVA collectée sur factures)
  // Base de la taxe ADAR : CA facturé + vente directe (la taxe porte sur le
  // chiffre d'affaires total, pas seulement sur la part facturée).
  caTotalPourAdar: number;
  collectedFactures: number; // TVA collectée sur factures
  collectedVenteDirecte: number; // TVA collectée sur vente directe (5,5% + 10%, voir plantSalesAmount)
  collected: number; // collectedFactures + collectedVenteDirecte
  deductibleAutres: number; // achats/autres biens et services (Entry ACHAT)
  deductibleImmobilisations: number; // Entry IMMOBILISATION
  deductibleTotal: number;
  netVat: number; // collected - deductibleTotal — base du seuil des 1 000 €
  adar: number;
  soldeAvantAcomptes: number; // netVat + adar
  acomptesDejaVerses: number; // TvaInstallment validés de l'année (dueLabel "YYYY-Tn")
  soldeAPayer: number; // soldeAvantAcomptes - acomptesDejaVerses (négatif = crédit remboursable)
  deadline: Date;
  installmentsRequiredNextYear: boolean; // netVat >= TVA_INSTALLMENT_THRESHOLD
}

// Taxe ADAR (développement agricole et rural), formule forfaitaire +
// proportionnelle au CA — à revérifier chaque année sur le formulaire
// officiel avant dépôt, ce module ne la met pas à jour automatiquement.
function computeAdar(caTotal: number): number {
  return 90 + 0.0019 * caTotal;
}

// "2e jour ouvré suivant le 1er mai" — ne tient compte que des week-ends,
// pas des jours fériés (souvent nombreux début mai : 1er mai lui-même, 8
// mai, Ascension certaines années) — à vérifier chaque année sur
// impots.gouv.fr avant de considérer cette date comme définitive.
export function ca12aDeadline(recetteYear: number): Date {
  const d = new Date(recetteYear + 1, 4, 1); // 1er mai de l'année suivante
  let businessDays = 0;
  while (businessDays < 2) {
    d.setDate(d.getDate() + 1);
    const dayOfWeek = d.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) businessDays++;
  }
  return d;
}

/**
 * TVA collectée sur vente directe (Maraîchage), en distinguant les deux taux
 * mélangés dans un même total encaissé : la part "vente de plants"
 * (plantSalesAmount, 10%) et le reste (fruits/légumes, 5,5%). Les ventes
 * exceptionnelles (> 76 €, saisies à part) sont comptées au taux réduit par
 * défaut — simplification à corriger si elles concernent aussi des plants.
 */
export async function computeCashJournalVat(year: number): Promise<{ caTotal: number; collected: number }> {
  const { start, end } = currentYearRange(year);
  return computeCashJournalVatBetween(start, end);
}

// Même calcul sur une période quelconque (trimestre du Registre TVA).
export async function computeCashJournalVatBetween(
  start: Date,
  end: Date
): Promise<{ caTotal: number; collected: number }> {
  const tenantId = await getDefaultTenantId();

  const entries = await prisma.cashJournalEntry.findMany({
    where: {
      tenantId,
      activity: "BA_MARAICHAGE",
      status: "VALIDATED",
      deletedAt: null,
      date: { gte: start, lte: end },
    },
    select: { cashAmount: true, checkAmount: true, cardAmount: true, exceptionalSales: true, plantSalesAmount: true },
  });

  let caTotal = 0;
  let standardRateTtc = 0; // vente de plants, 10%
  let reducedRateTtc = 0; // fruits/légumes (+ ventes exceptionnelles), 5,5%

  for (const e of entries) {
    const exceptional = Array.isArray(e.exceptionalSales)
      ? e.exceptionalSales.reduce((s: number, sale) => {
          const amount =
            sale && typeof sale === "object" && "amountTtc" in sale
              ? Number((sale as { amountTtc: unknown }).amountTtc)
              : 0;
          return s + (Number.isFinite(amount) ? amount : 0);
        }, 0)
      : 0;

    const dayTotal = Number(e.cashAmount) + Number(e.checkAmount) + Number(e.cardAmount) + exceptional;
    const plants = Number(e.plantSalesAmount ?? 0);

    caTotal += dayTotal;
    standardRateTtc += plants;
    reducedRateTtc += dayTotal - plants;
  }

  const collected = vatFromTtc(reducedRateTtc, VAT_RATE_REDUCED) + vatFromTtc(standardRateTtc, VAT_RATE_STANDARD);
  return { caTotal, collected };
}

/**
 * Calcule la déclaration annuelle de régularisation TVA (CA12A) de
 * l'exercice `year`, entièrement à partir des factures/dépenses/ventes
 * directes déjà saisies et validées — jamais de ressaisie manuelle des
 * montants annuels. Les acomptes trimestriels déjà versés dans l'année
 * (onglet Acompte TVA) sont déduits du solde théorique pour donner le
 * montant réellement dû.
 */
export async function computeAnnualTvaDeclaration(year: number): Promise<AnnualTvaDeclaration> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);

  const [caHtFacture, cashJournalVat, collectedAgg, deductibleAutresAgg, deductibleImmoAgg, acomptesAgg] =
    await Promise.all([
      sumInvoicedTotal("BA_MARAICHAGE", start, end),
      computeCashJournalVat(year),
      prisma.invoice.aggregate({
        where: {
          tenantId,
          activity: "BA_MARAICHAGE",
          type: { in: ["FACTURE", "AVOIR"] }, // avoir remboursé : montants négatifs, à sa date de remboursement
          status: { in: ["SENT", "PAID"] },
          paidAt: { gte: start, lte: end },
        },
        _sum: { totalVat: true },
      }),
      prisma.entry.aggregate({
        where: {
          tenantId,
          activity: "BA_MARAICHAGE",
          type: "ACHAT",
          status: "VALIDATED",
          deletedAt: null,
          paidAt: { gte: start, lte: end },
        },
        _sum: { amountVat: true },
      }),
      prisma.entry.aggregate({
        where: {
          tenantId,
          activity: "BA_MARAICHAGE",
          type: "IMMOBILISATION",
          status: "VALIDATED",
          deletedAt: null,
          paidAt: { gte: start, lte: end },
        },
        _sum: { amountVat: true },
      }),
      prisma.tvaInstallment.aggregate({
        where: { tenantId, status: "VALIDATED", deletedAt: null, dueLabel: { startsWith: `${year}-T` } },
        _sum: { amountPaid: true },
      }),
    ]);

  const caTotalPourAdar = caHtFacture + cashJournalVat.caTotal;
  const collectedFactures = Number(collectedAgg._sum.totalVat ?? 0);
  const collectedVenteDirecte = cashJournalVat.collected;
  const collected = collectedFactures + collectedVenteDirecte;
  const deductibleAutres = Number(deductibleAutresAgg._sum.amountVat ?? 0);
  const deductibleImmobilisations = Number(deductibleImmoAgg._sum.amountVat ?? 0);
  const deductibleTotal = deductibleAutres + deductibleImmobilisations;
  const netVat = collected - deductibleTotal;
  const adar = computeAdar(caTotalPourAdar);
  const soldeAvantAcomptes = netVat + adar;
  const acomptesDejaVerses = Number(acomptesAgg._sum.amountPaid ?? 0);

  return {
    year,
    caHtFacture,
    caTotalPourAdar,
    collectedFactures,
    collectedVenteDirecte,
    collected,
    deductibleAutres,
    deductibleImmobilisations,
    deductibleTotal,
    netVat,
    adar,
    soldeAvantAcomptes,
    acomptesDejaVerses,
    soldeAPayer: soldeAvantAcomptes - acomptesDejaVerses,
    deadline: ca12aDeadline(year),
    installmentsRequiredNextYear: netVat >= TVA_INSTALLMENT_THRESHOLD, // dispense seulement sous 1 000 €
  };
}
