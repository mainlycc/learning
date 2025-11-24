'use client'

import { useCallback, useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Upload, X, File } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface UploadDropzoneProps {
  onFileSelect: (file: File | null) => void
  accept?: string
  maxFileSize?: string
  fileTypes?: string
  maxFiles?: number
  value?: File | null
  className?: string
  disabled?: boolean
  name?: string
  required?: boolean
}

export function UploadDropzone({
  onFileSelect,
  accept,
  maxFileSize = '40MB',
  fileTypes = 'PDF, PPTX',
  maxFiles = 1,
  value,
  className,
  disabled = false,
  name,
  required = false,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (files: FileList | null) => {
      if (disabled || !files || files.length === 0) return
      const file = files[0]
      onFileSelect(file)
    },
    [onFileSelect, disabled]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragging(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      
      if (disabled) return

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFileChange(files)
      }
    },
    [handleFileChange, disabled]
  )

  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFileSelect(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed',
          value && 'border-primary bg-primary/5'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => handleFileChange(e.target.files)}
          className="hidden"
          disabled={disabled}
          name={name}
          required={required}
          multiple={maxFiles > 1}
        />
        
        {value ? (
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex items-center gap-3 p-4 bg-background rounded-lg border w-full max-w-md">
              <File className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{value.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(value.size)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Kliknij lub przeciągnij, aby zmienić plik
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className={cn(
              'rounded-full p-4 bg-muted',
              isDragging && 'bg-primary/10'
            )}>
              <Upload className={cn(
                'h-8 w-8',
                isDragging ? 'text-primary' : 'text-muted-foreground'
              )} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">
                {isDragging
                  ? 'Upuść plik tutaj'
                  : 'Kliknij lub przeciągnij plik tutaj'}
              </p>
              <p className="text-xs text-muted-foreground">
                {fileTypes} do {maxFileSize}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
