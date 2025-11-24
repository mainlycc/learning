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

interface PageProps {
  searchParams: Promise<{ trainingId?: string }>
}

type UserResult = {
  user_id: string
  full_name: string | null
  email: string
  training_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  test_score: number | null
  test_passed: boolean | null
  test_completed_at: string | null
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
  let selectedTraining = null

  if (selectedTrainingId) {
    // Pobierz wybrane szkolenie
    const { data: training } = await supabase
      .from('trainings')
      .select('id, title')
      .eq('id', selectedTrainingId)
      .single()

    if (training) {
      selectedTraining = training

      // Pobierz użytkowników z dostępem do kursu
      // Używamy admin client aby mieć pewność że RLS nie blokuje dostępu
      // Sprawdzamy zarówno training_users (przypisani) jak i szkolenia bez przypisań (publiczne)
      let userIds: string[] = []
      
      try {
        const adminClient = createAdminClient()
        const { data: assignedUsers, error: assignedUsersError } = await adminClient
          .from('training_users')
          .select('user_id')
          .eq('training_id', selectedTrainingId)

        if (assignedUsersError) {
          console.error('Błąd pobierania przypisanych użytkowników (adminClient):', assignedUsersError)
          // Fallback: spróbuj użyć zwykłego klienta (może działać dla adminów)
          const { data: fallbackUsers, error: fallbackError } = await supabase
            .from('training_users')
            .select('user_id')
            .eq('training_id', selectedTrainingId)
          
          if (fallbackError) {
            console.error('Błąd pobierania przypisanych użytkowników (fallback):', fallbackError)
          } else if (fallbackUsers && fallbackUsers.length > 0) {
            console.log('Użyto fallback - znaleziono użytkowników:', fallbackUsers.length)
            userIds = fallbackUsers.map(au => au.user_id).filter(id => id)
          }
        } else {
          console.log('Pobrano przypisanych użytkowników (adminClient):', assignedUsers?.length || 0)
          if (assignedUsers && assignedUsers.length > 0) {
            userIds = assignedUsers.map(au => au.user_id).filter(id => id)
          }
        }
      } catch (error) {
        console.error('Błąd podczas tworzenia adminClient lub pobierania użytkowników:', error)
        // Fallback: spróbuj użyć zwykłego klienta
        const { data: fallbackUsers, error: fallbackError } = await supabase
          .from('training_users')
          .select('user_id')
          .eq('training_id', selectedTrainingId)
        
        if (fallbackError) {
          console.error('Błąd pobierania przypisanych użytkowników (fallback):', fallbackError)
        } else if (fallbackUsers && fallbackUsers.length > 0) {
          console.log('Użyto fallback - znaleziono użytkowników:', fallbackUsers.length)
          userIds = fallbackUsers.map(au => au.user_id).filter(id => id)
        }
      }

      // Jeśli kurs nie ma przypisanych użytkowników, pobierz wszystkich użytkowników (kurs publiczny)
      if (userIds.length === 0) {
        console.log('Brak przypisanych użytkowników - traktuję kurs jako publiczny')
        const { data: allUsers, error: allUsersError } = await supabase
          .from('profiles')
          .select('id')
        
        if (allUsersError) {
          console.error('Błąd pobierania wszystkich użytkowników:', allUsersError)
        } else {
          userIds = allUsers?.map(u => u.id).filter(id => id) || []
          console.log('Pobrano wszystkich użytkowników (kurs publiczny):', userIds.length)
        }
      }

      if (userIds.length > 0) {
        console.log('Szukam profili dla userIds:', userIds)
        
        // Pobierz postęp szkoleń dla tych użytkowników
        const { data: progress } = await supabase
          .from('user_training_progress')
          .select('user_id, status, completed_at')
          .eq('training_id', selectedTrainingId)
          .in('user_id', userIds)

        // Pobierz test dla tego szkolenia
        const { data: testData } = await supabase
          .from('tests')
          .select('id')
          .eq('training_id', selectedTrainingId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        // Pobierz najlepsze wyniki testów dla każdego użytkownika
        const testResults: Record<string, { score: number; passed: boolean; completed_at: string }> = {}
        if (testData) {
          const { data: attempts } = await supabase
            .from('user_test_attempts')
            .select('user_id, score, passed, completed_at')
            .eq('test_id', testData.id)
            .in('user_id', userIds)
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

        // Pobierz dane użytkowników - użyj adminClient aby ominąć RLS
        let profiles: Array<{ id: string; full_name: string | null; email: string }> | null = null
        
        try {
          const adminClient = createAdminClient()
          const { data: adminProfiles, error: adminProfilesError } = await adminClient
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          
          profiles = adminProfiles
          
          if (adminProfilesError) {
            console.error('Błąd pobierania profili użytkowników (adminClient):', adminProfilesError)
            // Fallback: spróbuj użyć zwykłego klienta
            const { data: fallbackProfiles, error: fallbackError } = await supabase
              .from('profiles')
              .select('id, full_name, email')
              .in('id', userIds)
            
            if (fallbackError) {
              console.error('Błąd pobierania profili użytkowników (fallback):', fallbackError)
            } else {
              profiles = fallbackProfiles
              console.log('Użyto fallback - pobrano profile:', fallbackProfiles?.length || 0)
            }
          } else {
            console.log('Pobrano profile użytkowników (adminClient):', adminProfiles?.length || 0)
          }
        } catch (error) {
          console.error('Błąd podczas tworzenia adminClient dla profili:', error)
          // Fallback: użyj zwykłego klienta
          const { data: fallbackProfiles, error: fallbackError } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds)
          
          if (fallbackError) {
            console.error('Błąd pobierania profili użytkowników (fallback):', fallbackError)
          } else {
            profiles = fallbackProfiles
            console.log('Użyto fallback - pobrano profile:', fallbackProfiles?.length || 0)
          }
        }
        
        // Sprawdź czy wszystkie userIds mają odpowiadające profile
        if (profiles && profiles.length < userIds.length) {
          const foundIds = new Set(profiles.map(p => p.id))
          const missingIds = userIds.filter(id => !foundIds.has(id))
          console.warn('Nie znaleziono profili dla userIds:', missingIds)
          
          // Sprawdź czy te userIds istnieją w auth.users
          try {
            const adminClient = createAdminClient()
            const { data: authUsers } = await adminClient.auth.admin.listUsers()
            const existingAuthIds = new Set(authUsers?.users?.map(u => u.id) || [])
            const missingInAuth = missingIds.filter(id => !existingAuthIds.has(id))
            
            if (missingInAuth.length > 0) {
              console.warn('UserIds nie istnieją w auth.users:', missingInAuth)
            }
          } catch (error) {
            console.error('Błąd sprawdzania auth.users:', error)
          }
        }

        // Połącz dane
        results = (profiles || []).map(profile => {
          const userProgress = progress?.find(p => p.user_id === profile.id)
          const testResult = testResults[profile.id]

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

          return {
            user_id: profile.id,
            full_name: profile.full_name,
            email: profile.email,
            training_status: trainingStatus,
            test_score: testResult?.score ?? null,
            test_passed: testResult?.passed ?? null,
            test_completed_at: testResult?.completed_at ?? null,
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
            <CardTitle>Wyniki dla: {selectedTraining.title}</CardTitle>
            <CardDescription>
              Lista użytkowników z dostępem do tego szkolenia oraz ich postępy i wyniki testów
            </CardDescription>
          </CardHeader>
          <CardContent>
            {results.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Użytkownik</TableHead>
                      <TableHead>Email</TableHead>
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

