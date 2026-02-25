import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrainingAccessManager } from '@/components/admin/TrainingAccessManager'
import { createAdminClient } from '@/lib/supabase/admin'
import { ManageTabsNav } from '../manage-tabs-nav'

interface PageProps {
  searchParams: Promise<{
    userId?: string
    toast?: string
  }>
}

export default async function ManageAccessPage({ searchParams }: PageProps) {
  const params = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const isAdmin = role === 'admin' || role === 'super_admin'

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Brak uprawnień</CardTitle>
            <CardDescription>
              Ta sekcja jest dostępna tylko dla administratorów.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Użyj admin clienta do pobierania uczestników i przypisań - omijamy złożone RLS
  const adminClient = createAdminClient()

  // Pobierz uczestników (tylko rola "user") z polem function
  const { data: participantsData, error: participantsError } = await adminClient
    .from('profiles')
    .select('id, full_name, email, function')
    .eq('role', 'user')
    .order('full_name', { ascending: true })

  if (participantsError) {
    console.error('Błąd pobierania uczestników:', participantsError)
  }

  const participants =
    participantsData?.map((p) => ({
      id: p.id as string,
      email: (p as any).email as string,
      full_name: (p as any).full_name as string | null,
      function: ((p as any).function as string | null) ?? null,
    })) ?? []

  // Pobierz dostępne grupy użytkowników
  const { data: groupsData } = await adminClient
    .from('user_groups')
    .select('id, name, display_name')
    .order('display_name', { ascending: true })

  const groups = groupsData?.map((g) => ({
    name: g.name as string,
    display_name: g.display_name as string,
  })) ?? []

  // Pobierz aktywne szkolenia
  const { data: trainingsData, error: trainingsError } = await adminClient
    .from('trainings')
    .select('id, title, description, is_active')
    .eq('is_active', true)
    .order('title', { ascending: true })

  if (trainingsError) {
    console.error('Błąd pobierania szkoleń:', trainingsError)
  }

  const trainingIds = trainingsData?.map((t) => t.id as string) ?? []

  // Sprawdź, które szkolenia mają jakiekolwiek przypisania (training_has_assignments)
  let trainingsWithAssignments = new Set<string>()

  if (trainingIds.length > 0) {
    const { data: assignmentsByTraining, error: assignmentsByTrainingError } =
      await adminClient
        .from('training_users')
        .select('training_id')
        .in('training_id', trainingIds)

    if (assignmentsByTrainingError) {
      console.error(
        'Błąd pobierania przypisań szkoleń (global):',
        assignmentsByTrainingError,
      )
    } else {
      trainingsWithAssignments = new Set(
        (assignmentsByTraining ?? []).map(
          (a) => a.training_id as string,
        ),
      )
    }
  }

  const trainings =
    trainingsData?.map((t) => ({
      id: t.id as string,
      title: t.title as string,
      description: (t as any).description as string | null,
      is_active: Boolean((t as any).is_active),
      hasAssignments: trainingsWithAssignments.has(t.id as string),
    })) ?? []

  const selectedUserId =
    params.userId && participants.some((p) => p.id === params.userId)
      ? params.userId
      : participants.length > 0
        ? participants[0].id
        : null

  // Pobierz aktualne przypisania szkoleń dla wybranego użytkownika
  let currentUserTrainingIds: string[] = []

  if (selectedUserId) {
    const { data: assignments, error: assignmentsError } = await adminClient
      .from('training_users')
      .select('training_id')
      .eq('user_id', selectedUserId)

    if (assignmentsError) {
      console.error('Błąd pobierania przypisań szkoleń:', assignmentsError)
    } else {
      currentUserTrainingIds = assignments?.map((a) => a.training_id as string) ?? []
    }
  }

  const initialToast = params.toast ? decodeURIComponent(params.toast) : undefined

  return (
    <div className="space-y-6">
      <ManageTabsNav />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Zarządzanie dostępem do szkoleń</h1>
          <p className="text-muted-foreground">
            Wybierz uczestnika i zdecyduj, do jakich szkoleń ma mieć dostęp.
          </p>
        </div>
      </div>

      <TrainingAccessManager
        participants={participants}
        trainings={trainings}
        groups={groups}
        currentUserId={selectedUserId}
        currentUserTrainingIds={currentUserTrainingIds}
        initialToast={initialToast}
      />
    </div>
  )
}
