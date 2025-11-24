'use client'

import { UploadDropzone } from '@/components/ui/upload-dropzone'
import { Label } from '@/components/ui/label'

interface TrainingFileUploadProps {
  onFileSelect: (file: File | null) => void
  fileType: 'PDF' | 'PPTX'
  value?: File | null
}

export function TrainingFileUpload({ onFileSelect, fileType, value }: TrainingFileUploadProps) {
  const accept = fileType === 'PDF' 
    ? '.pdf,application/pdf'
    : '.pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation'

  return (
    <div className="space-y-2">
      <Label>Plik szkolenia ({fileType}) *</Label>
      <div className="max-w-md">
        <UploadDropzone
          onFileSelect={onFileSelect}
          accept={accept}
          maxFileSize="40MB"
          fileTypes={fileType}
          maxFiles={1}
          value={value}
          name="file"
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Maksymalny rozmiar: 40 MB. Typ pliku musi zgadzać się z wybranym typem powyżej.
      </p>
    </div>
  )
}

