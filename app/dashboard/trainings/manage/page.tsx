import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import TrainingUpload from '@/components/admin/TrainingUpload'
import TestCreator from '@/components/admin/TestCreator'
import { SlideManager } from '@/components/admin/SlideManager'
import { EditTrainingDialog } from '@/components/admin/EditTrainingDialog'
import { DeleteTrainingDialog } from '@/components/admin/DeleteTrainingDialog'
import { toggleTrainingStatus } from './actions'
import { Power, PowerOff } from 'lucide-react'

async function createTraining(formData: FormData): Promise<void> {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim() || null
  const durationMinutes = Number(formData.get('duration_minutes') || 0)
  const fileType = String(formData.get('file_type') || 'PDF') as 'PDF' | 'PPTX'
  const isActive = String(formData.get('is_active') || 'true') === 'true'

  if (!title || !durationMinutes) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Niepoprawne dane formularza'))
  }

  const { error } = await supabase
    .from('trainings')
    .insert({
      title,
      description,
      duration_minutes: durationMinutes,
      file_path: '', // upload pliku zostanie dodany później
      file_type: fileType,
      slides_count: 0,
      created_by: user.id,
      is_active: isActive,
    })

  if (error) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Błąd zapisu szkolenia'))
  }

  redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Zapisano szkolenie.'))
}

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
      <div>
        <h1 className="text-2xl font-semibold">Zarządzanie szkoleniami</h1>
        <p className="text-muted-foreground">Dodawaj, edytuj i zarządzaj szkoleniami oraz testami.</p>
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

      {/* Dodawanie szkolenia i testów pod listą */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dodaj szkolenie</CardTitle>
            <CardDescription>Utwórz podstawowe metadane. Upload pliku dodamy w kolejnym kroku.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createTraining} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Opis</Label>
                <Input id="description" name="description" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration_minutes">Nominalny czas (min)</Label>
                <Input id="duration_minutes" name="duration_minutes" type="number" min={1} required />
              </div>
              <div className="space-y-2">
                <Label>Typ pliku</Label>
                <Select name="file_type" defaultValue="PDF">
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz typ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PDF">PDF</SelectItem>
                    <SelectItem value="PPTX">PPTX</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <input type="hidden" name="is_active" value="true" />
              <div className="flex justify-end gap-2">
                <Button type="submit">Zapisz szkolenie</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Konfiguracja testów</CardTitle>
            <CardDescription>Utwórz test i dodawaj pytania.</CardDescription>
          </CardHeader>
          <CardContent>
            <TestCreator />
          </CardContent>
        </Card>
      </div>

      {/* Dodatkowe narzędzia: upload i slajdy */}
      <Card>
        <CardHeader>
          <CardTitle>Narzędzia szkolenia</CardTitle>
          <CardDescription>Wgrywanie plików i zarządzanie slajdami</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="font-medium mb-2">Wgrywanie pliku do szkolenia</h3>
            <TrainingUpload />
          </div>
          <div className="mb-6">
            <h3 className="font-medium mb-2">Zarządzanie slajdami</h3>
            <SlideManager />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


