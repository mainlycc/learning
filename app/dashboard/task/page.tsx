import { createClient } from '@/lib/supabase/server'
import { TaskViewer } from '@/components/task-viewer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default async function TaskPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Musisz być zalogowany, aby zobaczyć tę stronę.</p>
        </div>
      </div>
    )
  }

  // Sprawdź czy użytkownik jest adminem
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  // Pobierz wszystkie dostępne szkolenia
  // RLS policy automatycznie filtruje dostęp
  const { data: allTrainings } = await supabase
    .from('trainings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Pobierz postępy użytkownika, aby sprawdzić ukończone kursy
  const { data: progress } = await supabase
    .from('user_training_progress')
    .select('training_id, status')
    .eq('user_id', user.id)

  // Utwórz mapę ukończonych kursów
  const completedTrainingIds = new Set(
    progress?.filter(p => p.status === 'completed').map(p => p.training_id) ?? []
  )

  // Filtruj szkolenia według uprawnień użytkownika i ukończenia
  let availableTrainings: typeof allTrainings = []

  if (allTrainings) {
    if (isAdmin) {
      // Admini widzą wszystkie szkolenia (nawet ukończone)
      availableTrainings = allTrainings
    } else {
      // Dla zwykłych użytkowników sprawdź dostęp i ukończenie
      for (const training of allTrainings) {
        // Pomiń ukończone kursy
        if (completedTrainingIds.has(training.id)) {
          continue
        }

        const { data: assignedUsers } = await supabase
          .from('training_users')
          .select('user_id')
          .eq('training_id', training.id)

        // Jeśli szkolenie nie ma przypisanych użytkowników, jest dostępne dla wszystkich
        // Jeśli ma przypisanych, sprawdź czy użytkownik jest wśród nich
        if (!assignedUsers || assignedUsers.length === 0) {
          availableTrainings.push(training)
        } else {
          const isAssigned = assignedUsers.some(au => au.user_id === user.id)
          if (isAssigned) {
            availableTrainings.push(training)
          }
        }
      }
    }
  }

  if (!availableTrainings || availableTrainings.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              Brak dostępnych szkoleń
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Obecnie nie ma dostępnych szkoleń do wyświetlenia.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Przygotuj dane szkoleń do przekazania
  const trainingsData = availableTrainings.map(training => ({
    id: training.id,
    title: training.title,
    description: training.description,
    file_type: training.file_type as 'PDF' | 'PPTX' | 'PNG',
    file_path: training.file_path
  }))

  return (
    <TaskViewer trainings={trainingsData} />
  )
}

