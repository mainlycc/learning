import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrainingsTable } from '@/components/admin/TrainingsTable'
import { Plus } from 'lucide-react'
import Link from 'next/link'


export default async function TrainingsManagePage() {
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

  // Lista istniejących szkoleń (pełne dane do edycji)
  const { data: trainings } = await supabase
    .from('trainings')
    .select('id, title, description, file_type, duration_minutes, is_active, created_at')
    .order('created_at', { ascending: false })

  // Pobierz informacje o testach dla każdego szkolenia
  const trainingIds = trainings?.map(t => t.id) || []
  const { data: tests } = await supabase
    .from('tests')
    .select('id, training_id')
    .in('training_id', trainingIds)

  // Utwórz mapę training_id -> hasTest
  const testsMap = new Map<string, boolean>()
  tests?.forEach(test => {
    testsMap.set(test.training_id, true)
  })

  // Dodaj informację o testach do każdego szkolenia
  const trainingsWithTests = trainings?.map(training => ({
    ...training,
    hasTest: testsMap.has(training.id) || false
  })) || []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zarządzanie szkoleniami</h1>
          <p className="text-muted-foreground">Dodawaj, edytuj i zarządzaj szkoleniami oraz testami.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/trainings/manage/new">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj szkolenie
          </Link>
        </Button>
      </div>

      {/* Tabela szkoleń */}
      <Card>
        <CardHeader>
          <CardTitle>Szkolenia</CardTitle>
          <CardDescription>Przeglądaj, edytuj i zarządzaj statusem istniejących szkoleń</CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingsTable trainings={trainingsWithTests} />
        </CardContent>
      </Card>

    </div>
  )
}


