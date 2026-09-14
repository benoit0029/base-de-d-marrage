import type { SimpleImportCategory } from "@prisma/client";

export const SIMPLE_IMPORT_CATEGORY_LABELS: Record<SimpleImportCategory, string> = {
  TESA_CONTRAT: "Contrat",
  TESA_BULLETIN_PAIE: "Bulletin de paie",
  TESA_COTISATIONS_SALARIALES: "Cotisations salariales",
  TESA_CERTIFICAT_TRAVAIL: "Certificat de travail",
  TESA_ATTESTATION_POLE_EMPLOI: "Attestation Pôle Emploi",
  TESA_SOLDE_TOUT_COMPTE: "Solde de tout compte",
  COTISATION_NON_SALARIE: "Appel de cotisation MSA",
};

export const TESA_CATEGORIES: SimpleImportCategory[] = [
  "TESA_CONTRAT",
  "TESA_BULLETIN_PAIE",
  "TESA_COTISATIONS_SALARIALES",
  "TESA_CERTIFICAT_TRAVAIL",
  "TESA_ATTESTATION_POLE_EMPLOI",
  "TESA_SOLDE_TOUT_COMPTE",
];
