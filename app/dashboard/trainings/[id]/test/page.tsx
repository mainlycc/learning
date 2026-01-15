import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import TestRunnerClient from '@/components/tests/TestRunnerClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TrainingTestPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Sprawdź czy użytkownik jest adminem
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  // Pobierz szkolenie - admini widzą wszystkie, zwykli użytkownicy tylko aktywne
  const trainingQuery = supabase
    .from('trainings')
    .select('*')
    .eq('id', id)
  
  if (!isAdmin) {
    trainingQuery.eq('is_active', true)
  }
  
  const { data: training } = await trainingQuery.single()
  if (!training) notFound()

  // RLS policy na trainings już filtruje dostęp - jeśli użytkownik nie ma dostępu,
  // szkolenie nie pojawi się w wynikach zapytania (notFound() wyżej)
  // Nie musimy ręcznie sprawdzać przypisań

  // Pobierz test przypisany do szkolenia (na razie jeden test na szkolenie)
  const { data: tests } = await supabase
    .from('tests')
    .select('*')
    .eq('training_id', id)
    .order('created_at', { ascending: false })
    .limit(1)

  const test = tests?.[0]

  if (!test) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brak testu</CardTitle>
          <CardDescription>Dla tego szkolenia nie skonfigurowano jeszcze testu.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Pobierz pytania i opcje
  const { data: questions } = await supabase
    .from('test_questions')
    .select('*')
    .eq('test_id', test.id)
    .order('order_number', { ascending: true })

  // Sprawdź czy pytania istnieją
  if (!questions || questions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>
            Dla tego testu nie dodano jeszcze żadnych pytań.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAdmin ? (
            <div className="space-y-4">
              <p className="text-muted-foreground">
                Jako administrator możesz dodać pytania do tego testu.
              </p>
              <Button asChild>
                <Link href={`/dashboard/trainings/manage/${id}/test`}>
                  Przejdź do edycji testu
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Skontaktuj się z administratorem, aby dodać pytania do tego testu.
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  const { data: options } = await supabase
    .from('test_question_options')
    .select('*')
    .in('question_id', questions.map(q => q.id))
    .order('order_number', { ascending: true })

  // Policz dotychczasowe próby użytkownika
  const { count: attemptsCount } = await supabase
    .from('user_test_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('test_id', test.id)

  // Sprawdź czy test został już ukończony (ma completed_at)
  const { data: completedAttempt } = await supabase
    .from('user_test_attempts')
    .select('id, score, passed, completed_at')
    .eq('user_id', user.id)
    .eq('test_id', test.id)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const isTestCompleted = !!completedAttempt

  // Jeśli test został już ukończony, zablokuj dostęp
  if (isTestCompleted && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Test został już wykonany
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ten test został już ukończony. Zgodnie z zasadami, nie możesz wykonać go ponownie.
            </p>
            {completedAttempt && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                  <span className="font-semibold">Wynik:</span> {completedAttempt.score}%
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Status:</span>{' '}
                  <span className={completedAttempt.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                    {completedAttempt.passed ? 'Zaliczone' : 'Nie zaliczone'}
                  </span>
                </p>
                {completedAttempt.completed_at && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Data ukończenia: {new Date(completedAttempt.completed_at).toLocaleString('pl-PL')}
                  </p>
                )}
              </div>
            )}
            <div className="mt-6 space-y-2">
              <Button asChild className="w-full">
                <Link href={`/dashboard/trainings/${id}`}>
                  Powrót do szczegółów kursu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{test.title}</CardTitle>
          <CardDescription>
            Próg zaliczenia: {test.pass_threshold}%
            {test.time_limit_minutes ? ` • Limit czasu: ${test.time_limit_minutes} min` : ''}
            {test.max_attempts ? ` • Maks. prób: ${test.max_attempts}` : ''}
            {typeof attemptsCount === 'number' ? ` • Wykorzystane próby: ${attemptsCount}` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestRunnerClient
            userId={user.id}
            test={test}
            questions={questions}
            options={options || []}
            attemptsCount={attemptsCount || 0}
          />
        </CardContent>
      </Card>
    </div>
  )
}


