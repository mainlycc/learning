import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, Play, CheckCircle, ArrowLeft, RefreshCw, FileQuestion } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import JSZip from 'jszip'

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

  // Sprawdź czy użytkownik jest adminem
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

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
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Brak dostępu
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Nie masz dostępu do tego szkolenia. To szkolenie jest dostępne tylko dla przypisanych użytkowników.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Skontaktuj się z administratorem, aby uzyskać dostęp.
                </p>
                <div className="mt-6">
                  <Button asChild>
                    <Link href="/dashboard/trainings">
                      Powrót do listy szkoleń
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      }
    }
    // Jeśli kurs nie ma przypisanych użytkowników, dostęp dla wszystkich (zgodnie z RLS)
  }

  // Pobierz postęp użytkownika
  const { data: userProgress } = await supabase
    .from('user_training_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('training_id', id)
    .single()

  // Pobierz slajdy szkolenia
  const { data: slides } = await supabase
    .from('training_slides')
    .select('id, slide_number')
    .eq('training_id', id)
    .order('slide_number', { ascending: true })

  let slideCount = slides?.length ?? training.slides_count ?? 0

  if (slideCount === 0 && training.file_type === 'PPTX' && training.file_path) {
    const { data: signedUrlData } = await supabase.storage
      .from('trainings')
      .createSignedUrl(training.file_path, 60)

    if (signedUrlData?.signedUrl) {
      try {
        const response = await fetch(signedUrlData.signedUrl)
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer()
          const zip = await JSZip.loadAsync(arrayBuffer)
          const slideFiles = Object.keys(zip.files).filter(
            (name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
          )
          slideCount = slideFiles.length || slideCount
        }
      } catch (error) {
        console.error('Nie udało się policzyć slajdów PPTX:', error)
      }
    }
  }

  const isCompleted = userProgress?.status === 'completed'
  const isInProgress = userProgress?.status === 'in_progress'
  const progressPercentage = isCompleted
    ? 100
    : userProgress && slideCount > 0
      ? Math.min(Math.round((userProgress.current_slide / slideCount) * 100), 100)
      : 0

  const remainingSlides = userProgress && slideCount > 0
    ? Math.max(slideCount - userProgress.current_slide, 0)
    : null

  // Sprawdź czy istnieje test dla tego szkolenia
  const { data: test } = await supabase
    .from('tests')
    .select('id, title')
    .eq('training_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

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
                    <p className="text-sm text-muted-foreground">
                      {slideCount > 0 ? `${slideCount} slajdów` : 'Brak danych o slajdach'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Postęp użytkownika */}
              {userProgress ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Twój postęp</span>
                    <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {isCompleted
                        ? 'Ukończone'
                        : slideCount > 0
                          ? `Slajd ${Math.min(userProgress.current_slide, slideCount)} z ${slideCount}`
                          : `Rozpoczęte – brak danych o slajdach`}
                    </span>
                    <span>
                      {isCompleted
                        ? ''
                        : slideCount > 0
                          ? `Pozostało: ${remainingSlides} ${remainingSlides === 1 ? 'slajd' : 'slajdów'}`
                          : null}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Jeszcze nie rozpocząłeś tego szkolenia.
                </p>
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
                {test && (
                  <Button asChild size="lg" variant="outline">
                    <Link href={`/dashboard/trainings/${training.id}/test`}>
                      <FileQuestion className="mr-2 h-4 w-4" />
                      Test
                    </Link>
                  </Button>
                )}
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

              <div className="p-3 rounded-lg border border-dashed text-sm space-y-1">
                <p className="font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Status materiałów
                </p>
                {slideCount > 0 ? (
                  <p className="text-muted-foreground">
                    Dostępnych slajdów: <strong>{slideCount}</strong>. Plik źródłowy typu {training.file_type}
                    {' '}
                    {training.file_type === 'PPTX' ? 'jest renderowany w Office Viewer.' : 'jest konwertowany do podglądu.'}
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Jeszcze nie wgrano slajdów dla tego szkolenia. Sprawdź podgląd, aby wygenerować je ponownie.
                  </p>
                )}
              </div>

              {test && (
                <div className="p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 text-sm">
                  <p className="font-medium flex items-center gap-2 mb-1">
                    <FileQuestion className="h-4 w-4" />
                    Test dostępny
                  </p>
                  <p className="text-muted-foreground mb-2">
                    Dla tego szkolenia dostępny jest test: <strong>{test.title}</strong>
                  </p>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/trainings/${training.id}/test`}>
                      Przejdź do testu
                    </Link>
                  </Button>
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
