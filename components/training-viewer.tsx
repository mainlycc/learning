'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import dynamic from 'next/dynamic'
import type { DocViewerProps } from '@cyntler/react-doc-viewer'
import '@cyntler/react-doc-viewer/dist/index.css'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Pause, 
  Clock, 
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Shield,
  Eye,
  Lock,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { PptxRenderer, PPTX_RENDERER_FILE_TYPES } from '@/components/doc-renderers/PptxRenderer'
import JSZip from 'jszip'

const DocViewerLazy = dynamic(
  async () => {
    const mod = await import('@cyntler/react-doc-viewer')
    const pluginRenderers = [
      PptxRenderer,
      ...mod.DocViewerRenderers.filter((renderer) =>
        !renderer.fileTypes?.some((type) => PPTX_RENDERER_FILE_TYPES.includes(type))
      )
    ]
    const DocViewerComponent = (props: DocViewerProps) => (
      <mod.default
        {...props}
        pluginRenderers={pluginRenderers}
        style={{ width: '100%', height: '100%' }}
      />
    )
    DocViewerComponent.displayName = 'DocViewerLazy'
    return DocViewerComponent
  },
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Ładowanie podglądu dokumentu...
      </div>
    )
  }
)

interface TrainingSlide {
  id: string
  slide_number: number
  image_url: string
  min_time_seconds: number
}

interface Training {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  slides_count: number
  file_type: 'PDF' | 'PPTX'
  file_path: string
}

interface UserProgress {
  id: string
  current_slide: number
  total_time_seconds: number
  status: 'in_progress' | 'completed' | 'paused'
}

interface AccessPolicy {
  id: string
  training_id: string
  policy_type: 'full' | 'preview' | 'time_limited'
  time_limit_days: number | null
}

interface TrainingViewerProps {
  training: Training
  slides: TrainingSlide[]
  userProgress?: UserProgress
  accessPolicy?: AccessPolicy
}

