import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatRelativeDays } from '@/lib/utils'
import { ValidationEditDialog } from './ValidationEditDialog'
import { TYPE_ACTION_LABELS, type ValidationItem } from './types'

interface ValidationCardProps {
  item: ValidationItem
  onApprove: (id: string) => Promise<void>
  onReject: (id: string) => Promise<void>
  onModify: (id: string, contenu: Record<string, unknown>) => Promise<void>
}

export function ValidationCard({ item, onApprove, onReject, onModify }: ValidationCardProps) {
  const [editOpen, setEditOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const withPending = (action: () => Promise<void>) => async () => {
    setPending(true)
    try {
      await action()
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle>{item.client_nom}</CardTitle>
          <p className="text-sm text-muted-foreground">en attente {formatRelativeDays(item.created_at)}</p>
        </div>
        <Badge variant="secondary">{TYPE_ACTION_LABELS[item.type_action]}</Badge>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          {Object.entries(item.contenu_propose).map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="capitalize text-muted-foreground">{key.replace(/_/g, ' ')}</dt>
              <dd className="truncate">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
      <CardFooter>
        <Button size="sm" disabled={pending} onClick={withPending(() => onApprove(item.id))}>
          Approuver
        </Button>
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditOpen(true)}>
          Modifier
        </Button>
        <Button size="sm" variant="destructive" disabled={pending} onClick={withPending(() => onReject(item.id))}>
          Rejeter
        </Button>
      </CardFooter>
      <ValidationEditDialog
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={(contenu) => onModify(item.id, contenu)}
      />
    </Card>
  )
}
