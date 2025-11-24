import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { TrainingForm } from './training-form'

export default async function NewTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const resolvedSearchParams = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const isAdmin = role === 'admin' || role === 'super_admin'

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brak uprawnień</CardTitle>
          <CardDescription>Ta sekcja jest dostępna tylko dla administratorów.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Pobierz użytkowników tak samo jak na stronie /dashboard/users
  const adminClient = createAdminClient()
  
  // Pobierz użytkowników z auth.users
  const { data: authUsersData } = await adminClient.auth.admin.listUsers()
  const authUsers = authUsersData?.users || []

  // Pobierz profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')

  // Połącz dane tak samo jak w /dashboard/users
  const users = authUsers.map((authUser) => {
    const profile = profiles?.find((p) => p.id === authUser.id)
    return {
      id: authUser.id,
      email: authUser.email || '',
      full_name: profile?.full_name || null,
    }
  }).filter(user => user.id) // Usuń puste wpisy

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/trainings/manage">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Dodaj nowe szkolenie</h1>
          <p className="text-muted-foreground">Wypełnij informacje o szkoleniu i załącz plik PDF lub PPTX</p>
        </div>
      </div>

      {resolvedSearchParams.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span>{resolvedSearchParams.error}</span>
        </div>
      )}

      <TrainingForm initialUsers={users} />
    </div>
  )
}

