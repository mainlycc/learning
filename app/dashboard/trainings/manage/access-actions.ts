'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

/**
 * Zbiorcze przypisanie szkoleń dla całej grupy użytkowników (wg pola function).
 */
export async function updateGroupTrainingAccess(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      '/dashboard/trainings/manage/access?toast=' +
        encodeURIComponent('Brak uprawnień do zarządzania dostępem.'),
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const isAdmin = role === 'admin' || role === 'super_admin'

  if (!isAdmin) {
    redirect(
      '/dashboard/trainings/manage/access?toast=' +
        encodeURIComponent('Brak uprawnień do zarządzania dostępem.'),
    )
  }

  const adminClient = createAdminClient()

  const groupName = String(formData.get('groupName') || '').trim()
  const trainingIds = formData
    .getAll('trainingIds[]')
    .map((id) => String(id).trim())
    .filter(Boolean)

  if (!groupName) {
    redirect(
      '/dashboard/trainings/manage/access?toast=' +
        encodeURIComponent('Nie wybrano grupy.'),
    )
  }

  // Pobierz wszystkich użytkowników w danej grupie
  const { data: groupUsers, error: groupUsersError } = await adminClient
    .from('profiles')
    .select('id')
    .eq('role', 'user')
    .eq('function', groupName)

  if (groupUsersError) {
    console.error('Błąd pobierania użytkowników grupy:', groupUsersError)
    redirect(
      `/dashboard/trainings/manage/access?toast=` +
        encodeURIComponent('Błąd pobierania użytkowników grupy.'),
    )
  }

  const userIds = groupUsers?.map((u) => u.id as string) ?? []

  if (userIds.length === 0) {
    redirect(
      `/dashboard/trainings/manage/access?toast=` +
        encodeURIComponent(`Brak użytkowników w grupie "${groupName}".`),
    )
  }

  let successCount = 0
  let errorCount = 0

  for (const userId of userIds) {
    // Pobierz obecne przypisania
    const { data: existing } = await adminClient
      .from('training_users')
      .select('training_id')
      .eq('user_id', userId)

    const existingIds = new Set(
      existing?.map((a) => String(a.training_id)) ?? [],
    )
    const newIds = new Set(trainingIds)

    const toInsert = trainingIds.filter((id) => !existingIds.has(id))
    const toDelete = Array.from(existingIds).filter((id) => !newIds.has(id))

    try {
      if (toInsert.length > 0) {
        const { error } = await adminClient.from('training_users').insert(
          toInsert.map((trainingId) => ({
            training_id: trainingId,
            user_id: userId,
          })),
        )
        if (error) throw error
      }

      if (toDelete.length > 0) {
        const { error } = await adminClient
          .from('training_users')
          .delete()
          .eq('user_id', userId)
          .in('training_id', toDelete)
        if (error) throw error
      }

      successCount++
    } catch (err) {
      console.error(`Błąd zapisu dostępu dla użytkownika ${userId}:`, err)
      errorCount++
    }
  }

  const message =
    errorCount > 0
      ? `Zapisano dostęp dla ${successCount}/${userIds.length} użytkowników. Błędy: ${errorCount}.`
      : `Zapisano dostęp do szkoleń dla ${successCount} użytkowników z grupy.`

  redirect(
    `/dashboard/trainings/manage/access?toast=` + encodeURIComponent(message),
  )
}

export async function updateUserTrainingAccess(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(
      '/dashboard/trainings/manage/access?toast=' +
        encodeURIComponent('Brak uprawnień do zarządzania dostępem.'),
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'
  const isAdmin = role === 'admin' || role === 'super_admin'

  if (!isAdmin) {
    redirect(
      '/dashboard/trainings/manage/access?toast=' +
        encodeURIComponent('Brak uprawnień do zarządzania dostępem.'),
    )
  }

  // Admin client – omija RLS
  const adminClient = createAdminClient()

  const targetUserId = String(formData.get('userId') || '').trim()
  const trainingIds = formData
    .getAll('trainingIds[]')
    .map((id) => String(id).trim())
    .filter(Boolean)

  if (!targetUserId) {
    redirect(
      '/dashboard/trainings/manage/access?toast=' +
        encodeURIComponent('Nie wybrano uczestnika.'),
    )
  }

  // Odczytaj aktualne przypisania dla użytkownika
  const { data: existingAssignments, error: existingError } = await adminClient
    .from('training_users')
    .select('training_id')
    .eq('user_id', targetUserId)

  if (existingError) {
    console.error('Błąd pobierania istniejących przypisań:', existingError)
    redirect(
      `/dashboard/trainings/manage/access?userId=${encodeURIComponent(
        targetUserId,
      )}&toast=` + encodeURIComponent('Błąd pobierania aktualnych przypisań.'),
    )
  }

  const existingIds = new Set(
    existingAssignments?.map((a) => String(a.training_id)) ?? [],
  )
  const newIds = new Set(trainingIds)

  const toInsert = trainingIds.filter((id) => !existingIds.has(id))
  const toDelete = Array.from(existingIds).filter((id) => !newIds.has(id))

  if (toInsert.length > 0) {
    const { error: insertError } = await adminClient.from('training_users').insert(
      toInsert.map((trainingId) => ({
        training_id: trainingId,
        user_id: targetUserId,
      })),
    )

    if (insertError) {
      console.error('Błąd dodawania przypisań:', insertError)
      redirect(
        `/dashboard/trainings/manage/access?userId=${encodeURIComponent(
          targetUserId,
        )}&toast=` +
          encodeURIComponent('Błąd podczas dodawania przypisań do szkoleń.'),
      )
    }
  }

  if (toDelete.length > 0) {
    const { error: deleteError } = await adminClient
      .from('training_users')
      .delete()
      .eq('user_id', targetUserId)
      .in('training_id', toDelete)

    if (deleteError) {
      console.error('Błąd usuwania przypisań:', deleteError)
      redirect(
        `/dashboard/trainings/manage/access?userId=${encodeURIComponent(
          targetUserId,
        )}&toast=` +
          encodeURIComponent('Błąd podczas usuwania przypisań do szkoleń.'),
      )
    }
  }

  redirect(
    `/dashboard/trainings/manage/access?userId=${encodeURIComponent(
      targetUserId,
    )}&toast=` + encodeURIComponent('Zapisano dostęp do szkoleń.'),
  )
}
