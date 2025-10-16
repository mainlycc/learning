import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3, Calendar, Users } from 'lucide-react'
import { MonthlyReportGenerator } from '@/components/reports/MonthlyReportGenerator'
import { ReportTimeline } from '@/components/reports/ReportTimeline'
import { DataExporter } from '@/components/reports/DataExporter'

interface UserProgress {
  id: string
  user_id: string
  training_id: string
  current_slide: number
  total_time_seconds: number
  completed_at: string | null
  status: string
  profiles: {
    full_name: string | null
    email: string
  }
  trainings: {
    title: string
  }
}

interface TestAttempt {
  id: string
  user_id: string
  test_id: string
  started_at: string
  completed_at: string | null
  score: number
  passed: boolean
  profiles: {
    full_name: string | null
    email: string
  }
  tests: {
    title: string
  }
}

async function getUserProgressData() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_training_progress')
    .select(`
      *,
      profiles:user_id (full_name, email),
      trainings:training_id (title)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Błąd pobierania postępów:', error)
    return []
  }

  return data as UserProgress[]
}

async function getTestAttemptsData() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('user_test_attempts')
    .select(`
      *,
      profiles:user_id (full_name, email),
      tests:test_id (title)
    `)
    .order('started_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Błąd pobierania prób testów:', error)
    return []
  }

  return data as TestAttempt[]
}

export default async function ReportsPage() {
  const [userProgress, testAttempts] = await Promise.all([
    getUserProgressData(),
    getTestAttemptsData()
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Raporty
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Generuj i eksportuj raporty z postępów szkoleń
        </p>
      </div>

      {/* Krótki przegląd */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ukończone szkolenia
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userProgress.filter(p => p.status === 'completed').length}
            </div>
            <p className="text-xs text-muted-foreground">
              z {userProgress.length} rozpoczętych
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Zaliczone testy
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {testAttempts.filter(t => t.passed).length}
            </div>
            <p className="text-xs text-muted-foreground">
              z {testAttempts.length} prób
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktywni użytkownicy
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set([...userProgress, ...testAttempts].map(item => item.profiles.email)).size}
            </div>
            <p className="text-xs text-muted-foreground">
              w systemie
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Komponenty raportów */}
      <div className="space-y-6">
        <MonthlyReportGenerator />
        
        <ReportTimeline />
        
        <DataExporter 
          userProgress={userProgress}
          testAttempts={testAttempts}
        />
      </div>
    </div>
  )
}
