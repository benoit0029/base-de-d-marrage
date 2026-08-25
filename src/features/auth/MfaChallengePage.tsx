import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useSession } from './useSession'

export function MfaChallengePage() {
  const { session, loading: sessionLoading } = useSession()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [needsChallenge, setNeedsChallenge] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) return
    supabase.auth.mfa.getAuthenticatorAssuranceLevel().then(({ data }) => {
      setNeedsChallenge(Boolean(data && data.currentLevel !== data.nextLevel && data.nextLevel === 'aal2'))
    })
  }, [session])

  if (!sessionLoading && !session) return <Navigate to="/login" replace />
  if (needsChallenge === false) return <Navigate to="/" replace />

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors()
    const factor = factors?.totp?.[0]
    if (factorsError || !factor) {
      setError('Aucun facteur 2FA trouvé.')
      setSubmitting(false)
      return
    }

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: factor.id })
    if (challengeError || !challenge) {
      setError('Erreur lors de la vérification. Réessayez.')
      setSubmitting(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId: factor.id,
      challengeId: challenge.id,
      code,
    })
    if (verifyError) {
      setError('Code incorrect.')
      setSubmitting(false)
      return
    }

    window.location.href = '/'
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Vérification en deux étapes</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Code à 6 chiffres de votre application d'authentification</span>
              <Input
                type="text"
                inputMode="numeric"
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={submitting} className="mt-2">
              {submitting ? 'Vérification…' : 'Valider'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
