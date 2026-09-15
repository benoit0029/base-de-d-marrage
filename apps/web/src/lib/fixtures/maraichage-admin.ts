// Données factices — déclarations annuelles (2042/3517-AGR-SD) uniquement :
// le registre TVA et les acomptes sont désormais calculés/enregistrés pour
// de vrai (voir lib/tva et server/services/tvaInstallments).

export const annualDeclarationFixture = {
  annee: 2025,
  statut: "a_preparer" as const,
  recettesTotales: 28400,
  chargesTotales: 9800,
  beneficeForfaitaire: null,
};

// Formulaire officiel de déclaration de TVA du régime simplifié agricole :
// Cerfa n°10968, dit formulaire 3517-AGR-SD ("CA12A" est une appellation
// informelle/obsolète, encore répandue mais à ne plus utiliser dans
// l'interface — voir docs/ARCHITECTURE.md).
export const tvaAnnualDeclarationFixture = {
  exercice: "2025",
  statut: "a_preparer" as const,
  dateLimite: "2026-05-05",
};
