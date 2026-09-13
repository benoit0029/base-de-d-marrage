// Données factices — phase 2 uniquement (registre TVA, acomptes, paie, déclarations).

export const tvaRegisterFixture = [
  { id: "tva-1", periode: "2026-T2", baseHt: 4200, tvaCollectee: 0, tvaDeductible: 180, solde: -180 },
  { id: "tva-2", periode: "2026-T3", baseHt: 5100, tvaCollectee: 0, tvaDeductible: 210, solde: -210 },
];

export const tvaInstallmentsFixture = [
  { id: "acompte-1", periode: "2026-T3", echeance: "2026-09-15", montant: 320, statut: "a_payer" as const },
  { id: "acompte-2", periode: "2026-T4", echeance: "2026-12-15", montant: 340, statut: "a_venir" as const },
];

export const payslipsFixture = [
  { id: "bulletin-1", periode: "2026-08", salarie: "L. Morvan", brut: 1850, net: 1440, dsnStatut: "transmise" as const },
  { id: "bulletin-2", periode: "2026-09", salarie: "L. Morvan", brut: 1850, net: 1440, dsnStatut: "a_transmettre" as const },
];

export const annualDeclarationFixture = {
  annee: 2025,
  statut: "a_preparer" as const,
  recettesTotales: 28400,
  chargesTotales: 9800,
  beneficeForfaitaire: null,
};

export const ca12aFixture = {
  exercice: "2025",
  statut: "a_preparer" as const,
  dateLimite: "2026-05-05",
};
