'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { UserPlus, Loader2 } from 'lucide-react'
import { inviteUser } from '@/app/dashboard/users/actions'
import { toast } from 'sonner'

export function InviteUserDialog() {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'user' as 'user' | 'admin' | 'super_admin',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const formDataObj = new FormData()
    formDataObj.append('email', formData.email)
    formDataObj.append('full_name', formData.full_name)
    formDataObj.append('role', formData.role)

    const result = await inviteUser(formDataObj)

    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message || 'Zaproszenie wysłane pomyślnie')
      setOpen(false)
      setFormData({ email: '', full_name: '', role: 'user' })
    }

    setIsLoading(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Dodaj użytkownika
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Zaproś nowego użytkownika</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="uzytkownik@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Imię i nazwisko</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Jan Kowalski"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Rola</Label>
            <Select
              value={formData.role}
              onValueChange={(value: 'user' | 'admin' | 'super_admin') =>
                setFormData({ ...formData, role: value })
              }
              disabled={isLoading}
            >
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Użytkownik</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
                <SelectItem value="super_admin">Super Administrator</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Użytkownik otrzyma email z linkiem do rejestracji i ustawienia hasła.
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

