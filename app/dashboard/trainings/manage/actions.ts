'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function updateTraining(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Brak uprawnień'))
  }

  const id = String(formData.get('id') || '').trim()
  const title = String(formData.get('title') || '').trim()
  const description = (String(formData.get('description') || '').trim() || null) as string | null
  const durationMinutes = Number(formData.get('duration_minutes') || 0)
  const fileType = String(formData.get('file_type') || 'PDF') as 'PDF' | 'PPTX'
  const isActive = String(formData.get('is_active') || 'false') === 'true'

  if (!id || !title || !durationMinutes || durationMinutes < 1) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Niepoprawne dane edycji'))
  }

  const { error } = await supabase
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Brak uprawnień'))
  }

  const id = String(formData.get('id') || '').trim()
  if (!id) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Brak identyfikatora szkolenia'))
  }

  const { error } = await supabase
    .from('trainings')
    .delete()
    .eq('id', id)

  if (error) {
    redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Błąd usuwania szkolenia'))
  }

  redirect('/dashboard/trainings/manage?toast=' + encodeURIComponent('Usunięto szkolenie.'))
}


