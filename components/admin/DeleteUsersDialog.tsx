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
} from '@/components/ui/dialog'
import { Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { deleteUsers } from '@/app/dashboard/users/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface DeleteUsersDialogProps {
  userIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  onLoadingChange?: (isLoading: boolean) => void
}

export function DeleteUsersDialog({ userIds, open, onOpenChange, onSuccess, onLoadingChange }: DeleteUsersDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsLoading(true)
    onLoadingChange?.(true)

    const result = await deleteUsers(userIds)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message || 'Użytkownicy usunięci')
      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    }

    setIsLoading(false)
    onLoadingChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Usuń użytkowników
          </DialogTitle>
          <DialogDescription>
            Czy na pewno chcesz usunąć {userIds.length} {userIds.length === 1 ? 'użytkownika' : 'użytkowników'}?
            <br />
            <br />
            Ta operacja jest nieodwracalna. Wszystkie dane użytkowników, w tym postępy w
            szkoleniach i wyniki testów, zostaną trwale usunięte.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
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
                Usuń użytkowników
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

