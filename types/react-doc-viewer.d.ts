declare module '@cyntler/react-doc-viewer' {
  import type { ComponentType, CSSProperties, FC, PropsWithChildren } from 'react'

  export interface DocViewerDocument {
    uri?: string
    fileType?: string
    fileName?: string
    fileData?: ArrayBuffer | Uint8Array
  }

  export interface DocViewerProps {
    documents: DocViewerDocument[]
    style?: CSSProperties
    config?: {
      header?: {
        disableHeader?: boolean
        disableFileName?: boolean
        retainURLParams?: boolean
      }
      documentNavigation?: {
        openOnLoad?: boolean
      }
      enableDownload?: boolean
      pdfVerticalScrollByDefault?: boolean
      textSelection?: boolean
    }
    pluginRenderers?: DocRenderer[]
  }

  export interface DocRendererProps {
    mainState: {
      currentDocument?: DocViewerDocument | null
    }
  }

  export interface DocRenderer extends FC<PropsWithChildren<DocRendererProps>> {
    fileTypes: string[]
    weight: number
    fileLoader?: ((params: { fileLoaderComplete: (result?: unknown) => void }) => void) | null
  }

  const DocViewer: ComponentType<DocViewerProps>
  export const DocViewerRenderers: DocRenderer[]

  export default DocViewer
}

