import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Shield, UserCheck } from 'lucide-react'
import { UsersTable } from '@/components/admin/UsersTable'

import { createAdminClient } from '@/lib/supabase/admin'

async function getUsers() {
  const adminClient = createAdminClient()
  
  // Pobierz użytkowników z auth.users
  const { data: authUsersData, error: authError } = await adminClient.auth.admin.listUsers()
  
  if (authError || !authUsersData) {
    console.error('Błąd pobierania użytkowników:', authError)
    return []
  }

  const authUsers = authUsersData.users

  // Pobierz profile
  const supabase = await createClient()
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')

  if (profilesError) {
    console.error('Błąd pobierania profili:', profilesError)
    return []
  }

  // Połącz dane
  const users = authUsers.map((authUser) => {
    const profile = profiles?.find((p) => p.id === authUser.id)
    return {
      id: authUser.id,
      email: authUser.email || '',
      full_name: profile?.full_name || null,
      role: (profile?.role || 'user') as 'user' | 'admin' | 'super_admin',
      created_at: authUser.created_at,
      email_confirmed_at: authUser.email_confirmed_at || null,
    }
  })

  return users
}

async function getStats() {
  const supabase = await createClient()
  
  const { data: profiles } = await supabase
    .from('profiles')
    .select('role, created_at')

  if (!profiles) {
    return {
      total: 0,
      admins: 0,
      activeThisMonth: 0,
    }
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const activeThisMonth = profiles.filter(
    (p) => new Date(p.created_at) >= monthStart
  ).length

  const admins = profiles.filter(
    (p) => p.role === 'admin' || p.role === 'super_admin'
  ).length

  return {
    total: profiles.length,
    admins,
    activeThisMonth,
  }
}

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Sprawdź uprawnienia
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Brak uprawnień</CardTitle>
            <CardDescription>
              Ta sekcja jest dostępna tylko dla administratorów.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const [users, stats] = await Promise.all([getUsers(), getStats()])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Zarządzanie użytkownikami
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Zarządzaj użytkownikami systemu
          </p>
        </div>
      </div>

      {/* Statystyki */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wszyscy użytkownicy
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Zarejestrowanych użytkowników
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Administratorzy
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.admins}</div>
            <p className="text-xs text-muted-foreground">
              Użytkowników z uprawnieniami admin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktywni użytkownicy
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeThisMonth}</div>
            <p className="text-xs text-muted-foreground">
              Użytkowników aktywnych w tym miesiącu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista użytkowników */}
      <Card>
        <CardHeader>
          <CardTitle>Lista użytkowników</CardTitle>
          <CardDescription>
            Zarządzaj uprawnieniami i danymi użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={users} currentUserId={user.id} />
        </CardContent>
      </Card>
    </div>
  )
}
