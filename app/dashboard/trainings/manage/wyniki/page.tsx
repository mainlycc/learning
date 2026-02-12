import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TrainingSelect } from './training-select'
import { ExportPdfWrapper } from './export-pdf-wrapper'

interface PageProps {
  searchParams: Promise<{ trainingId?: string }>
}

type UserResult = {
  user_id: string
  full_name: string | null
  email: string
  function: string | null
  training_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  test_score: number | null
  test_passed: boolean | null
  test_completed_at: string | null
  training_completed_at: string | null
}

export default async function ResultsPage({ searchParams }: PageProps) {
  const params = await searchParams
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

  // Pobierz wszystkie szkolenia dla dropdown
  const { data: trainings } = await supabase
    .from('trainings')
    .select('id, title')
    .order('title', { ascending: true })

  const selectedTrainingId = params.trainingId

  // Jeśli nie wybrano kursu, ale są dostępne kursy, przekieruj do pierwszego
  if (!selectedTrainingId && trainings && trainings.length > 0) {
    redirect(`/dashboard/trainings/manage/wyniki?trainingId=${trainings[0].id}`)
  }

  let results: UserResult[] = []
  let selectedTraining: { id: string; title: string; file_type: string } | null = null

  if (selectedTrainingId) {
    const adminClient = createAdminClient()

    // Pobierz wybrane szkolenie
    const { data: training } = await adminClient
      .from('trainings')
      .select('id, title, file_type')
      .eq('id', selectedTrainingId)
      .single()

    if (training) {
      selectedTraining = training

      // Pobierz użytkowników z dostępem do kursu
      const userIds: Set<string> = new Set()

      // 1. Pobierz użytkowników przypisanych do szkolenia
      const { data: assignedUsers } = await adminClient
        .from('training_users')
        .select('user_id')
        .eq('training_id', selectedTrainingId)

      if (assignedUsers) {
        assignedUsers.forEach(au => userIds.add(au.user_id))
      }

      // 2. Pobierz użytkowników z postępem w szkoleniu
      const { data: progressUsers } = await adminClient
        .from('user_training_progress')
        .select('user_id')
        .eq('training_id', selectedTrainingId)

      if (progressUsers) {
        progressUsers.forEach(p => userIds.add(p.user_id))
      }

      // 3. Pobierz test dla tego szkolenia i użytkowników z wynikami testu
      const { data: testData } = await adminClient
        .from('tests')
        .select('id')
        .eq('training_id', selectedTrainingId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (testData) {
        const { data: testUsers } = await adminClient
          .from('user_test_attempts')
          .select('user_id')
          .eq('test_id', testData.id)

        if (testUsers) {
          testUsers.forEach(t => userIds.add(t.user_id))
        }
      }

      // Jeśli nie znaleziono żadnych użytkowników, pobierz wszystkich (kurs publiczny)
      if (userIds.size === 0) {
        const { data: allUsers } = await adminClient
          .from('profiles')
          .select('id')

        if (allUsers) {
          allUsers.forEach(u => userIds.add(u.id))
        }
      }

      const userIdsArray = Array.from(userIds)
      if (userIdsArray.length > 0) {
        // Pobierz postęp szkoleń dla tych użytkowników (adminClient!)
        const { data: progress } = await adminClient
          .from('user_training_progress')
          .select('user_id, status, completed_at')
          .eq('training_id', selectedTrainingId)
          .in('user_id', userIdsArray)

        // Pobierz najlepsze wyniki testów dla każdego użytkownika (adminClient!)
        const testResults: Record<string, { score: number; passed: boolean; completed_at: string }> = {}
        if (testData) {
          const { data: attempts } = await adminClient
            .from('user_test_attempts')
            .select('user_id, score, passed, completed_at')
            .eq('test_id', testData.id)
            .in('user_id', userIdsArray)
            .order('score', { ascending: false })

          // Dla każdego użytkownika weź najlepszy wynik
          attempts?.forEach(attempt => {
            if (!testResults[attempt.user_id] || testResults[attempt.user_id].score < attempt.score) {
              testResults[attempt.user_id] = {
                score: attempt.score,
                passed: attempt.passed,
                completed_at: attempt.completed_at || ''
              }
            }
          })
        }

        // Pobierz dane użytkowników (adminClient!)
        const { data: profiles } = await adminClient
          .from('profiles')
          .select('id, full_name, email, function')
          .in('id', userIdsArray)

        // Połącz dane
        results = (profiles || []).map(p => {
          const userProgress = progress?.find(pr => pr.user_id === p.id)
          const testResult = testResults[p.id]

          let trainingStatus: 'not_started' | 'in_progress' | 'completed' | 'paused' = 'not_started'
          if (userProgress) {
            if (userProgress.status === 'completed') {
              trainingStatus = 'completed'
            } else if (userProgress.status === 'paused') {
              trainingStatus = 'paused'
            } else {
              trainingStatus = 'in_progress'
            }
          }

          // Jeśli szkolenie nie zostało rozpoczęte, nie wyświetlaj wyniku testu
          const shouldShowTestResult = trainingStatus !== 'not_started'

          return {
            user_id: p.id,
            full_name: p.full_name,
            email: p.email,
            function: p.function,
            training_status: trainingStatus,
            test_score: shouldShowTestResult ? (testResult?.score ?? null) : null,
            test_passed: shouldShowTestResult ? (testResult?.passed ?? null) : null,
            test_completed_at: shouldShowTestResult ? (testResult?.completed_at ?? null) : null,
            training_completed_at: userProgress?.completed_at ?? null,
          }
        })

        // Sortuj po nazwisku
        results.sort((a, b) => {
          const nameA = a.full_name || a.email
          const nameB = b.full_name || b.email
          return nameA.localeCompare(nameB, 'pl')
        })
      }
    }
  }

  const getStatusBadge = (status: UserResult['training_status']) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Ukończone</Badge>
      case 'in_progress':
        return <Badge variant="secondary">W toku</Badge>
      case 'paused':
        return <Badge variant="outline">Wstrzymane</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Nie rozpoczęte</Badge>
    }
  }

  const getTestResultBadge = (score: number | null, passed: boolean | null) => {
    if (score === null) {
      return <span className="text-muted-foreground">Brak</span>
    }
    const colorClass = passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
    return <span className={`font-medium ${colorClass}`}>{score}%</span>
  }

  const getFunctionLabel = (fn: string | null) => {
    switch (fn) {
      case 'ochrona': return 'Ochrona'
      case 'pilot': return 'Pilot'
      case 'steward': return 'Steward'
      case 'instruktor': return 'Instruktor'
      case 'uczestnik': return 'Uczestnik'
      case 'gosc': return 'Gość'
      case 'pracownik': return 'Pracownik'
      case 'kontraktor': return 'Kontraktor'
      default: return fn || 'Brak'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/trainings/manage">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do zarządzania
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Wyniki szkoleń
          </h1>
          <p className="text-muted-foreground">
            Przeglądaj postępy użytkowników i wyniki testów
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wybierz szkolenie</CardTitle>
          <CardDescription>
            Wybierz szkolenie, aby zobaczyć wyniki użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TrainingSelect trainings={trainings || []} selectedTrainingId={selectedTrainingId || ''} />
        </CardContent>
      </Card>

      {selectedTraining && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Wyniki dla: {selectedTraining.title}</CardTitle>
                <CardDescription>
                  Lista użytkowników z dostępem do tego szkolenia oraz ich postępy i wyniki testów
                </CardDescription>
              </div>
              {results.length > 0 && (
                <ExportPdfWrapper 
                  results={results} 
                  trainingTitle={selectedTraining.title}
                />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Użytkownik</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Funkcja</TableHead>
                      <TableHead>Data szkolenia</TableHead>
                      <TableHead>Status szkolenia</TableHead>
                      <TableHead>Wynik testu</TableHead>
                      <TableHead>Data testu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.user_id}>
                        <TableCell className="font-medium">
                          {result.full_name || 'Brak imienia'}
                        </TableCell>
                        <TableCell>{result.email}</TableCell>
                        <TableCell>{getFunctionLabel(result.function)}</TableCell>
                        <TableCell>
                          {result.training_completed_at
                            ? new Date(result.training_completed_at).toLocaleDateString('pl-PL')
                            : '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(result.training_status)}</TableCell>
                        <TableCell>
                          {getTestResultBadge(result.test_score, result.test_passed)}
                        </TableCell>
                        <TableCell>
                          {result.test_completed_at
                            ? new Date(result.test_completed_at).toLocaleDateString('pl-PL')
                            : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-8">
                Brak użytkowników z dostępem do tego szkolenia.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
