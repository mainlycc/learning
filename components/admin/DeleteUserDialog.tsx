'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteUser } from '@/app/dashboard/users/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DeleteUserDialogProps {
  userId: string
  userEmail: string
}

export function DeleteUserDialog({ userId, userEmail }: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)

    const result = await deleteUser(userId)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message || 'Użytkownik usunięty')
      setOpen(false)
      router.refresh()
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Usuń użytkownika">
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Usuń użytkownika
          </DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć użytkownika <strong>{userEmail}</strong>?
            <br />
            <br />
            Ta operacja jest nieodwracalna. Wszystkie dane użytkownika, w tym postępy w
            szkoleniach i wyniki testów, zostaną trwale usunięte.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isLoading}
          >
            Anuluj
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Usuwanie...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Usuń użytkownika
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

