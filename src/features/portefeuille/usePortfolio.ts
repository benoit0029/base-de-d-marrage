import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ClientPortefeuille } from './types'

export function usePortfolio() {
  const [clients, setClients] = useState<ClientPortefeuille[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('client_portefeuille')
        .select('*')
        .order('nom', { ascending: true })
        .returns<ClientPortefeuille[]>()

      if (cancelled) return
      if (error) setError(error.message)
      else {
        setError(null)
        setClients(data)
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { clients, loading, error }
}
