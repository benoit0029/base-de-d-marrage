import { Navigate } from 'react-router-dom'
import { useSession } from './useSession'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession()

  if (loading) return <p className="p-6 text-sm text-muted-foreground">Chargement…</p>
  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}
