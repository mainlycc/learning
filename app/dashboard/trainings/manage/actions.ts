'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

// Helper: sprawdź czy zalogowany user jest adminem
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Brak uprawnień'))
  }
  return user
}

export async function updateTraining(formData: FormData) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const id = String(formData.get('id') || '').trim()
  const title = String(formData.get('title') || '').trim()
  const description = (String(formData.get('description') || '').trim() || null) as string | null
  const durationMinutes = Number(formData.get('duration_minutes') || 0)
  const fileType = String(formData.get('file_type') || 'PDF') as 'PDF' | 'PPTX' | 'PNG'
  const isActive = String(formData.get('is_active') || 'false') === 'true'

  if (!id || !title || !durationMinutes || durationMinutes < 1) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Niepoprawne dane edycji'))
  }

  const { error } = await adminClient
    .from('trainings')
    .update({
      title,
      description,
      duration_minutes: durationMinutes,
      file_type: fileType,
      is_active: isActive,
    })
    .eq('id', id)

  if (error) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Błąd aktualizacji szkolenia'))
  }

  redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Zaktualizowano szkolenie.'))
}

export async function deleteTraining(formData: FormData) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const id = String(formData.get('id') || '').trim()
  if (!id) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Brak identyfikatora szkolenia'))
  }

  // Najpierw usuń powiązane pliki z storage
  const { data: trainingFiles } = await adminClient
    .from('training_files')
    .select('file_path')
    .eq('training_id', id)

  if (trainingFiles && trainingFiles.length > 0) {
    const filePaths = trainingFiles.map(f => f.file_path).filter(Boolean)
    if (filePaths.length > 0) {
      await adminClient.storage.from('trainings').remove(filePaths)
    }
  }

  // Usuń legacy plik z storage jeśli istnieje
  const { data: training } = await adminClient
    .from('trainings')
    .select('file_path')
    .eq('id', id)
    .single()

  if (training?.file_path) {
    await adminClient.storage.from('trainings').remove([training.file_path])
  }

  // Usuń rekordy z training_files
  await adminClient
    .from('training_files')
    .delete()
    .eq('training_id', id)

  // Usuń przypisania użytkowników
  await adminClient
    .from('training_users')
    .delete()
    .eq('training_id', id)

  // Usuń samo szkolenie
  const { error } = await adminClient
    .from('trainings')
    .delete()
    .eq('id', id)

  if (error) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Błąd usuwania szkolenia'))
  }

  redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Usunięto szkolenie.'))
}

export async function toggleTrainingStatus(formData: FormData) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const id = String(formData.get('id') || '').trim()
  const currentStatus = String(formData.get('current_status') || 'false') === 'true'
  
  if (!id) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Brak identyfikatora szkolenia'))
  }

  const { error } = await adminClient
    .from('trainings')
    .update({ is_active: !currentStatus })
    .eq('id', id)

  if (error) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Błąd zmiany statusu szkolenia'))
  }

  redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent(
    !currentStatus ? 'Szkolenie zostało aktywowane.' : 'Szkolenie zostało deaktywowane.'
  ))
}

export async function deleteTrainings(formData: FormData) {
  await requireAdmin()
  const adminClient = createAdminClient()

  const ids = formData.getAll('ids[]').map(id => String(id).trim()).filter(Boolean)
  
  if (ids.length === 0) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Nie wybrano szkoleń do usunięcia'))
  }

  // Dla każdego szkolenia - usuń pliki z storage
  for (const id of ids) {
    const { data: trainingFiles } = await adminClient
      .from('training_files')
      .select('file_path')
      .eq('training_id', id)

    if (trainingFiles && trainingFiles.length > 0) {
      const filePaths = trainingFiles.map(f => f.file_path).filter(Boolean)
      if (filePaths.length > 0) {
        await adminClient.storage.from('trainings').remove(filePaths)
      }
    }

    const { data: training } = await adminClient
      .from('trainings')
      .select('file_path')
      .eq('id', id)
      .single()

    if (training?.file_path) {
      await adminClient.storage.from('trainings').remove([training.file_path])
    }
  }

  // Usuń rekordy z training_files
  await adminClient
    .from('training_files')
    .delete()
    .in('training_id', ids)

  // Usuń przypisania użytkowników
  await adminClient
    .from('training_users')
    .delete()
    .in('training_id', ids)

  // Usuń szkolenia
  const { error } = await adminClient
    .from('trainings')
    .delete()
    .in('id', ids)

  if (error) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Błąd usuwania szkoleń'))
  }

  redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent(
    `Usunięto ${ids.length} ${ids.length === 1 ? 'szkolenie' : 'szkoleń'}.`
  ))
}
