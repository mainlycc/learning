import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CheckCircle, Clock, XCircle, FileQuestion } from 'lucide-react'
import { notFound } from 'next/navigation'

interface TrainingResult {
  training_id: string
  training_title: string
  training_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  completed_at: string | null
  test_score: number | null
  test_passed: boolean | null
  test_completed_at: string | null
}

export default async function WynikiPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    notFound()
  }

  // Sprawdź czy użytkownik jest adminem
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  // Jeśli admin, przekieruj do strony admina
  if (isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Wyniki</CardTitle>
            <CardDescription>
              Jako administrator, możesz przeglądać szczegółowe wyniki w sekcji "Wyniki szkoleń".
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="/dashboard/trainings/manage/wyniki" className="text-blue-600 hover:underline">
              Przejdź do wyników szkoleń
            </a>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Pobierz wszystkie kursy dostępne dla użytkownika
  const { data: allTrainings } = await supabase
    .from('trainings')
    .select('id, title')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Sprawdź dostęp do kursów (przypisane lub publiczne)
  let availableTrainingIds: string[] = []
  
  if (allTrainings) {
    for (const training of allTrainings) {
      const { data: assignedUsers } = await supabase
        .from('training_users')
        .select('user_id')
        .eq('training_id', training.id)

      // Jeśli kurs nie ma przypisanych użytkowników, jest dostępny dla wszystkich
      // Jeśli ma przypisanych, sprawdź czy użytkownik jest wśród nich
      if (!assignedUsers || assignedUsers.length === 0) {
        availableTrainingIds.push(training.id)
      } else {
        const isAssigned = assignedUsers.some(au => au.user_id === user.id)
        if (isAssigned) {
          availableTrainingIds.push(training.id)
        }
      }
    }
  }

  // Pobierz postępy użytkownika dla dostępnych kursów
  const { data: progress } = await supabase
    .from('user_training_progress')
    .select('training_id, status, completed_at')
    .eq('user_id', user.id)
    .in('training_id', availableTrainingIds)

  // Pobierz testy dla dostępnych kursów
  const { data: tests } = await supabase
    .from('tests')
    .select('id, training_id, title')
    .in('training_id', availableTrainingIds)

  // Pobierz wyniki testów użytkownika
  const testIds = tests?.map(t => t.id) ?? []
  const { data: testAttempts } = testIds.length > 0 ? await supabase
    .from('user_test_attempts')
    .select('test_id, score, passed, completed_at')
    .eq('user_id', user.id)
    .in('test_id', testIds)
    .not('completed_at', 'is', null)
    .order('score', { ascending: false }) : { data: null }

  // Utwórz mapę najlepszych wyników testów dla każdego test_id
  const bestTestResults: Record<string, { score: number; passed: boolean; completed_at: string }> = {}
  testAttempts?.forEach(attempt => {
    if (!bestTestResults[attempt.test_id] || bestTestResults[attempt.test_id].score < attempt.score) {
      bestTestResults[attempt.test_id] = {
        score: attempt.score,
        passed: attempt.passed,
        completed_at: attempt.completed_at || ''
      }
    }
  })

  // Utwórz mapę test_id -> training_id
  const testToTrainingMap: Record<string, string> = {}
  tests?.forEach(test => {
    testToTrainingMap[test.id] = test.training_id
  })

  // Przygotuj dane do wyświetlenia
  const results: TrainingResult[] = []

  // Dodaj wszystkie dostępne kursy (ukończone i nieukończone)
  allTrainings?.forEach(training => {
    if (!availableTrainingIds.includes(training.id)) {
      return
    }

    const userProgress = progress?.find(p => p.training_id === training.id)
    const trainingStatus: 'not_started' | 'in_progress' | 'completed' | 'paused' = 
      userProgress?.status === 'completed' ? 'completed' :
      userProgress?.status === 'in_progress' ? 'in_progress' :
      userProgress?.status === 'paused' ? 'paused' :
      'not_started'

    // Znajdź test dla tego kursu
    const testForTraining = tests?.find(t => t.training_id === training.id)
    const testResult = testForTraining ? bestTestResults[testForTraining.id] : null

    results.push({
      training_id: training.id,
      training_title: training.title,
      training_status: trainingStatus,
      completed_at: userProgress?.completed_at || null,
      test_score: testResult?.score ?? null,
      test_passed: testResult?.passed ?? null,
      test_completed_at: testResult?.completed_at ?? null,
    })
  })

  // Sortuj: najpierw ukończone, potem w toku, potem nie rozpoczęte
  results.sort((a, b) => {
    const statusOrder = { completed: 0, in_progress: 1, paused: 2, not_started: 3 }
    return statusOrder[a.training_status] - statusOrder[b.training_status]
  })

  const getStatusBadge = (status: TrainingResult['training_status']) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="flex items-center gap-1 w-fit">
            <CheckCircle className="h-3 w-3" />
            Ukończone
          </Badge>
        )
      case 'in_progress':
        return (
          <Badge variant="secondary" className="flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            W toku
          </Badge>
        )
      case 'paused':
        return (
          <Badge variant="outline" className="flex items-center gap-1 w-fit">
            <Clock className="h-3 w-3" />
            Wstrzymane
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="w-fit">
            Nie rozpoczęte
          </Badge>
        )
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Moje wyniki
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Przeglądaj swoje postępy w szkoleniach i wyniki testów
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Szkolenia i testy</CardTitle>
          <CardDescription>
            Lista wszystkich dostępnych szkoleń wraz z wynikami testów
          </CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Brak dostępnych szkoleń
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nazwa kursu</TableHead>
                  <TableHead>Status kursu</TableHead>
                  <TableHead>Data ukończenia kursu</TableHead>
                  <TableHead>Wynik testu</TableHead>
                  <TableHead>Status testu</TableHead>
                  <TableHead>Data ukończenia testu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.training_id}>
                    <TableCell className="font-medium">
                      {result.training_title}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(result.training_status)}
                    </TableCell>
                    <TableCell>
                      {formatDate(result.completed_at)}
                    </TableCell>
                    <TableCell>
                      {result.test_score !== null ? (
                        <span className="font-semibold">{result.test_score}%</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.test_passed !== null ? (
                        result.test_passed ? (
                          <Badge variant="default" className="flex items-center gap-1 w-fit">
                            <CheckCircle className="h-3 w-3" />
                            Zaliczony
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                            <XCircle className="h-3 w-3" />
                            Niezaliczony
                          </Badge>
                        )
                      ) : (
                        <span className="text-muted-foreground flex items-center gap-1">
                          <FileQuestion className="h-3 w-3" />
                          Brak wyniku
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatDate(result.test_completed_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

