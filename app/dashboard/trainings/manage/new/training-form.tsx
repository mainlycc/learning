'use client'

import { useState, FormEvent, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUp, CheckCircle2 } from 'lucide-react'
import { TrainingFileUpload } from '@/components/training-file-upload'
import { createTraining, updateTrainingWithFile } from './actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { TrainingPreview } from './training-preview'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

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
  const extension = fileName.substring(fileName.lastIndexOf('.'))
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
  const finalName = sanitized || 'file'
  return `${finalName}${extension}`
}

type UserFunction = 'ochrona' | 'pilot' | 'steward' | 'instruktor' | 'uczestnik' | 'gosc' | 'pracownik' | 'kontraktor' | null

// Dostępne funkcje (grupy użytkowników)
const AVAILABLE_FUNCTIONS: UserFunction[] = ['ochrona', 'pilot', 'steward', 'instruktor', 'uczestnik', 'gosc', 'pracownik', 'kontraktor']

interface User {
  id: string
  email: string
  full_name: string | null
  function: UserFunction
}

interface TrainingData {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  file_type: 'PDF' | 'PPTX' | 'PNG'
  is_active: boolean
  file_path: string | null
}

interface TrainingFormProps {
  initialUsers?: User[]
  trainingData?: TrainingData | null
  assignedUserIds?: string[]
}

