// Données factices — déclaration annuelle 2042 uniquement : le registre TVA,
// la déclaration 3517-AGR-SD et les acomptes sont désormais calculés/
// enregistrés pour de vrai (voir lib/tva et server/services/tvaInstallments).

export const annualDeclarationFixture = {
  annee: 2025,
  statut: "a_preparer" as const,
  recettesTotales: 28400,
  chargesTotales: 9800,
  beneficeForfaitaire: null,
};
