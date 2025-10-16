import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import TrainingUpload from '@/components/admin/TrainingUpload'
import TestCreator from '@/components/admin/TestCreator'

async function createTraining(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Brak sesji' }

  const title = String(formData.get('title') || '').trim()
  const description = String(formData.get('description') || '').trim() || null
  const durationMinutes = Number(formData.get('duration_minutes') || 0)
  const fileType = String(formData.get('file_type') || 'PDF') as 'PDF' | 'PPTX'
  const isActive = String(formData.get('is_active') || 'true') === 'true'

  if (!title || !durationMinutes) {
    return { ok: false, error: 'Wypełnij wymagane pola' }
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

  if (error) return { ok: false, error: error.message }
  return { ok: true }
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

  // Lista istniejących szkoleń (proste zestawienie)
  const { data: trainings } = await supabase
    .from('trainings')
    .select('id, title, file_type, duration_minutes, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Zarządzanie szkoleniami</h1>
        <p className="text-muted-foreground">Dodawaj, edytuj i zarządzaj szkoleniami oraz testami.</p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle>Szkolenia</CardTitle>
          <CardDescription>Lista ostatnio dodanych szkoleń</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <h3 className="font-medium mb-2">Wgrywanie pliku do szkolenia</h3>
            <TrainingUpload />
          </div>
          <div className="space-y-3">
            {trainings?.length ? trainings.map((t) => (
              <div key={t.id} className="flex items-center justify-between border rounded p-3">
                <div className="space-y-0.5">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.file_type} • {t.duration_minutes} min • {t.is_active ? 'Aktywne' : 'Nieaktywne'}</div>
                </div>
                <div className="flex gap-2">
                  <a className="text-sm underline" href={`/dashboard/trainings/${t.id}`}>Podgląd</a>
                  <a className="text-sm underline" href={`/dashboard/trainings/${t.id}/test`}>Test</a>
                </div>
              </div>
            )) : (
              <div className="text-sm text-muted-foreground">Brak szkoleń</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


