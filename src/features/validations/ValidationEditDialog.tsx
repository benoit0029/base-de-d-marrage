import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { ValidationItem } from './types'

interface ValidationEditDialogProps {
  item: ValidationItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (contenu: Record<string, unknown>) => Promise<void>
}

export function ValidationEditDialog({ item, open, onOpenChange, onSave }: ValidationEditDialogProps) {
  const [fields, setFields] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(item.contenu_propose).map(([key, value]) => [key, String(value)])),
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(fields)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier avant validation</DialogTitle>
          <DialogDescription>{item.client_nom}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {Object.entries(fields).map(([key, value]) => {
            const isLong = value.length > 60
            const Field = isLong ? Textarea : Input
            return (
              <label key={key} className="flex flex-col gap-1 text-left text-sm">
                <span className="font-medium capitalize">{key.replace(/_/g, ' ')}</span>
                <Field value={value} onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))} />
              </label>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer et valider'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
