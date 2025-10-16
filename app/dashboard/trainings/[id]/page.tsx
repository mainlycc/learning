import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, Play, CheckCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface TrainingDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TrainingDetailPage({ params }: TrainingDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Pobierz szczegóły szkolenia
  const { data: training } = await supabase
    .from('trainings')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!training) {
    notFound()
  }

  // Pobierz postęp użytkownika
  const { data: userProgress } = await supabase
    .from('user_training_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('training_id', id)
    .single()

  // Pobierz slajdy szkolenia
  await supabase
    .from('training_slides')
    .select('*')
    .eq('training_id', id)
    .order('slide_number', { ascending: true })

  const isCompleted = userProgress?.status === 'completed'
  const isInProgress = userProgress?.status === 'in_progress'
  const progressPercentage = isCompleted ? 100 : 
    userProgress ? Math.round((userProgress.current_slide / training.slides_count) * 100) : 0

  const getStatusBadge = () => {
    if (isCompleted) {
      return <Badge variant="default" className="flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Ukończone
      </Badge>
    }
    if (isInProgress) {
      return <Badge variant="secondary" className="flex items-center gap-1">
        <Play className="h-3 w-3" />
        W toku
      </Badge>
    }
    return <Badge variant="outline">Nowe</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/trainings">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do listy
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Główne informacje o szkoleniu */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{training.title}</CardTitle>
                  <CardDescription className="text-base">
                    {training.description || 'Brak opisu szkolenia'}
                  </CardDescription>
                </div>
                {getStatusBadge()}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Statystyki szkolenia */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Czas trwania</p>
                    <p className="text-sm text-muted-foreground">{training.duration_minutes} minut</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Liczba slajdów</p>
                    <p className="text-sm text-muted-foreground">{training.slides_count} slajdów</p>
                  </div>
                </div>
              </div>

              {/* Postęp użytkownika */}
              {userProgress && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Twój postęp</span>
                    <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {isCompleted ? 'Ukończone' : `Slajd ${userProgress.current_slide} z ${training.slides_count}`}
                    </span>
                    <span>
                      {isCompleted ? '' : `Pozostało: ${training.slides_count - userProgress.current_slide} slajdów`}
                    </span>
                  </div>
                </div>
              )}

              {/* Akcje */}
              <div className="flex space-x-3">
                <Button asChild size="lg" className="flex-1">
                  <Link href={`/dashboard/trainings/${training.id}/viewer`}>
                    {isCompleted ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Przejrzyj ponownie
                      </>
                    ) : isInProgress ? (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Kontynuuj szkolenie
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Rozpocznij szkolenie
                      </>
                    )}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Panel boczny z dodatkowymi informacjami */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informacje o szkoleniu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Typ pliku</p>
                <Badge variant="outline">{training.file_type}</Badge>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Utworzone</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(training.created_at).toLocaleDateString('pl-PL')}
                </p>
              </div>

              {training.file_type === 'PPTX' && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    💡 <strong>Tip:</strong> Prezentacje PowerPoint są konwertowane na slajdy do wygodnego przeglądania.
                  </p>
                </div>
              )}

              {training.file_type === 'PDF' && (
                <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    📄 <strong>PDF:</strong> Dokument jest podzielony na slajdy z zachowaniem jakości.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Instrukcje */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Jak to działa?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300">
                  1
                </div>
                <p>Każdy slajd ma minimalny czas wyświetlania</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300">
                  2
                </div>
                <p>System śledzi Twoją aktywność i czas</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300">
                  3
                </div>
                <p>Możesz wstrzymać i wznowić w każdej chwili</p>
              </div>
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-300">
                  4
                </div>
                <p>Po ukończeniu otrzymasz certyfikat</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
