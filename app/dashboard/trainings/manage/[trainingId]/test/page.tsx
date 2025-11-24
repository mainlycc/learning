import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import TestCreator from '@/components/admin/TestCreator'

export default async function TestBuilderPage({
  params,
}: {
  params: Promise<{ trainingId: string }>
}) {
  const { trainingId } = await params
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

  // Sprawdź czy szkolenie istnieje
  const { data: training } = await supabase
    .from('trainings')
    .select('id, title')
    .eq('id', trainingId)
    .single()

  if (!training) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/trainings/manage">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Powrót do zarządzania
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Budowanie testu</h1>
          <p className="text-muted-foreground">
            Utwórz test dla szkolenia: <strong>{training.title}</strong>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Konfiguracja testu</CardTitle>
          <CardDescription>
            Utwórz test i dodawaj pytania dla szkolenia &quot;{training.title}&quot;
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestCreator initialTrainingId={trainingId} />
        </CardContent>
      </Card>
    </div>
  )
}

