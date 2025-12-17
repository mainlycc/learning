import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Shield, Download, Filter, Search, Calendar, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDistanceToNow, format } from 'date-fns'
import { pl } from 'date-fns/locale'
import Link from 'next/link'

interface AuditLog {
  id: string
  user_id: string
  action_type: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles: {
    full_name: string | null
    email: string
  } | null
}

interface AuditStats {
  today: number
  week: number
  month: number
}

const actionTypeLabels: Record<string, string> = {
  'training_started': 'Rozpoczęcie szkolenia',
  'training_completed': 'Ukończenie szkolenia',
  'training_paused': 'Wstrzymanie szkolenia',
  'test_started': 'Rozpoczęcie testu',
  'test_completed': 'Ukończenie testu',
  'test_passed': 'Zaliczenie testu',
  'test_failed': 'Niezdanie testu',
  'login': 'Logowanie',
  'logout': 'Wylogowanie',
  'profile_updated': 'Aktualizacja profilu',
  'training_created': 'Utworzenie szkolenia',
  'training_updated': 'Aktualizacja szkolenia',
  'training_deleted': 'Usunięcie szkolenia',
  'user_created': 'Utworzenie użytkownika',
  'user_updated': 'Aktualizacja użytkownika',
  'user_deleted': 'Usunięcie użytkownika'
}

const actionTypeColors: Record<string, string> = {
  'training_started': 'bg-blue-100 text-blue-800',
  'training_completed': 'bg-green-100 text-green-800',
  'training_paused': 'bg-yellow-100 text-yellow-800',
  'test_started': 'bg-purple-100 text-purple-800',
  'test_completed': 'bg-indigo-100 text-indigo-800',
  'test_passed': 'bg-green-100 text-green-800',
  'test_failed': 'bg-red-100 text-red-800',
  'login': 'bg-blue-100 text-blue-800',
  'logout': 'bg-gray-100 text-gray-800',
  'profile_updated': 'bg-orange-100 text-orange-800',
  'training_created': 'bg-emerald-100 text-emerald-800',
  'training_updated': 'bg-amber-100 text-amber-800',
  'training_deleted': 'bg-red-100 text-red-800',
  'user_created': 'bg-green-100 text-green-800',
  'user_updated': 'bg-blue-100 text-blue-800',
  'user_deleted': 'bg-red-100 text-red-800'
}

const resourceTypeLabels: Record<string, string> = {
  'training': 'Szkolenie',
  'test': 'Test',
  'user': 'Użytkownik',
  'profile': 'Profil',
  'system': 'System'
}

async function getAuditLogs(
  page: number = 1,
  limit: number = 50,
  filters?: {
    action_type?: string
    resource_type?: string
    user_id?: string
    search?: string
  }
): Promise<{ logs: AuditLog[], total: number }> {
  const supabase = await createClient()
  
  let query = supabase
    .from('audit_logs')
    .select(`
      *,
      profiles:user_id (
        full_name,
        email
      )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Zastosuj filtry
  if (filters?.action_type && filters.action_type !== 'all') {
    query = query.eq('action_type', filters.action_type)
  }
  if (filters?.resource_type && filters.resource_type !== 'all') {
    query = query.eq('resource_type', filters.resource_type)
  }
  if (filters?.user_id && filters.user_id !== 'all') {
    query = query.eq('user_id', filters.user_id)
  }
  if (filters?.search) {
    query = query.or(`action_type.ilike.%${filters.search}%,resource_type.ilike.%${filters.search}%,metadata::text.ilike.%${filters.search}%`)
  }

  // Paginacja
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Błąd pobierania logów audytowych:', error)
    return { logs: [], total: 0 }
  }

  return {
    logs: data as AuditLog[],
    total: count || 0
  }
}

async function getAuditStats(): Promise<AuditStats> {
  const supabase = await createClient()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

  const [todayResult, weekResult, monthResult] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', today.toISOString()),
    supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString()),
    supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString())
  ])

  return {
    today: todayResult.count || 0,
    week: weekResult.count || 0,
    month: monthResult.count || 0
  }
}

async function getUsers(): Promise<{ id: string, full_name: string | null, email: string }[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .order('full_name')

  if (error) {
    console.error('Błąd pobierania użytkowników:', error)
    return []
  }

  return data
}

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  const page = parseInt(params.page as string) || 1
  const actionType = params.action_type as string
  const resourceType = params.resource_type as string
  const userId = params.user_id as string
  const search = params.search as string

  const [logsResult, stats, users] = await Promise.all([
    getAuditLogs(page, 50, { action_type: actionType, resource_type: resourceType, user_id: userId, search }),
    getAuditStats(),
    getUsers()
  ])

  const totalPages = Math.ceil(logsResult.total / 50)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Logi audytowe
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitoruj wszystkie działania w systemie
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Eksportuj logi
        </Button>
      </div>

      {/* Statystyki */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Dziś
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.today}</div>
            <p className="text-xs text-muted-foreground">
              Akcji dzisiaj
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ten tydzień
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.week}</div>
            <p className="text-xs text-muted-foreground">
              Akcji w tym tygodniu
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Ten miesiąc
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.month}</div>
            <p className="text-xs text-muted-foreground">
              Akcji w tym miesiącu
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtry */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtry i wyszukiwanie
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Typ akcji</label>
              <Select defaultValue={actionType || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie typy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie typy</SelectItem>
                  {Object.entries(actionTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Typ zasobu</label>
              <Select defaultValue={resourceType || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszystkie zasoby" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszystkie zasoby</SelectItem>
                  {Object.entries(resourceTypeLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Użytkownik</label>
              <Select defaultValue={userId || "all"}>
                <SelectTrigger>
                  <SelectValue placeholder="Wszyscy użytkownicy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Wyszukaj</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Szukaj w logach..."
                  className="pl-10"
                  defaultValue={search}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista logów */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historia działań</CardTitle>
              <CardDescription>
                {logsResult.total} zarejestrowanych akcji
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsResult.logs.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Brak logów audytowych
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Logi będą pojawiać się tutaj po rozpoczęciu używania systemu
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logsResult.logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className={actionTypeColors[log.action_type] || 'bg-gray-100 text-gray-800'}
                        >
                          {actionTypeLabels[log.action_type] || log.action_type}
                        </Badge>
                        <Badge variant="secondary">
                          {resourceTypeLabels[log.resource_type] || log.resource_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-3 w-3" />
                        <span>{log.profiles?.full_name || log.profiles?.email || 'Nieznany użytkownik'}</span>
                        <Calendar className="h-3 w-3" />
                        <span>
                          {format(new Date(log.created_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                        </span>
                        <span className="text-xs">
                          ({formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: pl })})
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <details className="text-sm">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Szczegóły
                      </summary>
                      <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                        <pre className="text-xs whitespace-pre-wrap">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    </details>
                  )}
                </div>
              ))}

              {/* Paginacja */}
              {totalPages > 1 && (
                <div className="flex justify-center space-x-2 pt-4">
                  <Button 
                    variant="outline" 
                    disabled={page === 1}
                    asChild
                  >
                    <Link href={`?${new URLSearchParams({ 
                      ...params, 
                      page: (page - 1).toString() 
                    })}`}>
                      Poprzednia
                    </Link>
                  </Button>
                  
                  <span className="flex items-center px-3 py-2 text-sm">
                    Strona {page} z {totalPages}
                  </span>
                  
                  <Button 
                    variant="outline" 
                    disabled={page === totalPages}
                    asChild
                  >
                    <Link href={`?${new URLSearchParams({ 
                      ...params, 
                      page: (page + 1).toString() 
                    })}`}>
                      Następna
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
