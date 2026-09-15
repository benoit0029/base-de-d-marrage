// Données factices — déclarations annuelles (2042/CA12A) uniquement : le
// registre TVA et les acomptes sont désormais calculés/enregistrés pour de
// vrai (voir lib/tva et server/services/tvaInstallments).

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
