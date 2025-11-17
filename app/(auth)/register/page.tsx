'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateInvitationToken, registerWithInvitation } from '@/lib/actions/invitations'
import { toast } from 'sonner'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Brak tokenu zaproszenia')
        setLoading(false)
        return
      }

      const result = await validateInvitationToken(token)

      if (result.valid && result.email) {
        setEmail(result.email)
        setError(null)
      } else {
        setError(result.error || 'Nieprawidłowy token')
      }

      setLoading(false)
    }

    validateToken()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      toast.error('Brak tokenu zaproszenia')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Hasła nie są identyczne')
      return
    }

    if (password.length < 6) {
      toast.error('Hasło musi mieć co najmniej 6 znaków')
      return
    }

    if (!fullName.trim()) {
      toast.error('Imię i nazwisko jest wymagane')
      return
    }

    setIsSubmitting(true)

    const result = await registerWithInvitation(token, fullName.trim(), password)

    if (result.success) {
      toast.success('Konto zostało utworzone! Możesz się teraz zalogować.')
      router.push('/login')
    } else {
      toast.error(result.error || 'Nie udało się utworzyć konta')
    }

    setIsSubmitting(false)
  }

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Błąd</CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/login')} className="w-full">
            Przejdź do logowania
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Rejestracja</CardTitle>
        <CardDescription>
          Uzupełnij dane, aby utworzyć swoje konto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              Email został przypisany do tego zaproszenia
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Imię i nazwisko *</Label>
            <Input
              id="full_name"
              type="text"
              placeholder="Jan Kowalski"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Hasło *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum 6 znaków
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm_password">Potwierdź hasło *</Label>
            <div className="relative">
              <Input
                id="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isSubmitting}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isSubmitting}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Tworzenie konta...
              </>
            ) : (
              'Utwórz konto'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

// Wymusza renderowanie dynamiczne
export const dynamic = 'force-dynamic'

