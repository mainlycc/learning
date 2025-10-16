'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  Lock
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

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
  
  const supabase = createClient()
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const progressIdRef = useRef<string | null>(userProgress?.id || null)

  const currentSlide = slides[currentSlideIndex]
  const minTimeReached = timeOnSlide >= currentSlide?.min_time_seconds
  const canProceed = minTimeReached && !isPaused
  const progressPercentage = Math.round(((currentSlideIndex + 1) / slides.length) * 100)

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
      setTimeOnSlide(currentSlide?.min_time_seconds || 0)
    }
  }, [userProgress, currentSlide])

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

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
                  Slajd {currentSlideIndex + 1} z {slides.length}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge variant={isCompleted ? 'default' : isPaused ? 'secondary' : 'outline'}>
                {isCompleted ? 'Ukończone' : isPaused ? 'Wstrzymane' : 'W toku'}
              </Badge>
              <Button variant="outline" size="sm" onClick={handlePause}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="pb-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>Postęp szkolenia</span>
              <span>{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-4">
          {/* Slide viewer */}
          <div className="lg:col-span-3">
            <Card>
              <CardContent className="p-0">
                <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={currentSlide.image_url}
                    alt={`Slajd ${currentSlide.slide_number}`}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Side panel */}
          <div className="space-y-6">
            {/* Timer */}
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
                <div className="text-sm text-muted-foreground">
                  Minimalny czas: {formatTime(currentSlide.min_time_seconds)}
                </div>
                {!minTimeReached && (
                  <div className="mt-2">
                    <Progress 
                      value={(timeOnSlide / currentSlide.min_time_seconds) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Poczekaj jeszcze {currentSlide.min_time_seconds - timeOnSlide}s
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card>
              <CardHeader className="pb-3">
                <h3 className="font-semibold">Nawigacja</h3>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrevious}
                    disabled={currentSlideIndex === 0}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Poprzedni
                  </Button>
                  <Button 
                    onClick={handleNext}
                    disabled={!canProceed}
                    className="flex-1"
                  >
                    {currentSlideIndex === slides.length - 1 ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Zakończ
                      </>
                    ) : (
                      <>
                        Następny
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="text-xs text-muted-foreground">
                  {!canProceed && !minTimeReached && (
                    <p>⏱️ Poczekaj na minimalny czas</p>
                  )}
                  {!canProceed && isPaused && (
                    <p>⏸️ Szkolenie jest wstrzymane</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Training info */}
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
                  <span>{training.slides_count}</span>
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
                          Tylko podgląd (pierwsze {slides.length} slajdów)
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
    </div>
  )
}
