'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function createTraining(formData: FormData): Promise<{ success: boolean; trainingId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
  }

  // Pobierz dane formularza (bez pliku - będzie uploadowany bezpośrednio z klienta)
  const title = String(formData.get('title') || '').trim()
  const description = (String(formData.get('description') || '').trim() || null) as string | null
  const durationMinutes = Number(formData.get('duration_minutes') || 0)
  const fileType = String(formData.get('file_type') || 'PDF') as 'PDF' | 'PPTX' | 'PNG'
  
  // Pobierz wybrane user_ids
  const userIds = formData.getAll('user_ids') as string[]

  // Walidacja
  if (!title || !durationMinutes || durationMinutes < 1) {
    return { success: false, error: 'Wypełnij wszystkie wymagane pola' }
  }

  if (userIds.length === 0) {
    return { success: false, error: 'Wybierz co najmniej jednego użytkownika' }
  }

  try {
    // Utwórz rekord szkolenia (pliki zostaną dodane później przez klienta)
    // Używamy domyślnego typu PDF dla kompatybilności wstecznej
    const { data: trainingData, error: trainingError } = await supabase
      .from('trainings')
      .insert({
        title,
        description,
        duration_minutes: durationMinutes,
        file_type: 'PDF', // Domyślny typ dla kompatybilności wstecznej
        file_path: '', // Zostanie puste - pliki są w training_files
        slides_count: 0,
        created_by: user.id,
        is_active: false, // Nieaktywne do czasu zakończenia procesu
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

    const { error: trainingUsersError } = await supabase
      .from('training_users')
      .insert(trainingUserInserts)

    if (trainingUsersError) {
      // Usuń utworzone szkolenie jeśli przypisanie użytkowników się nie powiodło
      await supabase.from('trainings').delete().eq('id', trainingData.id)
      throw new Error(trainingUsersError.message || 'Błąd przypisywania użytkowników do kursu')
    }

    // Zwróć sukces z ID szkolenia - plik zostanie przesłany bezpośrednio z klienta
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
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return { success: false, error: 'Brak uprawnień' }
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

  try {
    // Sprawdź czy szkolenie istnieje
    const { data: existingTraining, error: fetchError } = await supabase
      .from('trainings')
      .select('id, file_path')
      .eq('id', id)
      .single()

    if (fetchError || !existingTraining) {
      return { success: false, error: 'Szkolenie nie zostało znalezione' }
    }

    // Aktualizuj dane szkolenia (pliki są zarządzane w tabeli training_files)
    const updateData: {
      title: string
      description: string | null
      duration_minutes: number
      is_active: boolean
    } = {
      title,
      description,
      duration_minutes: durationMinutes,
      is_active: isActive,
    }

    // Jeśli jest nowy plik, ścieżka zostanie zaktualizowana przez klienta
    // Tutaj tylko aktualizujemy podstawowe dane
    const { error: updateError } = await supabase
      .from('trainings')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      throw new Error(updateError.message || 'Błąd aktualizacji szkolenia')
    }

    // Zaktualizuj przypisanie użytkowników
    // Najpierw usuń stare przypisania
    const { error: deleteError } = await supabase
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

    const { error: insertError } = await supabase
      .from('training_users')
      .insert(trainingUserInserts)

    if (insertError) {
      throw new Error(insertError.message || 'Błąd przypisywania użytkowników do kursu')
    }

    // Zwróć sukces - plik zostanie przesłany bezpośrednio z klienta jeśli został wybrany
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd'
    return { success: false, error: errorMessage }
  }
}

