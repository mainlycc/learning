'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { updateTraining } from '@/app/dashboard/trainings/manage/actions'

type TrainingForEdit = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  file_type: 'PDF' | 'PPTX'
  is_active: boolean
}

export function EditTrainingDialog({ training }: { training: TrainingForEdit }) {
  const [open, setOpen] = useState(false)
  const [fileType, setFileType] = useState<'PDF' | 'PPTX'>(training.file_type)
  const [isActive, setIsActive] = useState<boolean>(training.is_active)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edytuj</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj szkolenie</DialogTitle>
        </DialogHeader>
        <form action={updateTraining} className="space-y-4">
          <input type="hidden" name="id" value={training.id} />
          <div className="space-y-2">
            <Label htmlFor={`title-${training.id}`}>Tytuł</Label>
            <Input id={`title-${training.id}`} name="title" defaultValue={training.title} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`description-${training.id}`}>Opis</Label>
            <Input id={`description-${training.id}`} name="description" defaultValue={training.description || ''} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`duration-${training.id}`}>Nominalny czas (min)</Label>
            <Input id={`duration-${training.id}`} name="duration_minutes" type="number" min={1} defaultValue={training.duration_minutes} required />
          </div>
          <div className="space-y-2">
            <Label>Typ pliku</Label>
            <Select value={fileType} onValueChange={(v: 'PDF' | 'PPTX') => setFileType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">PDF</SelectItem>
                <SelectItem value="PPTX">PPTX</SelectItem>
              </SelectContent>
            </Select>
            <input type="hidden" name="file_type" value={fileType} />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`active-${training.id}`}>Aktywne</Label>
            <Switch id={`active-${training.id}`} checked={isActive} onCheckedChange={setIsActive} />
            <input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />
          </div>
          <DialogFooter>
            <Button type="submit">Zapisz zmiany</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


