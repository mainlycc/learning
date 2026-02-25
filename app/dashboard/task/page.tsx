import { createClient } from '@/lib/supabase/server'
import { TaskViewer } from '@/components/task-viewer'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

// Wyłącz cache dla tej strony - zawsze pobieraj najnowsze dane
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  // RLS policy na trainings już filtruje dostęp - jeśli użytkownik nie ma dostępu,
  // szkolenie nie pojawi się w wynikach zapytania
  let availableTrainings: typeof allTrainings = []

  if (allTrainings) {
    if (isAdmin) {
      // Admini widzą wszystkie szkolenia (nawet ukończone)
      availableTrainings = allTrainings
    } else {
      // Dla zwykłych użytkowników RLS policy już filtruje dostęp
      // Filtrujemy tylko ukończone kursy
      availableTrainings = allTrainings.filter(training => 
        !completedTrainingIds.has(training.id)
      )
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

  // Jeśli są dostępne szkolenia, pobierz ich pliki z training_files,
  // żeby nie polegać na legacy kolumnie trainings.file_path
  let trainingsData: {
    id: string
    title: string
    description: string | null
    file_type: 'PDF' | 'PPTX' | 'PNG'
    file_path: string
  }[] = []

  if (availableTrainings && availableTrainings.length > 0) {
    const trainingIds = availableTrainings.map((t) => t.id)

    const { data: trainingFiles } = await supabase
      .from('training_files')
      .select('training_id, file_path, file_type, created_at')
      .in('training_id', trainingIds)
      .order('created_at', { ascending: true })

    const firstFileByTraining = new Map<
      string,
      { file_path: string; file_type: 'PDF' | 'PPTX' | 'PNG' }
    >()

    if (trainingFiles) {
      for (const file of trainingFiles) {
        if (!firstFileByTraining.has(file.training_id)) {
          firstFileByTraining.set(file.training_id, {
            file_path: file.file_path,
            file_type: file.file_type as 'PDF' | 'PPTX' | 'PNG',
          })
        }
      }
    }

    // Przygotuj dane szkoleń do przekazania
    trainingsData = availableTrainings.map((training) => {
      const primaryFile = firstFileByTraining.get(training.id)

      return {
        id: training.id,
        title: training.title,
        description: training.description,
        file_type: (primaryFile?.file_type ||
          training.file_type ||
          'PDF') as 'PDF' | 'PPTX' | 'PNG',
        // Preferuj ścieżkę z training_files, a legacy trainings.file_path traktuj jako fallback
        file_path: primaryFile?.file_path || training.file_path || '',
      }
    })
  }

  return (
    <TaskViewer trainings={trainingsData} />
  )
}

