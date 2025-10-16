import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { BookOpen, Clock, CheckCircle, Users } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Pobierz statystyki użytkownika
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Jeśli nie ma profilu, utwórz domyślny
  const userProfile = profile || {
    id: user.id,
    email: user.email || '',
    full_name: user.user_metadata?.full_name || null,
    role: 'user' as const
  }

  const { data: progress } = await supabase
    .from('user_training_progress')
    .select(`
      *,
      trainings (
        title,
        duration_minutes
      )
    `)
    .eq('user_id', user.id)

  const completedTrainings = progress?.filter(p => p.status === 'completed').length || 0
  const inProgressTrainings = progress?.filter(p => p.status === 'in_progress').length || 0
  const totalTimeSpent = progress?.reduce((sum, p) => sum + (p.total_time_seconds || 0), 0) || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Witaj, {userProfile?.full_name || user.email}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Oto podsumowanie Twoich postępów w szkoleniach
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ukończone szkolenia
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTrainings}</div>
            <p className="text-xs text-muted-foreground">
              Szkoleń zakończonych pomyślnie
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Szkolenia w toku
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressTrainings}</div>
            <p className="text-xs text-muted-foreground">
              Szkoleń w trakcie realizacji
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Czas nauki
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor(totalTimeSpent / 3600)}h {Math.floor((totalTimeSpent % 3600) / 60)}m
            </div>
            <p className="text-xs text-muted-foreground">
              Łączny czas spędzony na nauce
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rola użytkownika
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={
                userProfile?.role === 'super_admin' ? 'destructive' :
                userProfile?.role === 'admin' ? 'default' : 'secondary'
              }>
                {userProfile?.role === 'super_admin' ? 'Super Admin' :
                 userProfile?.role === 'admin' ? 'Admin' : 'Użytkownik'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Poziom uprawnień
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ostatnie szkolenia</CardTitle>
            <CardDescription>
              Twoje najnowsze aktywności
            </CardDescription>
          </CardHeader>
          <CardContent>
            {progress && progress.length > 0 ? (
              <div className="space-y-4">
                {progress.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {item.trainings?.title || 'Bez tytułu'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Slajd {item.current_slide} z {item.trainings?.duration_minutes || 0} minut
                      </p>
                    </div>
                    <Badge variant={
                      item.status === 'completed' ? 'default' :
                      item.status === 'in_progress' ? 'secondary' : 'outline'
                    }>
                      {item.status === 'completed' ? 'Ukończone' :
                       item.status === 'in_progress' ? 'W toku' : 'Wstrzymane'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">
                Brak szkoleń w historii
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Postęp ogólny</CardTitle>
            <CardDescription>
              Statystyki ukończenia szkoleń
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Ukończone szkolenia</span>
                  <span>{completedTrainings}</span>
                </div>
                <Progress 
                  value={completedTrainings > 0 ? 100 : 0} 
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Szkolenia w toku</span>
                  <span>{inProgressTrainings}</span>
                </div>
                <Progress 
                  value={inProgressTrainings > 0 ? 50 : 0} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
