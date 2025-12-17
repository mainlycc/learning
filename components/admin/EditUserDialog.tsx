'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit, Loader2 } from 'lucide-react'
import { updateUserProfile } from '@/app/dashboard/users/actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'super_admin'
  function:
    | 'ochrona'
    | 'pilot'
    | 'steward'
    | 'instruktor'
    | 'uczestnik'
    | 'gosc'
    | 'pracownik'
    | 'kontraktor'
    | null
}

export function EditUserDialog({ user, open: controlledOpen, onOpenChange }: { user: User; open?: boolean; onOpenChange?: (open: boolean) => void }) {
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = onOpenChange || setInternalOpen
  const [isLoading, setIsLoading] = useState(false)
  const [fullName, setFullName] = useState(user.full_name || '')
  const [userFunction, setUserFunction] = useState<
    | 'ochrona'
    | 'pilot'
    | 'steward'
    | 'instruktor'
    | 'uczestnik'
    | 'gosc'
    | 'pracownik'
    | 'kontraktor'
    | 'none'
  >(user.function || 'none')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const result = await updateUserProfile(
      user.id,
      fullName.trim() || null,
      (userFunction === 'none' ? null : userFunction) as
        | 'ochrona'
        | 'pilot'
        | 'steward'
        | 'instruktor'
        | 'uczestnik'
        | 'gosc'
        | 'pracownik'
        | 'kontraktor'
        | null
    )

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message || 'Profil zaktualizowany')
      setOpen(false)
      router.refresh()
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" title="Edytuj użytkownika">
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
      )}
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

          <div className="space-y-2">
            <Label htmlFor="function">Funkcja</Label>
            <Select
              value={userFunction || 'none'}
              onValueChange={(value) =>
                setUserFunction(
                  value as
                    | 'ochrona'
                    | 'pilot'
                    | 'steward'
                    | 'instruktor'
                    | 'uczestnik'
                    | 'gosc'
                    | 'pracownik'
                    | 'kontraktor'
                    | 'none'
                )
              }
              disabled={isLoading}
            >
              <SelectTrigger id="function">
                <SelectValue placeholder="Brak" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak</SelectItem>
                <SelectItem value="ochrona">Ochrona</SelectItem>
                <SelectItem value="pilot">Pilot</SelectItem>
                <SelectItem value="steward">Steward</SelectItem>
                <SelectItem value="instruktor">Instruktor</SelectItem>
                <SelectItem value="uczestnik">Uczestnik</SelectItem>
                <SelectItem value="gosc">Gość</SelectItem>
                <SelectItem value="pracownik">Pracownik</SelectItem>
                <SelectItem value="kontraktor">Kontraktor</SelectItem>
              </SelectContent>
            </Select>
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

