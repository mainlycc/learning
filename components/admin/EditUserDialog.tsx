'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Edit, Loader2 } from 'lucide-react'
import { updateUserProfile } from '@/app/dashboard/users/actions'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'super_admin'
}

export function EditUserDialog({ user }: { user: User }) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState(user.full_name || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await updateUserProfile(user.id, fullName.trim() || null)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message || 'Profil zaktualizowany')
      setOpen(false)
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" title="Edytuj użytkownika">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edytuj użytkownika</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email nie może być zmieniony
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Imię i nazwisko</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Jan Kowalski"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Rola</Label>
            <Input
              value={
                user.role === 'super_admin'
                  ? 'Super Administrator'
                  : user.role === 'admin'
                  ? 'Administrator'
                  : 'Użytkownik'
              }
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Rola może być zmieniona bezpośrednio w tabeli
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                'Zapisz zmiany'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

