'use client'

import { useState } from 'react'
import { UploadDropzone } from '@/components/ui/upload-dropzone'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TrainingFileUploadProps {
  onFileSelect: (files: File[]) => void
  value?: File[]
  required?: boolean
}

export function TrainingFileUpload({
  onFileSelect,
  value = [],
  required = true,
}: TrainingFileUploadProps) {
  const accept = '.pdf,.pptx,.png,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/png'

  const handleFileSelect = (file: File | null) => {
    if (file) {
      const newFiles = [...value, file]
      onFileSelect(newFiles)
    }
  }

  const handleRemoveFile = (index: number) => {
    const newFiles = value.filter((_, i) => i !== index)
    onFileSelect(newFiles)
  }

  const getFileType = (fileName: string): 'PDF' | 'PPTX' | 'PNG' => {
    const name = fileName.toLowerCase()
    if (name.endsWith('.pptx')) return 'PPTX'
    if (name.endsWith('.png')) return 'PNG'
    return 'PDF'
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-2">
      <Label>
        Pliki szkolenia {required ? '*' : '(opcjonalnie)'}
      </Label>
      <div className="max-w-md">
        <UploadDropzone 
          onFileSelect={handleFileSelect}
          accept={accept}
          maxFileSize="40MB"
          fileTypes="PDF, PPTX, PNG"
          maxFiles={1}
          value={null}
          name="file"
          required={required && value.length === 0}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Możesz wgrać wiele plików (PDF, PPTX, PNG). Maksymalny rozmiar pojedynczego pliku: 40 MB.
      </p>
      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          <Label className="text-sm">Wybrane pliki ({value.length})</Label>
          <div className="space-y-2">
            {value.map((file, index) => (
              <Card key={index} className="p-3">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {getFileType(file.name)}
                          </Badge>
                          <span>{formatFileSize(file.size)}</span>
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

