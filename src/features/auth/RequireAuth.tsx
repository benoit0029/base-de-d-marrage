import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useSession } from './useSession'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()
  const [aalChecked, setAalChecked] = useState(false)
  const [needsMfa, setNeedsMfa] = useState(false)

  useEffect(() => {
    if (!session) return
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      setNeedsMfa(Boolean(data && data.currentLevel !== data.nextLevel && data.nextLevel === 'aal2'))
      setAalChecked(true)
    })
  }, [session])

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
  if (!session) return <Navigate to="/login" replace />
  if (!aalChecked) return <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
  if (needsMfa) return <Navigate to="/mfa-challenge" replace />

  return <>{children}</>
}
