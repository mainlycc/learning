'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  User, 
  Calendar, 
  Clock, 
  Award, 
  BookOpen, 
  FileCheck,
  Filter,
} from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'

interface TimelineEvent {
  id: string
  type: 'training_started' | 'training_completed' | 'test_started' | 'test_completed' | 'test_passed' | 'test_failed'
  title: string
  description: string
  date: string
  metadata?: Record<string, unknown>
}

interface UserProfile {
  id: string
  full_name: string | null
  email: string
}

const eventIcons = {
  'training_started': BookOpen,
  'training_completed': Award,
  'test_started': FileCheck,
  'test_completed': FileCheck,
  'test_passed': Award,
  'test_failed': FileCheck
}

const eventColors = {
  'training_started': 'bg-blue-100 text-blue-800',
  'training_completed': 'bg-green-100 text-green-800',
  'test_started': 'bg-purple-100 text-purple-800',
  'test_completed': 'bg-indigo-100 text-indigo-800',
  'test_passed': 'bg-green-100 text-green-800',
  'test_failed': 'bg-red-100 text-red-800'
}

const eventLabels = {
  'training_started': 'Rozpoczęcie szkolenia',
  'training_completed': 'Ukończenie szkolenia',
  'test_started': 'Rozpoczęcie testu',
  'test_completed': 'Ukończenie testu',
  'test_passed': 'Zaliczenie testu',
  'test_failed': 'Niezdanie testu'
}

export function ReportTimeline() {
  const [selectedUser, setSelectedUser] = useState<string>('')
  const [users, setUsers] = useState<UserProfile[]>([])
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const supabase = createClient()

  // Pobierz listę użytkowników
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .order('full_name')

        if (error) throw error
        setUsers(data || [])
      } catch (error) {
        console.error('Błąd pobierania użytkowników:', error)
      }
    }

    loadUsers()
  }, [supabase])

  // Pobierz timeline dla wybranego użytkownika
  const loadTimeline = useCallback(async (userId: string, fromDate?: string, toDate?: string) => {
    if (!userId) return

    setLoading(true)
    try {
      const events: TimelineEvent[] = []

      // Pobierz postępy szkoleń
      let trainingQuery = supabase
        .from('user_training_progress')
        .select(`
          *,
          trainings:training_id (title),
          profiles:user_id (full_name, email)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (fromDate) {
        trainingQuery = trainingQuery.gte('created_at', fromDate)
      }
      if (toDate) {
        trainingQuery = trainingQuery.lte('created_at', toDate)
      }

      const { data: trainingProgress, error: trainingError } = await trainingQuery

      if (trainingError) throw trainingError

      // Dodaj wydarzenia szkoleń
      trainingProgress?.forEach(progress => {
        if (progress.status === 'completed') {
          events.push({
            id: `training_completed_${progress.id}`,
            type: 'training_completed',
            title: `Ukończono szkolenie: ${progress.trainings.title}`,
            description: `Czas spędzony: ${Math.round(progress.total_time_seconds / 60)} minut`,
            date: progress.completed_at || progress.updated_at,
            metadata: {
              training_id: progress.training_id,
              time_spent: progress.total_time_seconds
            }
          })
        } else if (progress.status === 'in_progress') {
          events.push({
            id: `training_started_${progress.id}`,
            type: 'training_started',
            title: `Rozpoczęto szkolenie: ${progress.trainings.title}`,
            description: `Slajd ${progress.current_slide}`,
            date: progress.created_at,
            metadata: {
              training_id: progress.training_id,
              current_slide: progress.current_slide
            }
          })
        }
      })

      // Pobierz próby testów
      let testQuery = supabase
        .from('user_test_attempts')
        .select(`
          *,
          tests:test_id (title),
          profiles:user_id (full_name, email)
        `)
        .eq('user_id', userId)
        .order('started_at', { ascending: false })

      if (fromDate) {
        testQuery = testQuery.gte('started_at', fromDate)
      }
      if (toDate) {
        testQuery = testQuery.lte('started_at', toDate)
      }

      const { data: testAttempts, error: testError } = await testQuery

      if (testError) throw testError

      // Dodaj wydarzenia testów
      testAttempts?.forEach(attempt => {
        if (attempt.completed_at) {
          events.push({
            id: `test_completed_${attempt.id}`,
            type: attempt.passed ? 'test_passed' : 'test_failed',
            title: `${attempt.passed ? 'Zaliczono' : 'Nie zaliczono'} test: ${attempt.tests.title}`,
            description: `Wynik: ${attempt.score}%`,
            date: attempt.completed_at,
            metadata: {
              test_id: attempt.test_id,
              score: attempt.score,
              passed: attempt.passed
            }
          })
        } else {
          events.push({
            id: `test_started_${attempt.id}`,
            type: 'test_started',
            title: `Rozpoczęto test: ${attempt.tests.title}`,
            description: 'Test w toku',
            date: attempt.started_at,
            metadata: {
              test_id: attempt.test_id
            }
          })
        }
      })

      // Sortuj wydarzenia po dacie
      events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

      setTimelineEvents(events)
    } catch (error) {
      console.error('Błąd pobierania timeline:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Załaduj timeline gdy zmieni się użytkownik
  useEffect(() => {
    if (selectedUser) {
      loadTimeline(selectedUser, dateFrom, dateTo)
    }
  }, [selectedUser, dateFrom, dateTo, loadTimeline])

  const handleFilter = () => {
    if (selectedUser) {
      loadTimeline(selectedUser, dateFrom, dateTo)
    }
  }

  const clearFilters = () => {
    setDateFrom('')
    setDateTo('')
    if (selectedUser) {
      loadTimeline(selectedUser)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Activity className="mr-2 h-5 w-5" />
          Timeline użytkownika
        </CardTitle>
        <CardDescription>
          Historia działań wybranego użytkownika
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filtry */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Użytkownik</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz użytkownika" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateFrom">Data od</Label>
            <Input
              id="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateTo">Data do</Label>
            <Input
              id="dateTo"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleFilter}>
                <Filter className="mr-2 h-3 w-3" />
                Filtruj
              </Button>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Wyczyść
              </Button>
            </div>
          </div>
        </div>

        {/* Timeline */}
        {!selectedUser ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Wybierz użytkownika, aby zobaczyć jego timeline</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
            <p className="text-muted-foreground">Ładowanie timeline...</p>
          </div>
        ) : timelineEvents.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Brak wydarzeń w wybranym okresie</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground mb-4">
              Znaleziono {timelineEvents.length} wydarzeń
            </div>
            
            <div className="relative">
              {/* Linia czasu */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
              
              <div className="space-y-6">
                {timelineEvents.map((event) => {
                  const IconComponent = eventIcons[event.type]
                  
                  return (
                    <div key={event.id} className="relative flex items-start">
                      {/* Ikona wydarzenia */}
                      <div className="relative z-10 flex items-center justify-center w-8 h-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-full">
                        <IconComponent className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      
                      {/* Treść wydarzenia */}
                      <div className="ml-4 flex-1">
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{event.title}</h4>
                                <Badge 
                                  variant="outline" 
                                  className={eventColors[event.type]}
                                >
                                  {eventLabels[event.type]}
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-2">
                                {event.description}
                              </p>
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(event.date), 'dd.MM.yyyy HH:mm', { locale: pl })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(event.date), { addSuffix: true, locale: pl })}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {event.metadata && (
                            <details className="mt-3">
                              <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                                Szczegóły
                              </summary>
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs">
                                <pre>{JSON.stringify(event.metadata, null, 2)}</pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