export function TrainingForm({ initialUsers = [], trainingData, assignedUserIds = [] }: TrainingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEditMode = !!trainingData
  
  const [title, setTitle] = useState(trainingData?.title || '')
  const [description, setDescription] = useState(trainingData?.description || '')
  const [durationMinutes, setDurationMinutes] = useState(trainingData?.duration_minutes.toString() || '')
  const [files, setFiles] = useState<File[]>([])
  const [existingFiles, setExistingFiles] = useState<Array<{
    id: string
    file_path: string
    file_type: 'PDF' | 'PPTX' | 'PNG'
    file_name: string
    file_size: number | null
  }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>(assignedUserIds)
  const [selectedFunctions, setSelectedFunctions] = useState<Set<UserFunction>>(new Set())
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [createdTrainingId, setCreatedTrainingId] = useState<string | null>(trainingData?.id || null)

  // Załaduj istniejące pliki szkolenia
  useEffect(() => {
    const loadExistingFiles = async () => {
      if (isEditMode && trainingData?.id) {
        const { data: trainingFiles, error } = await supabase
          .from('training_files')
          .select('id, file_path, file_type, file_name, file_size')
          .eq('training_id', trainingData.id)
          .order('created_at', { ascending: true })

        if (!error && trainingFiles) {
          setExistingFiles(trainingFiles)
        }
      }
    }
    loadExistingFiles()
  }, [isEditMode, trainingData?.id, supabase])

  // Ustaw użytkowników z initialUsers jeśli są dostępne
  useEffect(() => {
    if (initialUsers.length > 0) {
      setUsers(initialUsers)
    } else {
      setLoadingUsers(true)
      const fetchUsers = async () => {
        try {
          // Pobierz wszystkie profile
          const { data: allProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name, function')
            .order('full_name', { nullsFirst: false })

          if (profilesError) {
            console.error('Błąd pobierania profili:', profilesError)
            throw profilesError
          }

          // Pobierz zaakceptowane zaproszenia
          const { data: acceptedInvitations, error: invitationsError } = await supabase
            .from('tutor_invitations')
            .select('email')
            .eq('status', 'accepted')

          if (invitationsError) {
            console.error('Błąd pobierania zaproszeń:', invitationsError)
            throw invitationsError
          }

          // Filtruj profile, które mają zaakceptowane zaproszenie
          const acceptedEmails = new Set(acceptedInvitations?.map(inv => inv.email) || [])
          const filteredProfiles = allProfiles?.filter(profile => 
            acceptedEmails.has(profile.email)
          ) || []

          setUsers(filteredProfiles)
        } catch (error) {
          console.error('Błąd pobierania użytkowników:', error)
          setError('Nie udało się pobrać listy użytkowników')
        } finally {
          setLoadingUsers(false)
        }
      }

      fetchUsers()
    }
  }, [supabase, initialUsers])

  const getFunctionLabel = (fn: UserFunction): string => {
    switch (fn) {
      case 'ochrona':
        return 'Ochrona'
      case 'pilot':
        return 'Pilot'
      case 'steward':
        return 'Steward'
      case 'instruktor':
        return 'Instruktor'
      case 'uczestnik':
        return 'Uczestnik'
      case 'gosc':
        return 'Gość'
      case 'pracownik':
        return 'Pracownik'
      case 'kontraktor':
        return 'Kontraktor'
      default:
        return 'Brak'
    }
  }

  // Inicjalizuj wybrane funkcje na podstawie przypisanych użytkowników (tylko przy pierwszym załadowaniu)
  const [functionsInitialized, setFunctionsInitialized] = useState(false)
  
  useEffect(() => {
    if (users.length > 0 && assignedUserIds.length > 0 && !functionsInitialized) {
      const fullySelectedFunctions = new Set<UserFunction>()
      AVAILABLE_FUNCTIONS.forEach(fn => {
        const usersWithFunction = users.filter(u => u.function === fn)
        if (usersWithFunction.length > 0 && usersWithFunction.every(u => assignedUserIds.includes(u.id))) {
          fullySelectedFunctions.add(fn)
        }
      })
      setSelectedFunctions(fullySelectedFunctions)
      setFunctionsInitialized(true)
    }
  }, [users, assignedUserIds, functionsInitialized])

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev => {
      const newSelection = prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
      
      // Aktualizuj wybrane funkcje na podstawie zaznaczonych użytkowników
      const updatedFunctions = new Set<UserFunction>()
      AVAILABLE_FUNCTIONS.forEach(fn => {
        const usersWithFunction = users.filter(u => u.function === fn)
        if (usersWithFunction.length > 0 && usersWithFunction.every(u => newSelection.includes(u.id))) {
          updatedFunctions.add(fn)
        }
      })
      setSelectedFunctions(updatedFunctions)
      
      return newSelection
    })
  }

  const handleFunctionToggle = (fn: UserFunction) => {
    const usersWithFunction = users.filter(u => u.function === fn)
    
    if (usersWithFunction.length === 0) return
    
    setSelectedUserIds(prev => {
      const allSelected = usersWithFunction.every(u => prev.includes(u.id))
      
      if (allSelected) {
        // Odznacz wszystkich użytkowników z tej funkcji
        const newSelection = prev.filter(id => !usersWithFunction.some(u => u.id === id))
        setSelectedFunctions(prevFuncs => {
          const newSet = new Set(prevFuncs)
          newSet.delete(fn)
          return newSet
        })
        return newSelection
      } else {
        // Zaznacz wszystkich użytkowników z tej funkcji
        const userIdsToAdd = usersWithFunction.map(u => u.id).filter(id => !prev.includes(id))
        const newSelection = [...prev, ...userIdsToAdd]
        setSelectedFunctions(prevFuncs => {
          const newSet = new Set(prevFuncs)
          newSet.add(fn)
          return newSet
        })
        return newSelection
      }
    })
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    console.log('handleSubmit wywołany, isEditMode:', isEditMode)
    console.log('title:', title, 'durationMinutes:', durationMinutes)
    console.log('selectedUserIds:', selectedUserIds)
    
    if (!title || !durationMinutes) {
      setError('Wypełnij wszystkie wymagane pola')
      return
    }

    // W trybie tworzenia wymagany jest co najmniej jeden plik
    if (!isEditMode && files.length === 0) {
      setError('Dodaj co najmniej jeden plik szkolenia')
      return
    }

    // W trybie edycji wymagany jest co najmniej jeden plik (istniejący lub nowy)
    if (isEditMode && files.length === 0 && existingFiles.length === 0) {
      setError('Dodaj co najmniej jeden plik szkolenia')
      return
    }

    if (selectedUserIds.length === 0) {
      setError('Wybierz co najmniej jednego użytkownika')
      return
    }

    // Walidacja wszystkich plików
    for (const file of files) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(`${file.name}: ${validationError}`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      if (isEditMode && trainingData) {
        // Tryb edycji
        const formData = new FormData()
        formData.append('id', trainingData.id)
        formData.append('title', title)
        formData.append('description', description)
        formData.append('duration_minutes', durationMinutes)
        formData.append('is_active', trainingData.is_active ? 'true' : 'false')
        // Dodaj wybrane user_ids
        selectedUserIds.forEach(userId => {
          formData.append('user_ids', userId)
        })

        const result = await updateTrainingWithFile(formData)
        
        if (!result.success) {
          console.error('Błąd aktualizacji szkolenia:', result.error)
          setError(result.error || 'Błąd aktualizacji szkolenia')
          return
        }

        // Wgraj nowe pliki
          const user = (await supabase.auth.getUser()).data.user
          if (!user) {
            setError('Brak sesji użytkownika')
            return
          }

        // Wgraj wszystkie nowe pliki
        for (const file of files) {
          const sanitizedFileName = sanitizeFileName(file.name)
          const fileType = getFileType(file.name)
          const filePath = `${user.id}/${trainingData.id}/${Date.now()}-${sanitizedFileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('trainings')
            .upload(filePath, file, { upsert: false })

          if (uploadError) {
            setError(uploadError.message || `Błąd uploadu pliku ${file.name}`)
            return
          }

          // Zapisz plik w tabeli training_files
          const { error: insertError } = await supabase
            .from('training_files')
            .insert({
              training_id: trainingData.id,
              file_path: filePath,
              file_type: fileType,
              file_name: file.name,
              file_size: file.size,
              uploaded_by: user.id
            })

          if (insertError) {
            setError(insertError.message || `Błąd zapisu pliku ${file.name}`)
            return
          }
        }

        // Pokaż dialog sukcesu
        setCreatedTrainingId(trainingData.id)
        setShowSuccessDialog(true)
      } else {
        // Tryb tworzenia
        const formData = new FormData()
        formData.append('title', title)
        formData.append('description', description)
        formData.append('duration_minutes', durationMinutes)
        // Dodaj wybrane user_ids
        selectedUserIds.forEach(userId => {
          formData.append('user_ids', userId)
        })

        const result = await createTraining(formData)
        
        if (!result.success || !result.trainingId) {
          setError(result.error || 'Błąd tworzenia szkolenia')
          return
        }

        // Wgraj wszystkie pliki
        const user = (await supabase.auth.getUser()).data.user
        if (!user) {
          setError('Brak sesji użytkownika')
          return
        }

        // Wgraj wszystkie pliki do storage i zapisz w training_files
        for (const file of files) {
          const sanitizedFileName = sanitizeFileName(file.name)
          const fileType = getFileType(file.name)
        const filePath = `${user.id}/${result.trainingId}/${Date.now()}-${sanitizedFileName}`
        
        const { error: uploadError } = await supabase.storage
          .from('trainings')
            .upload(filePath, file, { upsert: false })

        if (uploadError) {
          // Usuń szkolenie jeśli upload się nie powiódł
          await supabase.from('trainings').delete().eq('id', result.trainingId)
            setError(uploadError.message || `Błąd uploadu pliku ${file.name}`)
          return
        }

          // Zapisz plik w tabeli training_files
          const { error: insertError } = await supabase
            .from('training_files')
            .insert({
              training_id: result.trainingId,
              file_path: filePath,
              file_type: fileType,
              file_name: file.name,
              file_size: file.size,
              uploaded_by: user.id
            })

          if (insertError) {
            // Usuń szkolenie jeśli zapis się nie powiódł
            await supabase.from('trainings').delete().eq('id', result.trainingId)
            setError(insertError.message || `Błąd zapisu pliku ${file.name}`)
          return
          }
        }

        // Zapisz ID utworzonego kursu i pokaż dialog sukcesu
        setCreatedTrainingId(result.trainingId)
        setShowSuccessDialog(true)
      }
    } catch (error) {
      console.error('Błąd podczas przesyłania formularza:', error)
      setError('Wystąpił nieoczekiwany błąd')
    } finally {
      setIsSubmitting(false)
    }
  }


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informacje o szkoleniu</CardTitle>
          <CardDescription>
            {isEditMode 
              ? 'Zmodyfikuj podstawowe dane szkolenia i załącz nowy plik (opcjonalnie)' 
              : 'Wypełnij podstawowe dane szkolenia i załącz plik'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lewa strona - formularz */}
            <div className="lg:col-span-1">
              <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł szkolenia *</Label>
            <Input 
              id="title" 
              name="title" 
              required 
              placeholder="Np. Bezpieczeństwo w pracy"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Input 
              id="description" 
              name="description" 
              placeholder="Krótki opis szkolenia (opcjonalne)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2 max-w-xs">
            <Label htmlFor="duration_minutes">Czas trwania (minuty) *</Label>
            <Input 
              id="duration_minutes" 
              name="duration_minutes" 
              type="number" 
              min={1} 
              required 
              placeholder="60"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Przypisani użytkownicy *</Label>
            
            {/* Wybór grup (funkcji) */}
            <div className="border rounded-lg p-4 mb-4">
              <Label className="text-sm font-medium mb-3 block">Przypisz grupy:</Label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_FUNCTIONS.map((fn) => {
                  const usersWithFunction = users.filter(u => u.function === fn)
                  const allSelected = usersWithFunction.length > 0 && usersWithFunction.every(u => selectedUserIds.includes(u.id))
                  
                  return (
                    <div key={fn || 'brak'} className="flex items-center space-x-2">
                      <Checkbox
                        id={`function-${fn || 'brak'}`}
                        checked={allSelected}
                        onCheckedChange={() => handleFunctionToggle(fn)}
                        disabled={usersWithFunction.length === 0}
                      />
                      <Label
                        htmlFor={`function-${fn || 'brak'}`}
                        className="font-normal cursor-pointer flex items-center gap-2"
                      >
                        <Badge variant="outline">{getFunctionLabel(fn)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          ({usersWithFunction.length})
                        </span>
                      </Label>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lista użytkowników */}
            <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
              {loadingUsers ? (
                <p className="text-sm text-muted-foreground">Ładowanie użytkowników...</p>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">Brak użytkowników w systemie</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <div key={user.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${user.id}`}
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => handleUserToggle(user.id)}
                      />
                      <Label
                        htmlFor={`user-${user.id}`}
                        className="font-normal cursor-pointer flex-1 flex items-center gap-2"
                      >
                        <span className="font-medium">
                          {user.full_name || user.email}
                        </span>
                        {user.function && (
                          <Badge variant="outline" className="text-xs">
                            {getFunctionLabel(user.function)}
                          </Badge>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Wybierz użytkowników lub grupy, które będą miały dostęp do tego kursu
            </p>
          </div>

            <div className="space-y-2">
              <TrainingFileUpload
              onFileSelect={setFiles}
              value={files}
                required={!isEditMode}
              />
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 flex items-center gap-2">
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/trainings/manage">Anuluj</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || (!isEditMode && files.length === 0) || (isEditMode && files.length === 0 && existingFiles.length === 0) || selectedUserIds.length === 0}>
              <FileUp className="h-4 w-4 mr-2" />
              {isSubmitting 
                ? 'Przetwarzanie...' 
                : isEditMode 
                  ? 'Zapisz zmiany' 
                  : 'Utwórz kurs'}
            </Button>
          </div>
        </form>
            </div>

            {/* Prawa strona - podgląd pliku */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Podgląd plików</CardTitle>
                  <CardDescription>
                    {files.length > 0 || existingFiles.length > 0
                      ? `Wyświetl podgląd wszystkich plików (${files.length + existingFiles.length})`
                      : 'Wybierz plik, aby zobaczyć podgląd'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {files.length === 0 && existingFiles.length === 0 ? (
                    <div className="border rounded-md overflow-hidden flex items-center justify-center" style={{ height: 'calc(100vh - 350px)', minHeight: '500px' }}>
                      <div className="text-center space-y-2 p-8">
                        <p className="text-sm text-muted-foreground">
                          Wybierz plik szkolenia, aby zobaczyć podgląd
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Tabs 
                      defaultValue={files.length > 0 ? `new-0` : `existing-0`}
                      className="w-full"
                    >
                      <TabsList className="w-full overflow-x-auto flex flex-nowrap">
                        {files.map((file, index) => (
                          <TabsTrigger 
                            key={`new-${index}`} 
                            value={`new-${index}`}
                            className="text-xs truncate whitespace-nowrap flex-shrink-0"
                            title={file.name}
                          >
                            {file.name.length > 20 ? `${file.name.substring(0, 20)}...` : file.name}
                          </TabsTrigger>
                        ))}
                        {existingFiles.map((file, index) => (
                          <TabsTrigger 
                            key={`existing-${index}`} 
                            value={`existing-${index}`}
                            className="text-xs truncate whitespace-nowrap flex-shrink-0"
                            title={file.file_name}
                          >
                            {file.file_name.length > 20 ? `${file.file_name.substring(0, 20)}...` : file.file_name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      {files.map((file, index) => {
                        const previewUrl = URL.createObjectURL(file)
                        const fileType = getFileType(file.name)
                        return (
                          <TabsContent key={`new-${index}`} value={`new-${index}`} className="mt-4">
                            <div className="border rounded-md overflow-hidden" style={{ height: 'calc(100vh - 450px)', minHeight: '500px' }}>
                              {fileType === 'PDF' ? (
                                <iframe
                                  src={previewUrl}
                                  className="w-full h-full"
                                  title={`Podgląd PDF: ${file.name}`}
                                />
                              ) : fileType === 'PNG' ? (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
                                  <img
                                    src={previewUrl}
                                    alt={`Podgląd PNG: ${file.name}`}
                                    className="max-w-full max-h-full object-contain"
                                  />
                                </div>
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
                                  <div className="text-center space-y-2">
                                    <p className="text-sm text-muted-foreground">
                                      Podgląd plików PPTX jest dostępny po zapisaniu szkolenia
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Plik: {file.name}
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </TabsContent>
                        )
                      })}
                      {existingFiles.map((file, index) => (
                        <TabsContent key={`existing-${index}`} value={`existing-${index}`} className="mt-4">
                          <div className="border rounded-md overflow-hidden" style={{ height: 'calc(100vh - 450px)', minHeight: '500px' }}>
                            <TrainingPreview
                              fileType={file.file_type}
                              filePath={file.file_path}
                              title={trainingData?.title || 'Szkolenie'}
                            />
                          </div>
                        </TabsContent>
                      ))}
                    </Tabs>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog sukcesu */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
              <DialogTitle>
                {isEditMode ? 'Kurs został zaktualizowany pomyślnie!' : 'Kurs został utworzony pomyślnie!'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {isEditMode 
                  ? 'Zmiany zostały zapisane i przypisanie użytkowników zostało zaktualizowane.'
                  : 'Kurs został zapisany i przypisany do wybranych użytkowników.'}
              </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSuccessDialog(false)
                router.push('/dashboard/trainings/manage')
              }}
            >
              Powrót do listy kursów
            </Button>
            {!isEditMode && createdTrainingId && (
              <Button
                onClick={() => {
                  setShowSuccessDialog(false)
                  router.push(`/dashboard/trainings/manage/new?editId=${createdTrainingId}`)
                }}
              >
                Przejdź do edycji
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

