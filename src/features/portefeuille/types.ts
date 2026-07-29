export type OffreType = 'agent_vocal' | 'gestion_globale'

export interface ClientPortefeuille {
  id: string
  nom: string
  secteur: string
  actif: boolean
  offres: OffreType[]
  nb_appels: number
  nb_appels_decroches: number
  nb_rdv_pris: number
  nb_spams: number
  nb_urgences: number
  nb_devis_en_attente: number
  nb_factures_impayees: number
  montant_impaye: number
  ca_pilote: number
}

export const OFFRE_LABELS: Record<OffreType, string> = {
  agent_vocal: 'Agent vocal',
  gestion_globale: 'Gestion globale',
}
