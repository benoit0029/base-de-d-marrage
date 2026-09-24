import { prisma } from "@/server/db/client";
import { getDefaultTenantId } from "@/server/db/tenant";
import { computeAnnualTvaDeclaration, TVA_INSTALLMENT_THRESHOLD } from "@/lib/tva";

// Acomptes de TVA du régime simplifié agricole (RSA), règle reprise du
// document « Obligations micro-BA » de Benoît (BOI-TVA-SECT-80-30-60-20,
// art. 1693 bis du CGI, non relus directement depuis l'outil) : si la TVA
// due au titre de l'année précédente atteint 1 000 €, 4 acomptes d'au moins
// 1/5 de cette TVA, au plus tard les 5 mai, 5 août, 5 novembre (année N) et
// 5 février (N+1), puis régularisation sur la CA12A. Chaque acompte n de
// l'année N correspond au libellé "N-Tn" déjà utilisé par l'onglet Acompte
// TVA et déduit par la CA12A de l'année N.

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface ExpectedInstallment {
  year: number; // année de TVA couverte
  number: 1 | 2 | 3 | 4;
  label: string; // "N-Tn"
  dueDate: Date;
  amount: number; // 1/5 de la TVA nette de N-1
  paid: number; // acomptes validés enregistrés sous ce libellé
}

export interface InstallmentSchedule {
  year: number;
  baseYear: number; // N-1
  baseVat: number; // TVA nette due en N-1
  required: boolean;
  installments: ExpectedInstallment[];
}

export function installmentsRequired(netVatPreviousYear: number): boolean {
  return netVatPreviousYear >= TVA_INSTALLMENT_THRESHOLD;
}

export async function computeInstallmentSchedule(year: number): Promise<InstallmentSchedule> {
  const tenantId = await getDefaultTenantId();
  const previous = await computeAnnualTvaDeclaration(year - 1);
  const baseVat = round2(Math.max(previous.netVat, 0));
  const required = installmentsRequired(baseVat);
  const amount = round2(baseVat / 5);

  const dueDates: Date[] = [
    new Date(year, 4, 5),
    new Date(year, 7, 5),
    new Date(year, 10, 5),
    new Date(year + 1, 1, 5),
  ];
  const labels = dueDates.map((_, i) => `${year}-T${i + 1}`);

  const paidRows = await prisma.tvaInstallment.groupBy({
    by: ["dueLabel"],
    where: { tenantId, status: "VALIDATED", deletedAt: null, dueLabel: { in: labels } },
    _sum: { amountPaid: true },
  });

  return {
    year,
    baseYear: year - 1,
    baseVat,
    required,
    installments: dueDates.map((dueDate, i) => ({
      year,
      number: (i + 1) as 1 | 2 | 3 | 4,
      label: labels[i],
      dueDate,
      amount: required ? amount : 0,
      paid: round2(Number(paidRows.find((r) => r.dueLabel === labels[i])?._sum.amountPaid ?? 0)),
    })),
  };
}
