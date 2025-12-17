'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, FileUp, File, Image as ImageIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

interface TrainingFile {
  id?: string
  file: File | null
  fileType: 'PDF' | 'PPTX' | 'PNG'
  fileName: string
  fileSize: number
  previewUrl?: string
}

interface TrainingFilesManagerProps {
  trainingId?: string | null
  onFilesChange: (files: TrainingFile[]) => void
  initialFiles?: Array<{
    id: string
    file_path: string
    file_type: 'PDF' | 'PPTX' | 'PNG'
    file_name: string
    file_size: number | null
  }>
}

export function TrainingFilesManager({ 
  trainingId, 
  onFilesChange,
  initialFiles = []
}: TrainingFilesManagerProps) {
  const supabase = createClient()
  const [files, setFiles] = useState<TrainingFile[]>([])
  const [uploading, setUploading] = useState(false)

  // Załaduj istniejące pliki przy inicjalizacji
  useEffect(() => {
    if (initialFiles.length > 0) {
      const loadedFiles: TrainingFile[] = initialFiles.map(f => ({
        id: f.id,
        file: null,
        fileType: f.file_type,
        fileName: f.file_name,
        fileSize: f.file_size || 0,
      }))
      setFiles(loadedFiles)
      onFilesChange(loadedFiles)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Generuj preview URL dla nowych plików
  useEffect(() => {
    const newFiles = files.map(f => {
      if (f.file && !f.previewUrl) {
        const url = URL.createObjectURL(f.file)
        return { ...f, previewUrl: url }
      }
      return f
    })
    
    if (newFiles.some((f, i) => f.previewUrl !== files[i]?.previewUrl)) {
      setFiles(newFiles)
    }

    // Cleanup preview URLs
    return () => {
      newFiles.forEach(f => {
        if (f.previewUrl && f.file) {
          URL.revokeObjectURL(f.previewUrl)
        }
      })
    }
  }, [files.map(f => f.file?.name).join(',')])

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    
    if (selectedFiles.length === 0) return

    const newFiles: TrainingFile[] = []
    
    for (const file of selectedFiles) {
      const validationError = validateFile(file)
      if (validationError) {
        alert(`${file.name}: ${validationError}`)
        continue
      }

      const fileType = getFileType(file.name)
      newFiles.push({
        file,
        fileType,
        fileName: file.name,
        fileSize: file.size,
      })
    }

    if (newFiles.length > 0) {
      const updatedFiles = [...files, ...newFiles]
      setFiles(updatedFiles)
      onFilesChange(updatedFiles)
    }

    // Reset input
    e.target.value = ''
  }

  const handleRemoveFile = async (index: number) => {
    const fileToRemove = files[index]
    
    // Jeśli to istniejący plik (ma id), usuń go z bazy danych i storage
    if (fileToRemove.id && trainingId) {
      try {
        // Pobierz ścieżkę pliku z bazy danych
        const { data: fileData, error: fetchError } = await supabase
          .from('training_files')
          .select('file_path')
          .eq('id', fileToRemove.id)
          .single()

        if (!fetchError && fileData) {
          // Usuń plik z storage
          await supabase.storage
            .from('trainings')
            .remove([fileData.file_path])

          // Usuń rekord z bazy danych
          await supabase
            .from('training_files')
            .delete()
            .eq('id', fileToRemove.id)
        }
      } catch (error) {
        console.error('Błąd podczas usuwania pliku:', error)
        alert('Nie udało się usunąć pliku. Spróbuj ponownie.')
        return
      }
    }
    
    // Cleanup preview URL
    if (fileToRemove.previewUrl && fileToRemove.file) {
      URL.revokeObjectURL(fileToRemove.previewUrl)
    }

    const updatedFiles = files.filter((_, i) => i !== index)
    setFiles(updatedFiles)
    onFilesChange(updatedFiles)
  }

  const getFileIcon = (fileType: 'PDF' | 'PPTX' | 'PNG') => {
    if (fileType === 'PNG') return <ImageIcon className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Pliki szkolenia</Label>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            multiple
            accept=".pdf,.pptx,.png,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png"
            onChange={handleFileSelect}
            className="max-w-md"
            disabled={uploading}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Możesz wgrać wiele plików (PDF, PPTX, PNG). Maksymalny rozmiar pojedynczego pliku: {MAX_FILE_SIZE_MB} MB.
        </p>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <Label>Wybrane pliki ({files.length})</Label>
          <div className="space-y-2">
            {files.map((fileItem, index) => (
              <Card key={index} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {getFileIcon(fileItem.fileType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fileItem.fileName}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {fileItem.fileType}
                          </Badge>
                          <span>{formatFileSize(fileItem.fileSize)}</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

