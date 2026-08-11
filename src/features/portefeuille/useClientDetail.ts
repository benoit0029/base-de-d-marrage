import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface ClientDetail {
  id: string
  nom: string
  secteur: string
  email: string | null
  telephone: string | null
  date_debut: string
  actif: boolean
}

export interface AppelRow {
  id: string
  statut: 'decroche' | 'manque' | 'spam'
  rdv_pris: boolean
  created_at: string
}

export interface DevisRow {
  id: string
  montant: number
  statut: string
  date_creation: string
}

export interface FactureRow {
  id: string
  montant: number
  statut: string
  date_echeance: string
}

export interface AvoirRow {
  id: string
  montant: number
  motif: string | null
  date_emission: string
}

export function useClientDetail(clientId: string | undefined) {
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [appels, setAppels] = useState<AppelRow[]>([])
  const [devis, setDevis] = useState<DevisRow[]>([])
  const [factures, setFactures] = useState<FactureRow[]>([])
  const [avoirs, setAvoirs] = useState<AvoirRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!clientId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      const [clientRes, appelsRes, devisRes, facturesRes, avoirsRes] = await Promise.all([
        supabase.from('clients').select('*').eq('id', clientId).single<ClientDetail>(),
        supabase
          .from('appels')
          .select('id, statut, rdv_pris, created_at')
          .eq('client_id', clientId)
          .order('created_at', { ascending: false })
          .limit(20)
          .returns<AppelRow[]>(),
        supabase
          .from('devis')
          .select('id, montant, statut, date_creation')
          .eq('client_id', clientId)
          .order('date_creation', { ascending: false })
          .returns<DevisRow[]>(),
        supabase
          .from('factures')
          .select('id, montant, statut, date_echeance')
          .eq('client_id', clientId)
          .order('date_echeance', { ascending: false })
          .returns<FactureRow[]>(),
        supabase
          .from('avoirs')
          .select('id, montant, motif, date_emission')
          .eq('client_id', clientId)
          .order('date_emission', { ascending: false })
          .returns<AvoirRow[]>(),
      ])

      if (cancelled) return
      const firstError = clientRes.error ?? appelsRes.error ?? devisRes.error ?? facturesRes.error ?? avoirsRes.error
      if (firstError) {
        setError(firstError.message)
      } else {
        setError(null)
        setClient(clientRes.data)
        setAppels(appelsRes.data ?? [])
        setDevis(devisRes.data ?? [])
        setFactures(facturesRes.data ?? [])
        setAvoirs(avoirsRes.data ?? [])
      }
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [clientId])

  return { client, appels, devis, factures, avoirs, loading, error }
}
