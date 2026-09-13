import type { ThresholdInfo } from "@/lib/types";

// Données factices — phase 2 uniquement. Le calcul réel arrive en phase 4.
export const bicCombinedThreshold: ThresholdInfo = {
  label: "Franchise en base de TVA (micro-BIC cumulé)",
  caCumule: 21400,
  seuil: 37500,
};

export const bicPlafondThreshold: ThresholdInfo = {
  label: "Plafond micro-BIC (micro-entreprise)",
  caCumule: 21400,
  seuil: 188700,
};

export const baThreshold: ThresholdInfo = {
  label: "Franchise en base de TVA (micro-BA)",
  caCumule: 9800,
  seuil: 55000,
};
