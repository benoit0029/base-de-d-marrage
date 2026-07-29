export type TypeAction = 'devis' | 'relance_impaye' | 'commande_fournisseur' | 'email'
export type StatutValidation = 'en_attente' | 'valide' | 'modifie' | 'rejete'

export interface ValidationItem {
  id: string
  client_id: string
  client_nom: string
  type_action: TypeAction
  reference_id: string
  contenu_propose: Record<string, unknown>
  statut: StatutValidation
  created_at: string
  resolved_at: string | null
}

export const TYPE_ACTION_LABELS: Record<TypeAction, string> = {
  devis: 'Devis',
  relance_impaye: 'Relance impayé',
  commande_fournisseur: 'Commande fournisseur',
  email: 'Email',
}