export function TrainingViewer({ training, slides, userProgress, accessPolicy }: TrainingViewerProps) {
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0)
  const [timeOnSlide, setTimeOnSlide] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [slideActivity, setSlideActivity] = useState<{ [key: string]: number }>({})
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const [fileDocs, setFileDocs] = useState<DocViewerProps['documents']>([])
  const [fileStatus, setFileStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [fileError, setFileError] = useState<string | null>(null)
  const [signedUrlExpiresAt, setSignedUrlExpiresAt] = useState<number | null>(null)
  const [pptxSlideCount, setPptxSlideCount] = useState<number | null>(null)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  
  const supabase = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const progressIdRef = useRef<string | null>(userProgress?.id || null)

  const currentSlide = slides[currentSlideIndex]
  const canProceed = !isPaused
  const totalTimeSpentSeconds = useMemo(
    () => Object.values(slideActivity).reduce((sum, time) => sum + time, 0),
    [slideActivity]
  )
  const totalTrainingSeconds = training.duration_minutes * 60
  const remainingTrainingSeconds = Math.max(totalTrainingSeconds - totalTimeSpentSeconds, 0)
  const remainingTimePercentage = totalTrainingSeconds
    ? (remainingTrainingSeconds / totalTrainingSeconds) * 100
    : 0
  const totalSlidesCount = useMemo(() => {
    const metadataCount = training.slides_count ?? 0
    const preloadedCount = slides.length

    if (training.file_type === 'PPTX') {
      return pptxSlideCount ?? Math.max(metadataCount, preloadedCount)
    }

    return preloadedCount || metadataCount
  }, [slides.length, training.file_type, training.slides_count, pptxSlideCount])

  // Zapisz postęp do bazy danych
  const saveProgress = useCallback(async () => {
    if (!progressIdRef.current) {
      // Utwórz nowy postęp
      const { data: newProgress } = await supabase
        .from('user_training_progress')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          training_id: training.id,
          current_slide: currentSlideIndex + 1,
          total_time_seconds: Object.values(slideActivity).reduce((sum, time) => sum + time, 0),
          status: isCompleted ? 'completed' : 'in_progress'
        })
        .select()
        .single()

      if (newProgress) {
        progressIdRef.current = newProgress.id
      }
    } else {
      // Aktualizuj istniejący postęp
      await supabase
        .from('user_training_progress')
        .update({
          current_slide: currentSlideIndex + 1,
          total_time_seconds: Object.values(slideActivity).reduce((sum, time) => sum + time, 0),
          status: isCompleted ? 'completed' : 'in_progress',
          completed_at: isCompleted ? new Date().toISOString() : null
        })
        .eq('id', progressIdRef.current)
    }
  }, [currentSlideIndex, slideActivity, isCompleted, training.id, supabase])

  // Zapisz aktywność na slajdzie
  const saveSlideActivity = useCallback(async (slideId: string, timeSpent: number) => {
    if (!progressIdRef.current) return

    await supabase
      .from('user_slide_activity')
      .upsert({
        progress_id: progressIdRef.current,
        slide_id: slideId,
        time_spent_seconds: timeSpent,
        interactions_count: 1, // Można to rozszerzyć o liczenie interakcji
        last_activity_at: new Date().toISOString()
      })
  }, [supabase])

  // Timer dla czasu na slajdzie
  useEffect(() => {
    if (!isPaused && !isCompleted) {
      timerRef.current = setInterval(() => {
        setTimeOnSlide(prev => prev + 1)
        setSlideActivity(prev => ({
          ...prev,
          [currentSlide.id]: (prev[currentSlide.id] || 0) + 1
        }))
      }, 1000)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [isPaused, isCompleted, currentSlide.id])

  // Timer dla ostrzeżenia o bezczynności
  useEffect(() => {
    if (!isPaused && !isCompleted) {
      inactivityTimerRef.current = setInterval(() => {
        const now = Date.now()
        if (now - lastActivityRef.current > 30000) { // 30 sekund bezczynności
          setShowInactivityWarning(true)
        }
      }, 1000)
    }

    return () => {
      if (inactivityTimerRef.current) {
        clearInterval(inactivityTimerRef.current)
      }
    }
  }, [isPaused, isCompleted])

  // Detekcja aktywności użytkownika
  const handleUserActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowInactivityWarning(false)
  }, [])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart']
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, true)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity, true)
      })
    }
  }, [handleUserActivity])

  // Zapisz postęp przy zmianie slajdu
  useEffect(() => {
    if (currentSlideIndex > 0) {
      const previousSlide = slides[currentSlideIndex - 1]
      if (previousSlide && slideActivity[previousSlide.id]) {
        saveSlideActivity(previousSlide.id, slideActivity[previousSlide.id])
      }
    }
    saveProgress()
  }, [currentSlideIndex, saveProgress, saveSlideActivity, slideActivity, slides])

  // Inicjalizacja z postępem użytkownika
  useEffect(() => {
    if (userProgress && userProgress.current_slide > 1) {
      setCurrentSlideIndex(userProgress.current_slide - 1)
      setTimeOnSlide(0)
    }
  }, [userProgress])

  const handlePrevious = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1)
      setTimeOnSlide(0)
      setSlideActivity(prev => ({ ...prev, [currentSlide.id]: 0 }))
    }
  }

  const handleNext = () => {
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1)
      setTimeOnSlide(0)
      setSlideActivity(prev => ({ ...prev, [currentSlide.id]: 0 }))
    } else {
      // Ukończ szkolenie
      setIsCompleted(true)
      saveProgress()
    }
  }

  const handlePause = () => {
    setIsPaused(!isPaused)
  }

  const handleCompleteTraining = async () => {
    setIsCompleting(true)
    try {
      setIsCompleted(true)
      setIsPaused(true) // Zatrzymaj timer

      // Zapisz postęp jako ukończony
      const totalTime = Object.values(slideActivity).reduce((sum, time) => sum + time, 0)
      
      if (!progressIdRef.current) {
        // Utwórz nowy postęp
        const user = (await supabase.auth.getUser()).data.user
        if (!user) {
          throw new Error('Brak sesji użytkownika')
        }

        const { data: newProgress } = await supabase
          .from('user_training_progress')
          .insert({
            user_id: user.id,
            training_id: training.id,
            current_slide: totalSlidesCount,
            total_time_seconds: totalTime,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .select()
          .single()

        if (newProgress) {
          progressIdRef.current = newProgress.id
        }
      } else {
        // Aktualizuj istniejący postęp
        await supabase
          .from('user_training_progress')
          .update({
            current_slide: totalSlidesCount,
            total_time_seconds: totalTime,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', progressIdRef.current)
      }

      setShowCompleteDialog(false)
      
      // Przekieruj do strony szkolenia po zakończeniu
      setTimeout(() => {
        window.location.href = `/dashboard/trainings/${training.id}`
      }, 2000)
    } catch (error) {
      console.error('Błąd podczas kończenia szkolenia:', error)
      setIsCompleted(false)
      setIsPaused(false)
    } finally {
      setIsCompleting(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const shouldShowFileViewer = (training.file_type === 'PPTX' || training.file_type === 'PDF') && Boolean(training.file_path)
  const canRefreshSignedUrl = shouldShowFileViewer && fileStatus !== 'loading'

  const docViewerConfig = useMemo<DocViewerProps['config']>(() => ({
    header: {
      disableHeader: true,
      disableFileName: true,
      retainURLParams: true
    },
    enableDownload: false,
    pdfVerticalScrollByDefault: true,
    textSelection: true
  }), [])

  const extractPptxSlideCount = useCallback(async (signedUrl: string) => {
    try {
      const response = await fetch(signedUrl)
      if (!response.ok) {
        throw new Error('Nie udało się pobrać pliku PPTX.')
      }

      const arrayBuffer = await response.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      )

      setPptxSlideCount(slideFiles.length || null)
    } catch (error) {
      console.error('Błąd liczenia slajdów PPTX:', error)
      setPptxSlideCount(null)
    }
  }, [])

  const refreshSignedUrl = useCallback(async () => {
    if (!shouldShowFileViewer) return
    setFileStatus('loading')
    setFileError(null)

    try {
      const { data, error } = await supabase.storage
        .from('trainings')
        .createSignedUrl(training.file_path, 60 * 60) // 1h

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || 'Nie udało się wygenerować adresu podglądu.')
      }

      const fileType = training.file_type === 'PDF' ? 'pdf' : 'pptx'
      setFileDocs([
        {
          uri: data.signedUrl,
          fileType: fileType,
          fileName: training.title
        }
      ])
      setSignedUrlExpiresAt(Date.now() + 60 * 60 * 1000)
      setFileStatus('ready')
      
      // Dla PPTX liczymy slajdy, dla PDF nie ma potrzeby
      if (training.file_type === 'PPTX') {
        await extractPptxSlideCount(data.signedUrl)
      }
    } catch (err) {
      console.error(err)
      setSignedUrlExpiresAt(null)
      const fileTypeName = training.file_type === 'PDF' ? 'PDF' : 'PPTX'
      setFileError(err instanceof Error ? err.message : `Nieznany błąd podglądu ${fileTypeName}.`)
      setFileStatus('error')
    }
  }, [shouldShowFileViewer, supabase, training.file_path, training.title, training.file_type, extractPptxSlideCount])

  useEffect(() => {
    if (shouldShowFileViewer) {
      refreshSignedUrl()
    } else {
      setFileDocs([])
      setFileStatus('idle')
      setFileError(null)
      setSignedUrlExpiresAt(null)
      setPptxSlideCount(null)
    }
  }, [shouldShowFileViewer, refreshSignedUrl])

  useEffect(() => {
    if (!signedUrlExpiresAt) return

    const timeout = setTimeout(() => {
      refreshSignedUrl()
    }, Math.max(signedUrlExpiresAt - Date.now() - 60_000, 30_000))

    return () => clearTimeout(timeout)
  }, [signedUrlExpiresAt, refreshSignedUrl])

  if (!currentSlide) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Błąd ładowania</h3>
          <p className="text-muted-foreground text-center">
            Nie można załadować slajdów szkolenia.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard/trainings">Powrót do listy</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/dashboard/trainings/${training.id}`}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Powrót
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{training.title}</h1>
                <p className="text-sm text-muted-foreground">
                  Slajd {currentSlideIndex + 1} z {totalSlidesCount}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Pozostały czas</p>
                <p className="text-sm font-semibold">{formatTime(remainingTrainingSeconds)}</p>
              </div>
              <Badge variant={isCompleted ? 'default' : isPaused ? 'secondary' : 'outline'}>
                {isCompleted ? 'Ukończone' : isPaused ? 'Wstrzymane' : 'W toku'}
              </Badge>
              {!isCompleted && (
                <>
                  <Button variant="outline" size="sm" onClick={handlePause}>
                    {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={() => setShowCompleteDialog(true)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Zakończ kurs
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Remaining time bar */}
          <div className="pb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Pozostały czas szkolenia</span>
              <span>{formatTime(remainingTrainingSeconds)}</span>
            </div>
            <Progress value={remainingTimePercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Slide viewer */}
        <div
          className="min-h-[calc(100vh-220px)]"
          style={{ height: 'calc(100vh - 220px)' }}
        >
          <Card className="h-full">
            <CardContent className="p-0 h-full">
                {shouldShowFileViewer ? (
                  <div className="relative h-full min-h-[70vh] bg-gray-100 dark:bg-gray-900 overflow-auto">
                    {fileStatus === 'loading' && (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Ładowanie pliku {training.file_type}...
                      </div>
                    )}

                    {fileStatus === 'error' && (
                      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Nie udało się wyświetlić pliku {training.file_type}.</p>
                          <p className="text-sm text-muted-foreground">{fileError}</p>
                        </div>
                        <Button variant="outline" onClick={refreshSignedUrl}>
                          Spróbuj ponownie
                        </Button>
                      </div>
                    )}

                    {fileStatus === 'ready' && fileDocs.length > 0 && (
                      <DocViewerLazy
                        documents={fileDocs}
                        config={docViewerConfig}
                        style={{ width: '100%', height: '100%' }}
                      />
                    )}

                    {fileStatus === 'ready' && fileDocs.length === 0 && (
                      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                        Brak danych do wyświetlenia.
                      </div>
                    )}

                    <div className="absolute right-4 top-4 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs uppercase">
                        {training.file_type}
                      </Badge>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={refreshSignedUrl}
                        disabled={!canRefreshSignedUrl}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={currentSlide.image_url}
                      alt={`Slajd ${currentSlide.slide_number}`}
                      fill
                      className="object-contain"
                      priority
                    />
                  </div>
                )}
            </CardContent>
          </Card>
        </div>

        {/* Panels below viewer */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Czas na slajdzie
              </h3>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatTime(timeOnSlide)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <h3 className="font-semibold">Informacje</h3>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Typ pliku:</span>
                <Badge variant="outline" className="text-xs">{training.file_type}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Czas trwania:</span>
                <span>{training.duration_minutes} min</span>
              </div>
              <div className="flex justify-between">
                <span>Slajdy:</span>
                <span>{totalSlidesCount}</span>
              </div>
              {accessPolicy && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-3 w-3" />
                    <span className="font-medium">Polityka dostępu:</span>
                  </div>
                  <div className="space-y-1">
                    {accessPolicy.policy_type === 'preview' && (
                      <Badge variant="secondary" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Tylko podgląd (pierwsze {totalSlidesCount} slajdów)
                      </Badge>
                    )}
                    {accessPolicy.policy_type === 'time_limited' && (
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Dostęp czasowy ({accessPolicy.time_limit_days} dni)
                      </Badge>
                    )}
                    {accessPolicy.policy_type === 'full' && (
                      <Badge variant="outline" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        Pełny dostęp
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Inactivity warning */}
      {showInactivityWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md mx-4">
            <CardHeader>
              <h3 className="font-semibold flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                Ostrzeżenie o bezczynności
              </h3>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Nie wykryto aktywności przez 30 sekund. Szkolenie zostanie wstrzymane za chwilę.
              </p>
              <div className="flex space-x-2">
                <Button onClick={handleUserActivity} className="flex-1">
                  Kontynuuj naukę
                </Button>
                <Button variant="outline" onClick={handlePause} className="flex-1">
                  Wstrzymaj
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Complete training dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Zakończyć kurs?</DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz zakończyć kurs &quot;{training.title}&quot;? 
              Po zakończeniu kurs zostanie oznaczony jako ukończony i zostaniesz przekierowany do strony szkolenia.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCompleteDialog(false)}
              disabled={isCompleting}
            >
              Anuluj
            </Button>
            <Button
              onClick={handleCompleteTraining}
              disabled={isCompleting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCompleting ? 'Zapisywanie...' : 'Tak, zakończ kurs'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
