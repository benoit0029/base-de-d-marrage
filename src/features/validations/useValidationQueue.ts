import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { StatutValidation, TypeAction, ValidationItem } from './types'

interface Row {
  id: string
  client_id: string
  type_action: TypeAction
  reference_id: string
  contenu_propose: Record<string, unknown>
  statut: StatutValidation
  created_at: string
  resolved_at: string | null
  clients: { nom: string } | null
}

function toValidationItem(row: Row): ValidationItem {
  return {
    id: row.id,
    client_id: row.client_id,
    client_nom: row.clients?.nom ?? 'Client inconnu',
    type_action: row.type_action,
    reference_id: row.reference_id,
    contenu_propose: row.contenu_propose,
    statut: row.statut,
    created_at: row.created_at,
    resolved_at: row.resolved_at,
  }
}

export function useValidationQueue() {
  const [items, setItems] = useState<ValidationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('validations')
      .select('id, client_id, type_action, reference_id, contenu_propose, statut, created_at, resolved_at, clients(nom)')
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: true })
      .returns<Row[]>()

    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setItems(data.map(toValidationItem))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  const resolve = useCallback(
    async (id: string, statut: Extract<StatutValidation, 'valide' | 'modifie' | 'rejete'>, contenu?: Record<string, unknown>) => {
      const { error } = await supabase
        .from('validations')
        .update({ statut, resolved_at: new Date().toISOString(), ...(contenu ? { contenu_propose: contenu } : {}) })
        .eq('id', id)

      if (error) throw new Error(error.message)
      setItems((current) => current.filter((item) => item.id !== id))
    },
    [],
  )

  return { items, loading, error, resolve, refetch: fetchQueue }
}
