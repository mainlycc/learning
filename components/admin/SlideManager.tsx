'use client'

import { useState, useEffect } from 'react'
import NextImage from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  Image, 
  Trash2, 
  Eye, 
  Plus, 
  FileImage,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface Training {
  id: string
  title: string
  slides_count: number
}

interface TrainingSlide {
  id: string
  training_id: string
  slide_number: number
  image_url: string
  min_time_seconds: number
}

interface SlideUpload {
  file: File | null
  slideNumber: number
  minTimeSeconds: number
  preview?: string
}

export function SlideManager() {
  const [trainings, setTrainings] = useState<Training[]>([])
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('')
  const [existingSlides, setExistingSlides] = useState<TrainingSlide[]>([])
  const [slideUploads, setSlideUploads] = useState<SlideUpload[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')

  const supabase = createClient()

  // Pobierz listę szkoleń
  useEffect(() => {
    const loadTrainings = async () => {
      try {
        const { data, error } = await supabase
          .from('trainings')
          .select('id, title, slides_count')
          .order('title')

        if (error) throw error
        setTrainings(data || [])
      } catch (error) {
        console.error('Błąd pobierania szkoleń:', error)
        setMessage('Błąd pobierania listy szkoleń')
        setMessageType('error')
      }
    }

    loadTrainings()
  }, [supabase])

  // Pobierz istniejące slajdy gdy zmieni się wybrane szkolenie
  useEffect(() => {
    const loadExistingSlides = async () => {
      if (!selectedTrainingId) {
        setExistingSlides([])
        return
      }

      try {
        const { data, error } = await supabase
          .from('training_slides')
          .select('*')
          .eq('training_id', selectedTrainingId)
          .order('slide_number')

        if (error) throw error
        setExistingSlides(data || [])
      } catch (error) {
        console.error('Błąd pobierania slajdów:', error)
        setMessage('Błąd pobierania slajdów')
        setMessageType('error')
      }
    }

    loadExistingSlides()
  }, [selectedTrainingId, supabase])

  // Dodaj nowy slajd do uploadu
  const addSlideUpload = () => {
    const nextSlideNumber = Math.max(
      ...existingSlides.map(s => s.slide_number),
      ...slideUploads.map(s => s.slideNumber),
      0
    ) + 1

    setSlideUploads(prev => [...prev, {
      file: null,
      slideNumber: nextSlideNumber,
      minTimeSeconds: 30
    }])
  }

  // Usuń slajd z uploadu
  const removeSlideUpload = (index: number) => {
    setSlideUploads(prev => prev.filter((_, i) => i !== index))
  }

  // Zaktualizuj dane slajdu
  const updateSlideUpload = (index: number, updates: Partial<SlideUpload>) => {
    setSlideUploads(prev => prev.map((slide, i) => 
      i === index ? { ...slide, ...updates } : slide
    ))
  }

  // Obsługa wyboru pliku
  const handleFileSelect = (index: number, file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage('Wybierz plik graficzny (JPG, PNG, GIF)')
      setMessageType('error')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      updateSlideUpload(index, {
        file,
        preview: e.target?.result as string
      })
    }
    reader.readAsDataURL(file)
  }

  // Upload slajdów
  const uploadSlides = async () => {
    if (slideUploads.length === 0 || !selectedTrainingId) return

    setIsUploading(true)
    setUploadProgress(0)
    setMessage(null)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Brak sesji użytkownika')

      const uploadedSlides = []

      for (let i = 0; i < slideUploads.length; i++) {
        const slide = slideUploads[i]
        
        if (!slide.file) {
          setMessage('Niektóre slajdy nie mają wybranego pliku')
          setMessageType('error')
          return
        }
        
        // Upload obrazu do Storage
        const fileName = `slide_${slide.slideNumber}_${Date.now()}.${slide.file.name.split('.').pop()}`
        const filePath = `training-slides/${selectedTrainingId}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('slides')
          .upload(filePath, slide.file)

        if (uploadError) throw uploadError

        // Pobierz publiczny URL
        const { data: urlData } = supabase.storage
          .from('slides')
          .getPublicUrl(filePath)

        // Zapisz slajd w bazie danych
        const { data: slideData, error: slideError } = await supabase
          .from('training_slides')
          .insert({
            training_id: selectedTrainingId,
            slide_number: slide.slideNumber,
            image_url: urlData.publicUrl,
            min_time_seconds: slide.minTimeSeconds
          })
          .select()
          .single()

        if (slideError) throw slideError

        uploadedSlides.push(slideData)
        setUploadProgress(((i + 1) / slideUploads.length) * 100)
      }

      // Aktualizuj liczbę slajdów w szkoleniu
      const newSlidesCount = existingSlides.length + uploadedSlides.length
      const { error: updateError } = await supabase
        .from('trainings')
        .update({ slides_count: newSlidesCount })
        .eq('id', selectedTrainingId)

      if (updateError) throw updateError

      setMessage(`Pomyślnie dodano ${uploadedSlides.length} slajdów`)
      setMessageType('success')
      setSlideUploads([])
      
      // Odśwież listę slajdów
      const { data: updatedSlides } = await supabase
        .from('training_slides')
        .select('*')
        .eq('training_id', selectedTrainingId)
        .order('slide_number')

      setExistingSlides(updatedSlides || [])

      // Odśwież listę szkoleń
      const { data: updatedTrainings } = await supabase
        .from('trainings')
        .select('id, title, slides_count')
        .order('title')

      setTrainings(updatedTrainings || [])

    } catch (error) {
      console.error('Błąd uploadu slajdów:', error)
      setMessage(error instanceof Error ? error.message : 'Błąd podczas uploadu slajdów')
      setMessageType('error')
    } finally {
      setIsUploading(false)
    }
  }

  // Usuń istniejący slajd
  const deleteSlide = async (slideId: string) => {
    try {
      const { error } = await supabase
        .from('training_slides')
        .delete()
        .eq('id', slideId)

      if (error) throw error

      setMessage('Slajd został usunięty')
      setMessageType('success')

      // Odśwież listę slajdów
      const { data } = await supabase
        .from('training_slides')
        .select('*')
        .eq('training_id', selectedTrainingId)
        .order('slide_number')

      setExistingSlides(data || [])

    } catch (error) {
      console.error('Błąd usuwania slajdu:', error)
      setMessage('Błąd podczas usuwania slajdu')
      setMessageType('error')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image className="mr-2 h-5 w-5" />
            Zarządzanie slajdami szkoleń
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Wybierz szkolenie</Label>
            <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz szkolenie" />
              </SelectTrigger>
              <SelectContent>
                {trainings.map(training => (
                  <SelectItem key={training.id} value={training.id}>
                    {training.title} ({training.slides_count} slajdów)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTrainingId && (
            <div className="text-sm text-muted-foreground">
              <p><strong>Instrukcje:</strong></p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Wyeksportuj PDF/PPTX do obrazów (PNG/JPG) używając zewnętrznych narzędzi</li>
                <li>Dodaj obrazy slajdów używając formularza poniżej</li>
                <li>Ustaw numer slajdu i minimalny czas wyświetlania</li>
                <li>Kliknij &quot;Upload slajdów&quot; aby dodać je do systemu</li>
              </ol>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Istniejące slajdy */}
      {selectedTrainingId && existingSlides.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Istniejące slajdy ({existingSlides.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {existingSlides.map(slide => (
                <div key={slide.id} className="relative group">
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <NextImage
                      src={slide.image_url}
                      alt={`Slajd ${slide.slide_number}`}
                      width={400}
                      height={225}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-xs">
                      #{slide.slide_number}
                    </Badge>
                  </div>
                  <div className="absolute top-2 right-2">
                    <Badge variant="outline" className="text-xs">
                      {slide.min_time_seconds}s
                    </Badge>
                  </div>
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(slide.image_url, '_blank')}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteSlide(slide.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nowe slajdy do uploadu */}
      {selectedTrainingId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Dodaj nowe slajdy</CardTitle>
              <Button onClick={addSlideUpload} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Dodaj slajd
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {slideUploads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileImage className="h-12 w-12 mx-auto mb-4" />
                <p>Kliknij &quot;Dodaj slajd&quot; aby rozpocząć upload</p>
              </div>
            ) : (
              <div className="space-y-4">
                {slideUploads.map((slide, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Slajd #{slide.slideNumber}</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSlideUpload(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Obraz slajdu</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleFileSelect(index, file)
                          }}
                        />
                        {slide.preview && (
                          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                            <NextImage
                              src={slide.preview}
                              alt="Podgląd"
                              width={200}
                              height={113}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`slideNumber-${index}`}>Numer slajdu</Label>
                        <Input
                          id={`slideNumber-${index}`}
                          type="number"
                          min="1"
                          value={slide.slideNumber}
                          onChange={(e) => updateSlideUpload(index, { 
                            slideNumber: parseInt(e.target.value) || 1 
                          })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`minTime-${index}`}>Min. czas (sekundy)</Label>
                        <Input
                          id={`minTime-${index}`}
                          type="number"
                          min="1"
                          value={slide.minTimeSeconds}
                          onChange={(e) => updateSlideUpload(index, { 
                            minTimeSeconds: parseInt(e.target.value) || 30 
                          })}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Upload w toku...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                  </div>
                )}

                <Button 
                  onClick={uploadSlides}
                  disabled={isUploading || slideUploads.length === 0}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isUploading ? 'Upload w toku...' : `Upload ${slideUploads.length} slajdów`}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Wiadomości */}
      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          messageType === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
          messageType === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
        }`}>
          {messageType === 'success' ? <CheckCircle className="h-4 w-4" /> : 
           messageType === 'error' ? <AlertCircle className="h-4 w-4" /> : 
           <AlertCircle className="h-4 w-4" />}
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}
