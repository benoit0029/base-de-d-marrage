import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'

interface Factor {
  id: string
  friendly_name?: string
  status: string
}

export function SecuritePage() {
  const [factors, setFactors] = useState<Factor[]>([])
  const [loading, setLoading] = useState(true)
  const [enrolling, setEnrolling] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [factorId, setFactorId] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadFactors = async () => {
    setLoading(true)
    const { data } = await supabase.auth.mfa.listFactors()
    setFactors(data?.totp ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadFactors()
  }, [])

  const startEnroll = async () => {
    setError(null)
    setEnrolling(true)
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' })
    if (error || !data) {
      setError("Impossible de démarrer l'activation.")
      setEnrolling(false)
      return
    }
    setFactorId(data.id)
    setQrCode(data.totp.qr_code)
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!factorId) return
    setSubmitting(true)
    setError(null)

    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId })
    if (challengeError || !challenge) {
      setError('Erreur de vérification. Réessayez.')
      setSubmitting(false)
      return
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    })
    if (verifyError) {
      setError('Code incorrect.')
      setSubmitting(false)
      return
    }

    setEnrolling(false)
    setQrCode(null)
    setFactorId(null)
    setCode('')
    setSubmitting(false)
    await loadFactors()
  }

  const handleUnenroll = async (id: string) => {
    await supabase.auth.mfa.unenroll({ factorId: id })
    await loadFactors()
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Sécurité</h1>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Double authentification (2FA)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}

          {!loading && factors.length > 0 && !enrolling && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-success">2FA activé sur votre compte.</p>
              {factors.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span>{f.friendly_name ?? 'Application d’authentification'}</span>
                  <Button variant="outline" size="sm" onClick={() => handleUnenroll(f.id)}>
                    Désactiver
                  </Button>
                </div>
              ))}
            </div>
          )}

          {!loading && factors.length === 0 && !enrolling && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                Le 2FA n'est pas activé. Ajoutez une couche de sécurité supplémentaire avec une application
                d'authentification (Google Authenticator, Authy...).
              </p>
              <Button onClick={startEnroll} className="w-fit">
                Activer le 2FA
              </Button>
            </div>
          )}

          {enrolling && qrCode && (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Scannez ce QR code avec votre application d'authentification, puis entrez le code généré.
              </p>
              <div
                className="w-fit rounded-md border bg-white p-2"
                dangerouslySetInnerHTML={{ __html: qrCode }}
              />
              <form onSubmit={handleVerify} className="flex flex-col gap-2">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Code à 6 chiffres"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Vérification…' : 'Confirmer'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setEnrolling(false)
                      setQrCode(null)
                      setFactorId(null)
                    }}
                  >
                    Annuler
                  </Button>
                </div>
              </form>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
