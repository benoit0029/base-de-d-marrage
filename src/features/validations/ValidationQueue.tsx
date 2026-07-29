import { useMemo, useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ValidationCard } from './ValidationCard'
import { useValidationQueue } from './useValidationQueue'
import { TYPE_ACTION_LABELS, type TypeAction } from './types'

const FILTERS: Array<{ value: TypeAction | 'tous'; label: string }> = [
  { value: 'tous', label: 'Tous' },
  ...(Object.entries(TYPE_ACTION_LABELS) as Array<[TypeAction, string]>).map(([value, label]) => ({ value, label })),
]

export function ValidationQueue() {
  const { items, loading, error, resolve } = useValidationQueue()
  const [filter, setFilter] = useState<TypeAction | 'tous'>('tous')

  const filteredItems = useMemo(
    () => (filter === 'tous' ? items : items.filter((item) => item.type_action === filter)),
    [items, filter],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">File d'attente de validation</h1>
        <Tabs value={filter} onValueChange={(value) => setFilter(value as TypeAction | 'tous')}>
          <TabsList>
            {FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>
                {f.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {error && <p className="text-sm text-destructive">Erreur de chargement : {error}</p>}
      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!loading && !error && filteredItems.length === 0 && (
        <p className="text-sm text-muted-foreground">Aucune validation en attente.</p>
      )}

      <div className="grid gap-3">
        {filteredItems.map((item) => (
          <ValidationCard
            key={item.id}
            item={item}
            onApprove={(id) => resolve(id, 'valide')}
            onReject={(id) => resolve(id, 'rejete')}
            onModify={(id, contenu) => resolve(id, 'modifie', contenu)}
          />
        ))}
      </div>
    </div>
  )
}
