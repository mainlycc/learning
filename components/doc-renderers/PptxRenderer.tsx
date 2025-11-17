'use client'

import type { DocRenderer } from '@cyntler/react-doc-viewer'

export const PPTX_RENDERER_FILE_TYPES = [
  'ppt',
  'pptx',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

const OFFICE_EMBED_BASE = 'https://view.officeapps.live.com/op/embed.aspx'

export const PptxRenderer: DocRenderer = ({ mainState: { currentDocument } }) => {
  if (!currentDocument?.uri) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Brak pliku PPTX do wyświetlenia.
      </div>
    )
  }

  const url = new URL(OFFICE_EMBED_BASE)
  url.searchParams.set('src', currentDocument.uri)
  url.searchParams.set('wdAr', '1')
  url.searchParams.set('wdEmbedFS', 'false')
  url.searchParams.set('wdHideHeaders', 'true')
  url.searchParams.set('wdHideSheetTabs', 'true')
  url.searchParams.set('wdDownloadButton', 'false')
  url.searchParams.set('wdAllowInteractivity', 'false')
  url.searchParams.set('ui', 'pl-PL')

  return (
    <div className="h-full w-full">
      <iframe
        title="PowerPoint viewer"
        src={url.toString()}
        className="h-full w-full border-0"
        allowFullScreen={false}
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      />
    </div>
  )
}

PptxRenderer.fileTypes = PPTX_RENDERER_FILE_TYPES
PptxRenderer.weight = 10
PptxRenderer.fileLoader = ({ fileLoaderComplete }) => {
  if (fileLoaderComplete) {
    fileLoaderComplete(null)
  }
}

