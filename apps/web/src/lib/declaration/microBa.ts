import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { currentYearRange, sumInvoicedTotal } from "@/lib/thresholds";
import { computeCashJournalVat } from "@/lib/tva";

// Micro-BA (Maraîchage) : abattement forfaitaire de 87 % sur la moyenne
// triennale des recettes HT, avec un minimum de 305 € — sources citées par
// le document « Obligations micro-BA » de Benoît (livret fiscal BA
// impots.gouv, BOFiP BOI-BA-DECLA-15), non relues directement depuis
// l'outil (sites officiels inaccessibles).
export const MICRO_BA_ABATTEMENT_RATE = 0.87;
export const MICRO_BA_ABATTEMENT_MIN = 305;

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface MicroBaRecettes {
  year: number;
  factures: number; // factures encaissées, HT
  venteDirecteTtc: number; // journal de caisse, TTC tel qu'encaissé
  venteDirecteTva: number; // TVA extraite (5,5 % et 10 % plants)
  venteDirecteHt: number;
  autres: number; // autres recettes validées (documents classés "recette"), HT
  total: number; // recettes HT de l'année
}

/**
 * Recettes HT encaissées d'une année (comptabilité de caisse) : factures
 * payées (HT), ventes directes du journal de caisse (TTC ramené au HT avec la
 * même extraction de TVA que la CA12A, voir computeCashJournalVat) et autres
 * recettes validées (Entry RECETTE, ex. aide ou remboursement capté par mail).
 */
export async function computeMicroBaRecettes(year: number): Promise<MicroBaRecettes> {
  const tenantId = await getDefaultTenantId();
  const { start, end } = currentYearRange(year);

  const [factures, cashJournal, autresAgg] = await Promise.all([
    sumInvoicedTotal("BA_MARAICHAGE", start, end),
    computeCashJournalVat(year),
    prisma.entry.aggregate({
      where: {
        tenantId,
        activity: "BA_MARAICHAGE",
        type: "RECETTE",
        status: "VALIDATED",
        deletedAt: null,
        paidAt: { gte: start, lte: end },
      },
      _sum: { amountHt: true },
    }),
  ]);

  const venteDirecteTtc = round2(cashJournal.caTotal);
  const venteDirecteTva = round2(cashJournal.collected);
  const venteDirecteHt = round2(venteDirecteTtc - venteDirecteTva);
  const autres = round2(Number(autresAgg._sum.amountHt ?? 0));

  return {
    year,
    factures: round2(factures),
    venteDirecteTtc,
    venteDirecteTva,
    venteDirecteHt,
    autres,
    total: round2(factures + venteDirecteHt + autres),
  };
}

export interface MicroBaDeclaration {
  year: number;
  recettes: MicroBaRecettes; // année déclarée : case 5XB
  history: MicroBaRecettes[]; // année - 2, année - 1, année
  yearsAveraged: number[]; // années retenues pour la moyenne
  moyenne: number;
  abattement: number;
  benefice: number; // revenu imposable estimé = assiette des cotisations MSA
}

/**
 * Déclaration 2042-C-PRO du micro-BA pour l'exercice `year` : on y reporte
 * les recettes HT de l'année (case 5XB) ; l'administration calcule elle-même
 * la moyenne triennale et l'abattement. La moyenne et le bénéfice affichés
 * ici ne sont qu'une estimation, pour anticiper l'impôt et les cotisations
 * MSA (même assiette). Moyenne sur les seules années où l'activité a eu des
 * recettes, comme le seuil du micro-BA (computeBaThreshold) — la règle
 * exacte des premières années d'activité reste à confirmer.
 */
export async function computeMicroBaDeclaration(year: number): Promise<MicroBaDeclaration> {
  const history = await Promise.all([year - 2, year - 1, year].map((y) => computeMicroBaRecettes(y)));
  const recettes = history[2];

  const active = history.filter((r) => r.total > 0);
  const averaged = active.length > 0 ? active : [recettes];
  const moyenne = round2(averaged.reduce((sum, r) => sum + r.total, 0) / averaged.length);
  const abattement = round2(Math.min(moyenne, Math.max(moyenne * MICRO_BA_ABATTEMENT_RATE, MICRO_BA_ABATTEMENT_MIN)));

  return {
    year,
    recettes,
    history,
    yearsAveraged: averaged.map((r) => r.year),
    moyenne,
    abattement,
    benefice: round2(moyenne - abattement),
  };
}
