'use client'

import { useState, FormEvent, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileUp, CheckCircle2 } from 'lucide-react'
import { TrainingFileUpload } from '@/components/training-file-upload'
import { createTraining } from './actions'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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
  const extension = fileName.substring(fileName.lastIndexOf('.'))
  const nameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'))
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
  const finalName = sanitized || 'file'
  return `${finalName}${extension}`
}

interface User {
  id: string
  email: string
  full_name: string | null
}

interface TrainingFormProps {
  initialUsers?: User[]
}

export function TrainingForm({ initialUsers = [] }: TrainingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [durationMinutes, setDurationMinutes] = useState('')
  const [fileType, setFileType] = useState<'PDF' | 'PPTX'>('PDF')
  const [file, setFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [createTest, setCreateTest] = useState(false)
  const [showSuccessDialog, setShowSuccessDialog] = useState(false)
  const [createdTrainingId, setCreatedTrainingId] = useState<string | null>(null)

  // Jeśli nie ma initialUsers, pobierz z klienta
  useEffect(() => {
    if (initialUsers.length === 0) {
      setLoadingUsers(true)
      const fetchUsers = async () => {
        try {
          // Pobierz wszystkie profile
          const { data: allProfiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, email, full_name')
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

  const handleUserToggle = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    
    if (!title || !durationMinutes || !file) {
      setError('Wypełnij wszystkie wymagane pola')
      return
    }

    if (selectedUserIds.length === 0) {
      setError('Wybierz co najmniej jednego użytkownika')
      return
    }

    // Walidacja pliku po stronie klienta
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    // Sprawdź czy typ pliku zgadza się z wybranym typem
    const detectedFileType = getFileType(file.name)
    if (detectedFileType !== fileType) {
      setError('Typ pliku nie zgadza się z wybranym typem')
      return
    }

    setIsSubmitting(true)

    try {
      // Najpierw utwórz szkolenie (bez pliku)
      const formData = new FormData()
      formData.append('title', title)
      formData.append('description', description)
      formData.append('duration_minutes', durationMinutes)
      formData.append('file_type', fileType)
      // Dodaj wybrane user_ids
      selectedUserIds.forEach(userId => {
        formData.append('user_ids', userId)
      })

      const result = await createTraining(formData)
      
      if (!result.success || !result.trainingId) {
        setError(result.error || 'Błąd tworzenia szkolenia')
        return
      }

      // Teraz upload pliku bezpośrednio do Supabase Storage z klienta
      const user = (await supabase.auth.getUser()).data.user
      if (!user) {
        setError('Brak sesji użytkownika')
        return
      }

      const sanitizedFileName = sanitizeFileName(file.name)
      const filePath = `${user.id}/${result.trainingId}/${Date.now()}-${sanitizedFileName}`
      
      const { error: uploadError } = await supabase.storage
        .from('trainings')
        .upload(filePath, file, { upsert: false })

      if (uploadError) {
        // Usuń szkolenie jeśli upload się nie powiódł
        await supabase.from('trainings').delete().eq('id', result.trainingId)
        setError(uploadError.message || 'Błąd uploadu pliku')
        return
      }

      // Aktualizuj szkolenie z ścieżką pliku
      const { error: updateError } = await supabase
        .from('trainings')
        .update({ file_path: filePath })
        .eq('id', result.trainingId)

      if (updateError) {
        setError(updateError.message || 'Błąd aktualizacji szkolenia')
        return
      }

      // Zapisz ID utworzonego kursu i pokaż dialog sukcesu
      setCreatedTrainingId(result.trainingId)
      setShowSuccessDialog(true)
    } catch (error) {
      console.error('Błąd podczas przesyłania formularza:', error)
      setError('Wystąpił nieoczekiwany błąd')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informacje o szkoleniu</CardTitle>
        <CardDescription>Wypełnij podstawowe dane szkolenia i załącz plik</CardDescription>
      </CardHeader>
      <CardContent>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
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
              <Label>Typ pliku *</Label>
              <RadioGroup 
                name="file_type" 
                value={fileType} 
                onValueChange={(value) => {
                  setFileType(value as 'PDF' | 'PPTX')
                  setFile(null) // Reset file when type changes
                }}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PDF" id="file_type_pdf" />
                  <Label htmlFor="file_type_pdf" className="font-normal cursor-pointer">
                    PDF
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="PPTX" id="file_type_pptx" />
                  <Label htmlFor="file_type_pptx" className="font-normal cursor-pointer">
                    PPTX (prezentacja w power point)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Przypisani użytkownicy *</Label>
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
                        className="font-normal cursor-pointer flex-1"
                      >
                        {user.full_name || user.email}
                        {user.full_name && (
                          <span className="text-muted-foreground text-sm ml-2">
                            ({user.email})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Wybierz użytkowników, którzy będą mieli dostęp do tego kursu
            </p>
          </div>

          <TrainingFileUpload
            onFileSelect={setFile}
            fileType={fileType}
            value={file}
          />

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="create-test" className="text-base">
                Utwórz test do tego kursu
              </Label>
              <p className="text-sm text-muted-foreground">
                Po utworzeniu kursu przejdziesz do strony tworzenia testu
              </p>
            </div>
            <Switch
              id="create-test"
              checked={createTest}
              onCheckedChange={setCreateTest}
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
            <Button type="submit" disabled={isSubmitting || !file || selectedUserIds.length === 0}>
              <FileUp className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Przetwarzanie...' : 'Utwórz kurs'}
            </Button>
          </div>
        </form>
      </CardContent>

      {/* Dialog sukcesu */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <DialogTitle>Kurs został utworzony pomyślnie!</DialogTitle>
                <DialogDescription className="mt-1">
                  Kurs został zapisany i przypisany do wybranych użytkowników.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessDialog(false)
                if (createTest && createdTrainingId) {
                  router.push(`/dashboard/trainings/manage/${createdTrainingId}/test`)
                } else {
                  router.push('/dashboard/trainings/manage')
                }
              }}
            >
              {createTest ? 'Przejdź do tworzenia testu' : 'Powrót do listy kursów'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

