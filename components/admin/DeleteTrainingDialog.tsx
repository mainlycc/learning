'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { deleteTraining } from '@/app/dashboard/trainings/manage/actions'

export function DeleteTrainingDialog({ id, title }: { id: string; title: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">Usuń</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Usunąć szkolenie?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">Tej operacji nie można cofnąć. Szkolenie: <span className="font-medium">{title}</span></p>
        <form action={deleteTraining}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <Button type="submit" variant="destructive">Usuń</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


