import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useFactures, type StatutFacture } from './useFactures'

const STATUT_LABELS: Record<StatutFacture, string> = {
  emise: 'Émise',
  payee: 'Payée',
  impayee: 'Impayée',
}

function StatutBadge({ statut }: { statut: StatutFacture }) {
  if (statut === 'payee') return <Badge variant="success">{STATUT_LABELS[statut]}</Badge>
  if (statut === 'impayee') return <Badge variant="destructive">{STATUT_LABELS[statut]}</Badge>
  return <Badge variant="secondary">{STATUT_LABELS[statut]}</Badge>
}

function anciennete(dateEcheance: string): number {
  const jours = Math.floor((Date.now() - new Date(dateEcheance).getTime()) / (1000 * 60 * 60 * 24))
  return jours > 0 ? jours : 0
}

export function FacturesPage() {
  const { factures, loading, error } = useFactures()
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState<StatutFacture | 'toutes'>('toutes')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return factures.filter((f) => {
      const matchesSearch = term.length === 0 || f.client_nom.toLowerCase().includes(term)
      const matchesStatut = statutFilter === 'toutes' || f.statut === statutFilter
      return matchesSearch && matchesStatut
    })
  }, [factures, search, statutFilter])

  const impayees = useMemo(() => factures.filter((f) => f.statut === 'impayee'), [factures])
  const montantImpaye = impayees.reduce((sum, f) => sum + f.montant, 0)
  const montantTotal = factures.reduce((sum, f) => sum + f.montant, 0)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Factures</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Total facturé</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{montantTotal.toLocaleString('fr-FR')} €</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Factures émises</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{factures.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Impayés en cours</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">
            {montantImpaye.toLocaleString('fr-FR')} € <span className="text-sm font-normal text-muted-foreground">({impayees.length})</span>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher un client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={statutFilter} onChange={(e) => setStatutFilter(e.target.value as StatutFacture | 'toutes')}>
            <option value="toutes">Tous les statuts</option>
            <option value="emise">Émise</option>
            <option value="payee">Payée</option>
            <option value="impayee">Impayée</option>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune facture ne correspond à ces critères.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Émission</TableHead>
              <TableHead>Échéance</TableHead>
              <TableHead>Ancienneté</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((facture) => (
              <TableRow key={facture.id}>
                <TableCell>
                  <Link to={`/clients/${facture.client_id}`} className="font-medium hover:underline">
                    {facture.client_nom}
                  </Link>
                </TableCell>
                <TableCell>{facture.montant.toLocaleString('fr-FR')} €</TableCell>
                <TableCell>
                  <StatutBadge statut={facture.statut} />
                </TableCell>
                <TableCell>{new Date(facture.date_emission).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>{new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</TableCell>
                <TableCell>
                  {facture.statut === 'impayee' && anciennete(facture.date_echeance) > 0
                    ? `${anciennete(facture.date_echeance)} j de retard`
                    : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
