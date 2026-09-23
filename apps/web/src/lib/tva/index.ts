import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { currentYearRange, sumInvoicedTotal, sumCashJournalTotal } from "@/lib/thresholds";

export interface TvaRegisterRow {
  period: string; // ex. "2026-T3"
  collected: number;
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
 * automatiquement à partir des factures (TVA collectée) et des Dépenses
 * validées (TVA déductible) — jamais de saisie manuelle de ces montants.
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

    const [collectedAgg, deductibleAgg, settledInstallment] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          tenantId,
          activity: "BA_MARAICHAGE",
          type: "FACTURE",
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
    ]);

    const collected = Number(collectedAgg._sum.totalVat ?? 0);
    const deductible = Number(deductibleAgg._sum.amountVat ?? 0);

    rows.push({
      period: label,
      collected,
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

export interface AnnualTvaDeclaration {
  year: number;
  // Base de la TVA collectée : factures Maraîchage payées dans l'année
  // uniquement. ⚠️ Limitation connue, à confirmer avec la MSA/Cerfrance :
  // les ventes directes du journal de caisse (CashJournalEntry) ne portent
  // aujourd'hui aucune information de TVA (montants saisis sans distinction
  // HT/TTC, voir sumCashJournalTotal dans lib/thresholds) et ne sont donc
  // PAS incluses ici — si ces ventes directes sont elles aussi soumises à la
  // TVA au même titre que les factures, ce montant sous-estime la TVA
  // réellement due. Confirmer avant de déposer le formulaire réel.
  caHtFacture: number;
  // Base de la taxe ADAR : CA facturé + vente directe (la taxe porte sur le
  // chiffre d'affaires total, pas seulement sur la part facturée).
  caTotalPourAdar: number;
  collected: number;
  deductibleAutres: number; // achats/autres biens et services (Entry ACHAT)
  deductibleImmobilisations: number; // Entry IMMOBILISATION
  deductibleTotal: number;
  netVat: number; // collected - deductibleTotal — base du seuil des 1 000 €
  adar: number;
  soldeAvantAcomptes: number; // netVat + adar
  acomptesDejaVerses: number; // TvaInstallment validés de l'année (dueLabel "YYYY-Tn")
  soldeAPayer: number; // soldeAvantAcomptes - acomptesDejaVerses (négatif = crédit remboursable)
  deadline: Date;
  installmentsRequiredNextYear: boolean; // netVat > TVA_INSTALLMENT_THRESHOLD
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
function ca12aDeadline(recetteYear: number): Date {
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
 * Calcule la déclaration annuelle de régularisation TVA (CA12A) de
 * l'exercice `year`, entièrement à partir des factures/dépenses déjà
 * saisies et validées — jamais de ressaisie manuelle des montants annuels.
 * Les acomptes trimestriels déjà versés dans l'année (onglet Acompte TVA)
 * sont déduits du solde théorique pour donner le montant réellement dû.
 */
export async function computeAnnualTvaDeclaration(year: number): Promise<AnnualTvaDeclaration> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);

  const [caHtFacture, caCashJournal, collectedAgg, deductibleAutresAgg, deductibleImmoAgg, acomptesAgg] =
    await Promise.all([
      sumInvoicedTotal("BA_MARAICHAGE", start, end),
      sumCashJournalTotal("BA_MARAICHAGE", start, end),
      prisma.invoice.aggregate({
        where: {
          tenantId,
          activity: "BA_MARAICHAGE",
          type: "FACTURE",
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

  const caTotalPourAdar = caHtFacture + caCashJournal;
  const collected = Number(collectedAgg._sum.totalVat ?? 0);
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
    installmentsRequiredNextYear: netVat > TVA_INSTALLMENT_THRESHOLD,
  };
}
