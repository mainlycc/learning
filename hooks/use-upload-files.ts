'use client'

import { useState, useCallback } from 'react'

interface UseUploadFilesOptions {
  route?: string
  maxFiles?: number
  maxFileSize?: string
  accept?: string
}

interface FileControl {
  files: File[]
  addFile: (file: File) => void
  removeFile: (index: number) => void
  clearFiles: () => void
  setFiles: (files: File[]) => void
}

export function useUploadFiles(options: UseUploadFilesOptions = {}): {
  control: FileControl
} {
  const [files, setFiles] = useState<File[]>([])

  const addFile = useCallback((file: File) => {
    setFiles((prev) => {
      const maxFiles = options.maxFiles || 1
      if (prev.length >= maxFiles) {
        return prev
      }
      return [...prev, file]
    })
  }, [options.maxFiles])

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const clearFiles = useCallback(() => {
    setFiles([])
  }, [])

  const setFilesDirect = useCallback((newFiles: File[]) => {
    setFiles(newFiles)
  }, [])

  return {
    control: {
      files,
      addFile,
      removeFile,
      clearFiles,
      setFiles: setFilesDirect,
    },
  }
}

