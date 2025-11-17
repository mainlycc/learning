'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus, Loader2 } from 'lucide-react'
import { createInvitation } from '@/lib/actions/invitations'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export function InvitationDialog() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'user' | 'admin' | 'super_admin'>('user')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !email.includes('@')) {
      toast.error('Nieprawidłowy adres email')
      return
    }

    setIsLoading(true)

    const result = await createInvitation(email.trim().toLowerCase(), role)

    if (result.success) {
      toast.success('Zaproszenie zostało wysłane')
      setOpen(false)
      setEmail('')
      setRole('user')
      // Odśwież stronę
      window.location.reload()
    } else {
      toast.error(result.error || 'Nie udało się wysłać zaproszenia')
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Wyślij zaproszenie
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Wyślij zaproszenie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email tutora *</Label>
            <Input
              id="email"
              type="email"
              placeholder="tutor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Tutor otrzyma email z linkiem do rejestracji i ustawienia hasła.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rola *</Label>
            <Select
              value={role}
              onValueChange={(value: 'user' | 'admin' | 'super_admin') => setRole(value)}
              disabled={isLoading}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Wybierz rolę" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Użytkownik</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Wybierz rolę, którą będzie miał zaproszony użytkownik.
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
                  Wysyłanie...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Wyślij zaproszenie
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

