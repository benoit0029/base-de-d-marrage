import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";

export interface TvaRegisterRow {
  period: string; // ex. "2026-T3"
  collected: number;
  deductible: number;
  net: number;
  status: "réglé" | "à traiter";
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
 */
export async function computeTvaRegister(): Promise<TvaRegisterRow[]> {
  const tenantId = await getDefaultTenantId();
  const quarters = recentQuarters(QUARTERS_SHOWN);

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
          issueDate: { gte: start, lte: end },
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
          date: { gte: start, lte: end },
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
      status: settledInstallment ? "réglé" : "à traiter",
    });
  }

  return rows;
}
