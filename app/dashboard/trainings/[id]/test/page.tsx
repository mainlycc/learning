import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import dynamic from 'next/dynamic'

const TestRunner = dynamic(() => import('@/components/tests/TestRunner'), { ssr: false })

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function TrainingTestPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Pobierz aktywne szkolenie
  const { data: training } = await supabase
    .from('trainings')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()
  if (!training) notFound()

  // Pobierz test przypisany do szkolenia (na razie jeden test na szkolenie)
  const { data: test } = await supabase
    .from('tests')
    .select('*')
    .eq('training_id', id)
    .limit(1)
    .single()
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

  const { data: options } = await supabase
    .from('test_question_options')
    .select('*')
    .in('question_id', (questions || []).map(q => q.id))
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
          <TestRunner
            userId={user.id}
            test={test}
            questions={questions || []}
            options={options || []}
            attemptsCount={attemptsCount || 0}
          />
        </CardContent>
      </Card>
    </div>
  )
}


