import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePortfolio } from './usePortfolio'
import { OFFRE_LABELS, type OffreType } from './types'

export function PortfolioPage() {
  const { clients, loading, error } = usePortfolio()
  const [search, setSearch] = useState('')
  const [offreFilter, setOffreFilter] = useState<OffreType | 'toutes'>('toutes')

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return clients.filter((client) => {
      const matchesSearch = term.length === 0 || client.nom.toLowerCase().includes(term) || client.secteur.toLowerCase().includes(term)
      const matchesOffre = offreFilter === 'toutes' || client.offres.includes(offreFilter)
      return matchesSearch && matchesOffre
    })
  }, [clients, search, offreFilter])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Portefeuille clients</h1>
        <div className="flex gap-2">
          <Input
            placeholder="Rechercher un client ou un secteur…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64"
          />
          <Select value={offreFilter} onChange={(e) => setOffreFilter(e.target.value as OffreType | 'toutes')}>
            <option value="toutes">Toutes les offres</option>
            <option value="agent_vocal">Agent vocal</option>
            <option value="gestion_globale">Gestion globale</option>
          </Select>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && !error && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun client ne correspond à ces critères.</p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Secteur</TableHead>
              <TableHead>Offres</TableHead>
              <TableHead>Appels</TableHead>
              <TableHead>RDV pris</TableHead>
              <TableHead>Urgences</TableHead>
              <TableHead>Devis en attente</TableHead>
              <TableHead>Impayés</TableHead>
              <TableHead>CA piloté</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((client) => (
              <TableRow key={client.id} className="cursor-pointer">
                <TableCell>
                  <Link to={`/clients/${client.id}`} className="font-medium hover:underline">
                    {client.nom}
                  </Link>
                  {!client.actif && (
                    <Badge variant="outline" className="ml-2">
                      Inactif
                    </Badge>
                  )}
                </TableCell>
                <TableCell>{client.secteur}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {client.offres.map((offre) => (
                      <Badge key={offre} variant="secondary">
                        {OFFRE_LABELS[offre]}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>
                  {client.nb_appels_decroches}/{client.nb_appels}
                </TableCell>
                <TableCell>{client.nb_rdv_pris}</TableCell>
                <TableCell>
                  {client.nb_urgences > 0 ? (
                    <Badge variant="warning">{client.nb_urgences}</Badge>
                  ) : (
                    client.nb_urgences
                  )}
                </TableCell>
                <TableCell>{client.nb_devis_en_attente}</TableCell>
                <TableCell>
                  {client.nb_factures_impayees > 0 ? (
                    <Badge variant="destructive">
                      {client.nb_factures_impayees} · {client.montant_impaye.toLocaleString('fr-FR')} €
                    </Badge>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>{client.ca_pilote.toLocaleString('fr-FR')} €</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
