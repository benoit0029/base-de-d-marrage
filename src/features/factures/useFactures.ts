import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export type StatutFacture = 'emise' | 'payee' | 'impayee'

export interface FactureRow {
  id: string
  montant: number
  statut: StatutFacture
  date_emission: string
  date_echeance: string
  client_id: string
  client_nom: string
}

interface FactureQueryRow {
  id: string
  montant: number
  statut: StatutFacture
  date_emission: string
  date_echeance: string
  client_id: string
  clients: { nom: string } | null
}

export function useFactures() {
  const [factures, setFactures] = useState<FactureRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('factures')
        .select('id, montant, statut, date_emission, date_echeance, client_id, clients(nom)')
        .order('date_echeance', { ascending: false })
        .returns<FactureQueryRow[]>()

      if (cancelled) return
      if (error) {
        setError(error.message)
      } else {
        setError(null)
        setFactures(
          data.map((row) => ({
            id: row.id,
            montant: row.montant,
            statut: row.statut,
            date_emission: row.date_emission,
            date_echeance: row.date_echeance,
            client_id: row.client_id,
            client_nom: row.clients?.nom ?? '—',
          })),
        )
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { factures, loading, error }
}
