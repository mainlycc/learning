'use client'

import { useState, useEffect, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react'
import JSZip from 'jszip'

interface TaskTrainingViewerProps {
  fileType: 'PDF' | 'PPTX' | 'PNG'
  filePath: string
  title: string
  supabase: SupabaseClient
  onSlideCountChange?: (count: number | null) => void
}

export function TaskTrainingViewer({
  fileType,
  filePath,
  title,
  supabase,
  onSlideCountChange
}: TaskTrainingViewerProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [signedUrlExpiresAt, setSignedUrlExpiresAt] = useState<number | null>(null)

  const extractPptxSlideCount = useCallback(async (signedUrl: string) => {
    if (fileType !== 'PPTX' || !onSlideCountChange) return

    try {
      const response = await fetch(signedUrl)
      if (!response.ok) {
        throw new Error('Nie udało się pobrać pliku PPTX.')
      }

      const arrayBuffer = await response.arrayBuffer()
      const zip = await JSZip.loadAsync(arrayBuffer)
      const slideFiles = Object.keys(zip.files).filter(
        (name) => name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      )

      const count = slideFiles.length || null
      onSlideCountChange(count)
    } catch (error) {
      console.error('Błąd liczenia slajdów PPTX:', error)
      onSlideCountChange(null)
    }
  }, [fileType, onSlideCountChange])

  const refreshSignedUrl = useCallback(async () => {
    if (!filePath) return

    setStatus('loading')
    setError(null)

    try {
      const { data, error: urlError } = await supabase.storage
        .from('trainings')
        .createSignedUrl(filePath, 60 * 60) // 1h

      if (urlError || !data?.signedUrl) {
        throw new Error(urlError?.message || 'Nie udało się wygenerować adresu podglądu.')
      }

      let finalUrl = data.signedUrl

      // Dla PDF dodaj parametry URL
      if (fileType === 'PDF') {
        const url = new URL(finalUrl)
        url.hash = '#page=1&zoom=100&view=FitH'
        finalUrl = url.toString()
      }
      // Dla PNG nie trzeba nic robić - zwykły URL obrazu

      setSignedUrl(finalUrl)
      setSignedUrlExpiresAt(Date.now() + 60 * 60 * 1000)
      setStatus('ready')
      
      // Dla PPTX wyciągnij liczbę slajdów
      if (fileType === 'PPTX') {
        await extractPptxSlideCount(data.signedUrl)
      }
    } catch (err) {
      console.error(err)
      setSignedUrlExpiresAt(null)
      setSignedUrl(null)
      const fileTypeName = fileType === 'PDF' ? 'PDF' : fileType === 'PNG' ? 'PNG' : 'PPTX'
      setError(err instanceof Error ? err.message : `Nieznany błąd podglądu ${fileTypeName}.`)
      setStatus('error')
    }
  }, [filePath, fileType, supabase, extractPptxSlideCount])

  // Załaduj plik przy inicjalizacji
  useEffect(() => {
    if (filePath) {
      refreshSignedUrl()
    } else {
      setSignedUrl(null)
      setStatus('idle')
      setError(null)
      setSignedUrlExpiresAt(null)
    }
  }, [filePath, refreshSignedUrl])

  // Odśwież URL przed wygaśnięciem
  useEffect(() => {
    if (!signedUrlExpiresAt) return

    const timeout = setTimeout(() => {
      refreshSignedUrl()
    }, Math.max(signedUrlExpiresAt - Date.now() - 60_000, 30_000))

    return () => clearTimeout(timeout)
  }, [signedUrlExpiresAt, refreshSignedUrl])

  const canRefresh = status !== 'loading'

  // Renderowanie PPTX używając Office Online Viewer
  const renderPPTX = () => {
    if (!signedUrl) return null

    const OFFICE_EMBED_BASE = 'https://view.officeapps.live.com/op/embed.aspx'
    const url = new URL(OFFICE_EMBED_BASE)
    url.searchParams.set('src', signedUrl)
    url.searchParams.set('wdAr', '1')
    url.searchParams.set('wdEmbedFS', 'false')
    url.searchParams.set('wdHideHeaders', 'true')
    url.searchParams.set('wdHideSheetTabs', 'true')
    url.searchParams.set('wdDownloadButton', 'false')
    url.searchParams.set('wdAllowInteractivity', 'false')
    url.searchParams.set('ui', 'pl-PL')

    return (
      <iframe
        title={`Podgląd ${title}`}
        src={url.toString()}
        className="h-full w-full border-0"
        allowFullScreen={false}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    )
  }

  // Renderowanie PDF używając iframe
  const renderPDF = () => {
    if (!signedUrl) return null

    return (
      <iframe
        title={`Podgląd ${title}`}
        src={signedUrl}
        className="h-full w-full border-0"
        allowFullScreen
      />
    )
  }

  // Renderowanie PNG jako obraz
  const renderPNG = () => {
    if (!signedUrl) return null

    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <img
          src={signedUrl}
          alt={title}
          className="max-w-full max-h-full object-contain"
        />
      </div>
    )
  }

  return (
    <div className="relative h-full flex-1 min-h-0 bg-gray-100 dark:bg-gray-900">
      {status === 'loading' && (
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ładowanie pliku {fileType}...</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Nie udało się wyświetlić pliku {fileType}.</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" onClick={refreshSignedUrl}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Spróbuj ponownie
          </Button>
        </div>
      )}

      {status === 'ready' && signedUrl && (
        <div className="h-full w-full">
          {fileType === 'PDF' ? renderPDF() : fileType === 'PNG' ? renderPNG() : renderPPTX()}
        </div>
      )}

      {status === 'ready' && !signedUrl && (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Brak danych do wyświetlenia.
        </div>
      )}

      <div className="absolute right-4 top-4 flex items-center gap-2 z-10">
        <Badge variant="secondary" className="text-xs uppercase">
          {fileType}
        </Badge>
        <Button
          size="icon"
          variant="outline"
          onClick={refreshSignedUrl}
          disabled={!canRefresh}
          className="bg-background/80 backdrop-blur-sm"
        >
          <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
        </Button>
      </div>
    </div>
  )
}

