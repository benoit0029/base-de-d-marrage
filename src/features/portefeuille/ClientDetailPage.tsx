import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useClientDetail } from './useClientDetail'

export function ClientDetailPage() {
  const { clientId } = useParams<{ clientId: string }>()
  const { client, appels, devis, factures, avoirs, loading, error } = useClientDetail(clientId)

  if (loading) return <p className="text-sm text-muted-foreground">Chargement…</p>
  if (error) return <p className="text-sm text-destructive">Erreur de chargement : {error}</p>
  if (!client) return <p className="text-sm text-muted-foreground">Client introuvable.</p>

  return (
    <div className="flex flex-col gap-4">
      <Link to="/" className="text-sm text-muted-foreground hover:underline">
        ← Retour au portefeuille
      </Link>

      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{client.nom}</h1>
        <Badge variant={client.actif ? 'success' : 'outline'}>{client.actif ? 'Actif' : 'Inactif'}</Badge>
      </div>
      <p className="text-sm text-muted-foreground">
        {client.secteur} · client depuis le {new Date(client.date_debut).toLocaleDateString('fr-FR')}
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Derniers appels</CardTitle>
          </CardHeader>
          <CardContent>
            {appels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun appel enregistré.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>RDV</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appels.map((appel) => (
                    <TableRow key={appel.id}>
                      <TableCell>{new Date(appel.created_at).toLocaleString('fr-FR')}</TableCell>
                      <TableCell>{appel.statut}</TableCell>
                      <TableCell>{appel.rdv_pris ? 'Oui' : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Devis</CardTitle>
          </CardHeader>
          <CardContent>
            {devis.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun devis.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devis.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{new Date(d.date_creation).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{d.montant.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{d.statut}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Factures</CardTitle>
          </CardHeader>
          <CardContent>
            {factures.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune facture.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {factures.map((facture) => (
                    <TableRow key={facture.id}>
                      <TableCell>{new Date(facture.date_echeance).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{facture.montant.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>
                        {facture.statut === 'impayee' ? <Badge variant="destructive">Impayée</Badge> : facture.statut}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avoirs</CardTitle>
          </CardHeader>
          <CardContent>
            {avoirs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun avoir.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Motif</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avoirs.map((avoir) => (
                    <TableRow key={avoir.id}>
                      <TableCell>{new Date(avoir.date_emission).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{avoir.montant.toLocaleString('fr-FR')} €</TableCell>
                      <TableCell>{avoir.motif ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
