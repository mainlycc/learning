import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditTrainingDialog } from '@/components/admin/EditTrainingDialog'
import { DeleteTrainingDialog } from '@/components/admin/DeleteTrainingDialog'
import { toggleTrainingStatus } from './actions'
import { Power, PowerOff, Plus, BarChart3 } from 'lucide-react'
import Link from 'next/link'


export default async function TrainingsManagePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const isAdmin = role === 'admin' || role === 'super_admin'

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brak uprawnień</CardTitle>
          <CardDescription>Ta sekcja jest dostępna tylko dla administratorów.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  // Lista istniejących szkoleń (pełne dane do edycji)
  const { data: trainings } = await supabase
    .from('trainings')
    .select('id, title, description, file_type, duration_minutes, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zarządzanie szkoleniami</h1>
          <p className="text-muted-foreground">Dodawaj, edytuj i zarządzaj szkoleniami oraz testami.</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/trainings/manage/new">
            <Plus className="h-4 w-4 mr-2" />
            Dodaj szkolenie
          </Link>
        </Button>
      </div>

      {/* Tabela szkoleń */}
      <Card>
        <CardHeader>
          <CardTitle>Szkolenia</CardTitle>
          <CardDescription>Przeglądaj, edytuj i zarządzaj statusem istniejących szkoleń</CardDescription>
        </CardHeader>
        <CardContent>
          {trainings?.length ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tytuł</TableHead>
                    <TableHead>Typ pliku</TableHead>
                    <TableHead>Czas trwania</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data utworzenia</TableHead>
                    <TableHead className="text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainings.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{t.file_type}</Badge>
                      </TableCell>
                      <TableCell>{t.duration_minutes} min</TableCell>
                      <TableCell>
                        {t.is_active ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                            Aktywne
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100 text-gray-700">
                            Nieaktywne
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(t.created_at).toLocaleDateString('pl-PL')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <form action={toggleTrainingStatus}>
                            <input type="hidden" name="id" value={t.id} />
                            <input type="hidden" name="current_status" value={String(t.is_active)} />
                            <Button
                              type="submit"
                              variant={t.is_active ? "outline" : "default"}
                              size="sm"
                              title={t.is_active ? "Deaktywuj szkolenie" : "Aktywuj szkolenie"}
                            >
                              {t.is_active ? (
                                <>
                                  <PowerOff className="h-4 w-4 mr-1" />
                                  Deaktywuj
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 mr-1" />
                                  Aktywuj
                                </>
                              )}
                            </Button>
                          </form>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={`/dashboard/trainings/${t.id}`}>Podgląd</a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a href={`/dashboard/trainings/${t.id}/test`}>Test</a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link href={`/dashboard/trainings/manage/wyniki?trainingId=${t.id}`}>
                              <BarChart3 className="h-4 w-4 mr-1" />
                              Wyniki
                            </Link>
                          </Button>
                          <EditTrainingDialog training={{
                            id: t.id,
                            title: t.title,
                            description: t.description ?? null,
                            duration_minutes: t.duration_minutes,
                            file_type: t.file_type as 'PDF' | 'PPTX',
                            is_active: t.is_active,
                          }} />
                          <DeleteTrainingDialog id={t.id} title={t.title} />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">
              Brak szkoleń
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}


