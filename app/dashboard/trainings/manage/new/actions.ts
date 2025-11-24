'use server'

import { createClient } from '@/lib/supabase/server'

const ALLOWED_EXTENSIONS = ['.pdf', '.pptx'] as const
const MAX_FILE_SIZE_MB = 40

function validateFile(file: File): string | null {
  const lowerName = file.name.toLowerCase()
  const matchesExtension = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext))

  if (!matchesExtension) {
    return 'Dozwolone formaty: PDF lub PPTX.'
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Maksymalny rozmiar pliku to ${MAX_FILE_SIZE_MB} MB.`
  }

  return null
}

function getFileType(fileName: string): 'PDF' | 'PPTX' {
  const name = fileName.toLowerCase()
  if (name.endsWith('.pptx')) return 'PPTX'
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
  const fileType = String(formData.get('file_type') || 'PDF') as 'PDF' | 'PPTX'
  
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
    // Utwórz rekord szkolenia (plik zostanie dodany później przez klienta)
    const { data: trainingData, error: trainingError } = await supabase
      .from('trainings')
      .insert({
        title,
        description,
        duration_minutes: durationMinutes,
        file_type: fileType,
        file_path: '', // Zostanie zaktualizowane po uploadzie z klienta
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

