'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_EXTENSIONS = ['.pdf', '.pptx', '.png'] as const
const MAX_FILE_SIZE_MB = 40

function validateFile(file: File): string | null {
  const lowerName = file.name.toLowerCase()
  const matchesExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))

  if (!matchesExtension) {
    return 'Dozwolone formaty: PDF, PPTX lub PNG.'
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Maksymalny rozmiar pliku to ${MAX_FILE_SIZE_MB} MB.`
  }

  return null
}

function getFileType(fileName: string): 'PDF' | 'PPTX' | 'PNG' {
  const name = fileName.toLowerCase()
  if (name.endsWith('.pptx')) return 'PPTX'
  if (name.endsWith('.png')) return 'PNG'
  return 'PDF'
}

function sanitizeFileName(fileName: string): string {
  // Pobierz rozszerzenie pliku
  const extension = fileName.substring(fileName.lastIndexOf('.'))
  // Usuń rozszerzenie z nazwy
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  // Zamień spacje i problematyczne znaki na podkreślenia
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_') // Zamień wiele podkreśleń na jedno
    .replace(/^_+|_+$/g, '') // Usuń podkreślenia z początku i końca
  // Jeśli nazwa jest pusta po sanitizacji, użyj domyślnej
  const finalName = sanitized || 'file'
  return `${finalName}${extension}`
}

// ============================
// Usuwanie pliku szkolenia (admin, server-side, omija RLS)
// ============================
export async function deleteTrainingFile(
  fileId: string, 
  filePath: string, 
  trainingId: string, 
  isLegacy: boolean
): Promise<{ success: boolean; error?: string }> {
  // Sprawdź uprawnienia użytkownika
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Brak uprawnień administratora' }
  }

  // Użyj admin client (service role) – omija RLS
  const adminClient = createAdminClient()

  try {
    // 1. Usuń plik z storage
    const { error: storageError } = await adminClient.storage
      .from('trainings')
      .remove([filePath])

    if (storageError) {
      console.error('Błąd usuwania pliku z storage:', storageError)
      // Kontynuuj – plik mógł już nie istnieć
    }

    // 2. Usuń rekord z training_files (jeśli to nie legacy)
    if (!isLegacy) {
      const { error: dbError } = await adminClient
        .from('training_files')
        .delete()
        .eq('id', fileId)

      if (dbError) {
        return { success: false, error: dbError.message || 'Błąd usuwania pliku z bazy danych' }
      }
    }

    // 3. Wyczyść legacy kolumnę trainings.file_path
    const { error: trainingUpdateError } = await adminClient
      .from('trainings')
      .update({ file_path: '' })
      .eq('id', trainingId)

    if (trainingUpdateError) {
      console.error('Błąd aktualizacji szkolenia po usunięciu pliku:', trainingUpdateError)
    }

    return { success: true }
  } catch (err) {
    console.error('Błąd podczas usuwania pliku:', err)
    return { success: false, error: 'Nie udało się usunąć pliku' }
  }
}

// ============================
// Krok 1: Generuj signed upload URL (admin, omija RLS na storage)
// Klient uploaduje plik BEZPOŚREDNIO do Supabase Storage, omijając limit body Next.js
// ============================
export async function getSignedUploadUrl(
  trainingId: string,
  fileName: string,
  fileSize: number
): Promise<{ success: boolean; signedUrl?: string; token?: string; filePath?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Brak uprawnień administratora' }
  }

  // Walidacja rozszerzenia
  const lowerName = fileName.toLowerCase()
  const matchesExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))
  if (!matchesExtension) {
    return { success: false, error: 'Dozwolone formaty: PDF, PPTX lub PNG.' }
  }

  if (fileSize > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return { success: false, error: `Maksymalny rozmiar pliku: ${MAX_FILE_SIZE_MB} MB.` }
  }

  const adminClient = createAdminClient()
  const sanitizedFileName = sanitizeFileName(fileName)
  const filePath = `${user.id}/${trainingId}/${Date.now()}-${sanitizedFileName}`

  try {
    const { data, error } = await adminClient.storage
      .from('trainings')
      .createSignedUploadUrl(filePath)

    if (error || !data) {
      return { success: false, error: error?.message || 'Nie udało się wygenerować URL do uploadu' }
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      filePath,
    }
  } catch (err) {
    console.error('Błąd generowania signed upload URL:', err)
    return { success: false, error: 'Nie udało się przygotować uploadu' }
  }
}

// ============================
// Krok 2: Rejestruj plik w bazie po udanym uploadzie (admin, omija RLS)
// ============================
export async function registerUploadedFile(
  trainingId: string,
  filePath: string,
  fileName: string,
  fileSize: number
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const fileType = getFileType(fileName)
  const adminClient = createAdminClient()

  try {
    const { error: insertError } = await adminClient
      .from('training_files')
      .insert({
        training_id: trainingId,
        file_path: filePath,
        file_type: fileType,
        file_name: fileName,
        file_size: fileSize,
        uploaded_by: user.id
      })

    if (insertError) {
      // Spróbuj usunąć plik z storage jeśli zapis w bazie się nie powiódł
      await adminClient.storage.from('trainings').remove([filePath])
      return { success: false, error: insertError.message || `Błąd zapisu pliku ${fileName}` }
    }

    return { success: true }
  } catch (err) {
    console.error('Błąd rejestracji pliku:', err)
    return { success: false, error: 'Nie udało się zarejestrować pliku' }
  }
}

// ============================
// Aktywacja szkolenia (admin, server-side, omija RLS)
// ============================
export async function activateTraining(trainingId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from('trainings')
    .update({ is_active: true })
    .eq('id', trainingId)

  if (error) {
    console.error('Błąd aktywacji szkolenia:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function createTraining(formData: FormData): Promise<{ success: boolean; trainingId?: string; error?: string }> {
  // Autoryzacja – sprawdź czy user jest adminem
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Brak uprawnień administratora' }
  }

  // Pobierz dane formularza
  const title = String(formData.get('title') || '').trim()
  const description = (String(formData.get('description') || '').trim() || null) as string | null
  const durationMinutes = Number(formData.get('duration_minutes') || 0)
  
  // Pobierz wybrane user_ids
  const userIds = formData.getAll('user_ids') as string[]

  // Walidacja
  if (!title || !durationMinutes || durationMinutes < 1) {
    return { success: false, error: 'Wypełnij wszystkie wymagane pola' }
  }

  if (userIds.length === 0) {
    return { success: false, error: 'Wybierz co najmniej jednego użytkownika' }
  }

  // Admin client – omija RLS
  const adminClient = createAdminClient()

  try {
    // Utwórz rekord szkolenia
    const { data: trainingData, error: trainingError } = await adminClient
      .from('trainings')
      .insert({
        title,
        description,
        duration_minutes: durationMinutes,
        file_type: 'PDF',
        file_path: '',
        slides_count: 0,
        created_by: user.id,
        is_active: false,
      })
      .select()
      .single()

    if (trainingError || !trainingData) {
      throw new Error(trainingError?.message || 'Błąd tworzenia szkolenia')
    }

    // Przypisz użytkowników do kursu
    const trainingUserInserts = userIds.map(userId => ({
      training_id: trainingData.id,
      user_id: userId
    }))

    const { error: trainingUsersError } = await adminClient
      .from('training_users')
      .insert(trainingUserInserts)

    if (trainingUsersError) {
      await adminClient.from('trainings').delete().eq('id', trainingData.id)
      throw new Error(trainingUsersError.message || 'Błąd przypisywania użytkowników do kursu')
    }

    return { 
      success: true, 
      trainingId: trainingData.id
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd'
    return { success: false, error: errorMessage }
  }
}

export async function updateTrainingWithFile(formData: FormData): Promise<{ success: boolean; error?: string }> {
  // Autoryzacja – sprawdź czy user jest adminem
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Brak uprawnień administratora' }
  }

  // Pobierz dane formularza
  const id = String(formData.get('id') || '').trim()
  const title = String(formData.get('title') || '').trim()
  const description = (String(formData.get('description') || '').trim() || null) as string | null
  const durationMinutes = Number(formData.get('duration_minutes') || 0)
  const isActive = String(formData.get('is_active') || 'false') === 'true'
  
  // Pobierz wybrane user_ids
  const userIds = formData.getAll('user_ids') as string[]

  // Walidacja
  if (!id || !title || !durationMinutes || durationMinutes < 1) {
    return { success: false, error: 'Wypełnij wszystkie wymagane pola' }
  }

  if (userIds.length === 0) {
    return { success: false, error: 'Wybierz co najmniej jednego użytkownika' }
  }

  // Admin client – omija RLS
  const adminClient = createAdminClient()

  try {
    // Sprawdź czy szkolenie istnieje
    const { data: existingTraining, error: fetchError } = await adminClient
      .from('trainings')
      .select('id, file_path')
      .eq('id', id)
      .single()

    if (fetchError || !existingTraining) {
      return { success: false, error: 'Szkolenie nie zostało znalezione' }
    }

    // Aktualizuj dane szkolenia
    const { error: updateError } = await adminClient
      .from('trainings')
      .update({
        title,
        description,
        duration_minutes: durationMinutes,
        is_active: isActive,
      })
      .eq('id', id)

    if (updateError) {
      throw new Error(updateError.message || 'Błąd aktualizacji szkolenia')
    }

    // Zaktualizuj przypisanie użytkowników
    const { error: deleteError } = await adminClient
      .from('training_users')
      .delete()
      .eq('training_id', id)

    if (deleteError) {
      throw new Error(deleteError.message || 'Błąd usuwania starych przypisań')
    }

    // Dodaj nowe przypisania
    const trainingUserInserts = userIds.map(userId => ({
      training_id: id,
      user_id: userId
    }))

    const { error: insertError } = await adminClient
      .from('training_users')
      .insert(trainingUserInserts)

    if (insertError) {
      throw new Error(insertError.message || 'Błąd przypisywania użytkowników do kursu')
    }

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd'
    return { success: false, error: errorMessage }
  }
}

