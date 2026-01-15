import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, Play, CheckCircle, FileQuestion } from 'lucide-react'
import Link from 'next/link'
import type { Database } from '@/lib/types/database'
import JSZip from 'jszip'

type Training = Database['public']['Tables']['trainings']['Row']
type UserProgress = Database['public']['Tables']['user_training_progress']['Row']

type TrainingWithCount = Training & { resolvedSlidesCount: number }

// Wyłącz cache dla tej strony - zawsze pobieraj najnowsze dane
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function TrainingsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Sprawdź czy użytkownik jest adminem
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  // Pobierz szkolenia - RLS policy automatycznie filtruje dostęp
  // Dla adminów: wszystkie szkolenia
  // Dla zwykłych użytkowników: tylko przypisane lub publiczne (bez przypisań)
  const { data: trainings, error: trainingsError } = await supabase
    .from('trainings')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // DEBUG: Sprawdź przypisania użytkownika
  const { data: userAssignments, error: assignmentsError } = await supabase
    .from('training_users')
    .select('training_id')
    .eq('user_id', user.id)

  // DEBUG: Loguj informacje (tylko w development)
  if (process.env.NODE_ENV === 'development') {
    console.log('DEBUG TrainingsPage:')
    console.log('  User ID:', user.id)
    console.log('  User email:', user.email)
    console.log('  Is admin:', isAdmin)
    console.log('  Trainings count:', trainings?.length || 0)
    console.log('  Trainings error:', trainingsError)
    console.log('  User assignments count:', userAssignments?.length || 0)
    console.log('  User assignments:', userAssignments)
    console.log('  Assignments error:', assignmentsError)
  }

  // Pobierz postępy użytkownika
  const { data: progress } = await supabase
    .from('user_training_progress')
    .select('*')
    .eq('user_id', user.id)

  const trainingIds = trainings?.map((t) => t.id) ?? []

  // Pobierz testy dla wszystkich szkoleń
  const { data: tests } = await supabase
    .from('tests')
    .select('id, training_id, title')
    .in('training_id', trainingIds)

  const testsByTrainingId = tests?.reduce<Record<string, { id: string; title: string }>>((acc, test) => {
    acc[test.training_id] = { id: test.id, title: test.title }
    return acc
  }, {}) ?? {}

  let slidesCountMap: Record<string, number> = {}
  if (trainingIds.length > 0) {
    const { data: slides } = await supabase
      .from('training_slides')
      .select('training_id')
      .in('training_id', trainingIds)

    slidesCountMap = slides?.reduce<Record<string, number>>((acc, slide) => {
      acc[slide.training_id] = (acc[slide.training_id] || 0) + 1
      return acc
    }, {}) ?? {}
  }

  const resolvedTrainings: TrainingWithCount[] = trainings
    ? await Promise.all(
        trainings.map(async (training) => {
          const initialCount = slidesCountMap[training.id] ?? training.slides_count ?? 0

          if (initialCount > 0 || training.file_type !== 'PPTX' || !training.file_path) {
            return { ...training, resolvedSlidesCount: initialCount }
          }

          const { data: signedUrlData } = await supabase.storage
            .from('trainings')
            .createSignedUrl(training.file_path, 60)

          if (!signedUrlData?.signedUrl) {
            return { ...training, resolvedSlidesCount: initialCount }
          }

          try {
            const response = await fetch(signedUrlData.signedUrl)
            if (!response.ok) {
              return { ...training, resolvedSlidesCount: initialCount }
            }

            const arrayBuffer = await response.arrayBuffer()
            const zip = await JSZip.loadAsync(arrayBuffer)
            const slideFiles = Object.keys(zip.files).filter(
              (name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
            )

            return { ...training, resolvedSlidesCount: slideFiles.length || initialCount }
          } catch (error) {
            console.error('Nie udało się policzyć slajdów PPTX:', error)
            return { ...training, resolvedSlidesCount: initialCount }
          }
        })
      )
    : []

  const getProgressForTraining = (trainingId: string) => {
    return progress?.find(p => p.training_id === trainingId)
  }

  const getProgressPercentage = (progress: UserProgress | undefined, slidesCount: number) => {
    if (!progress) return 0
    if (progress.status === 'completed') return 100
    if (slidesCount === 0) return 0
    return Math.min(Math.round((progress.current_slide / slidesCount) * 100), 100)
  }

  // Filtruj ukończone kursy - nie wyświetlaj ich
  const availableTrainings = resolvedTrainings?.filter((training) => {
    const userProgress = getProgressForTraining(training.id)
    return userProgress?.status !== 'completed'
  }) ?? []

  // Pobierz informacje o ukończonych testach dla dostępnych szkoleń
  const testIds = tests?.map(t => t.id) ?? []
  const { data: completedTests } = testIds.length > 0 ? await supabase
    .from('user_test_attempts')
    .select('test_id')
    .eq('user_id', user.id)
    .not('completed_at', 'is', null)
    .in('test_id', testIds) : { data: null }

  const completedTestIds = new Set(completedTests?.map(ct => ct.test_id) ?? [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Dostępne szkolenia
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Wybierz szkolenie, które chcesz rozpocząć lub kontynuować
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableTrainings.map((training) => {
          const userProgress = getProgressForTraining(training.id)
          const progressPercentage = getProgressPercentage(userProgress, training.resolvedSlidesCount)
          const isCompleted = userProgress?.status === 'completed'
          const isInProgress = userProgress?.status === 'in_progress'
          
          // Sprawdź czy test dla tego szkolenia został ukończony
          const testForTraining = testsByTrainingId[training.id]
          const isTestCompleted = testForTraining ? completedTestIds.has(testForTraining.id) : false

          return (
            <Card key={training.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{training.title}</CardTitle>
                    <CardDescription>
                      {training.description || 'Brak opisu'}
                    </CardDescription>
                  </div>
                  <Badge variant={
                    isCompleted ? 'default' :
                    isInProgress ? 'secondary' : 'outline'
                  }>
                    {isCompleted ? 'Ukończone' :
                     isInProgress ? 'W toku' : 'Nowe'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center text-sm text-muted-foreground">
                  <Clock className="mr-2 h-4 w-4" />
                  {training.duration_minutes} minut
                </div>
                
                <div className="flex items-center text-sm text-muted-foreground">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {training.resolvedSlidesCount > 0
                    ? `${training.resolvedSlidesCount} slajdów`
                    : 'Brak danych o slajdach'}
                </div>

                {testsByTrainingId[training.id] && !isTestCompleted && (
                  <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                    <FileQuestion className="mr-2 h-4 w-4" />
                    Test dostępny
                  </div>
                )}

                {isInProgress && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Postęp</span>
                      <span>{progressPercentage}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                    <div className="text-xs text-muted-foreground">
                      {training.resolvedSlidesCount > 0
                        ? `Slajd ${Math.min(userProgress?.current_slide ?? 0, training.resolvedSlidesCount)} z ${training.resolvedSlidesCount}`
                        : 'Trwa wczytywanie informacji o slajdach'}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard/trainings/${training.id}`}>
                      {isCompleted ? (
                        <>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Przejrzyj ponownie
                        </>
                      ) : isInProgress ? (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Kontynuuj
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Rozpocznij
                        </>
                      )}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {(!availableTrainings || availableTrainings.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Brak dostępnych szkoleń</h3>
            <p className="text-muted-foreground text-center">
              Obecnie nie ma żadnych aktywnych szkoleń do wykonania. Wszystkie dostępne szkolenia zostały już ukończone.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
