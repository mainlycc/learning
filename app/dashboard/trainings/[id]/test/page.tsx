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

  // Sprawdź dostęp dla zwykłych użytkowników (admini mają dostęp do wszystkiego)
  if (!isAdmin) {
    // Sprawdź czy kurs ma przypisanych użytkowników
    const { data: assignedUsers } = await supabase
      .from('training_users')
      .select('user_id')
      .eq('training_id', id)

    // Jeśli kurs ma przypisanych użytkowników, sprawdź czy aktualny użytkownik jest wśród nich
    if (assignedUsers && assignedUsers.length > 0) {
      const isAssigned = assignedUsers.some(au => au.user_id === user.id)
      if (!isAssigned) {
        // Użytkownik nie ma dostępu do tego kursu
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Brak dostępu
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Nie masz dostępu do testu dla tego szkolenia.
                </p>
                <Button asChild>
                  <Link href="/dashboard/trainings">Powrót do listy szkoleń</Link>
                </Button>
              </div>
            </div>
          </div>
        )
      }
    }
  }

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


