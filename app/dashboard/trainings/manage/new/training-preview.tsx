'use client'

import { createClient } from '@/lib/supabase/client'
import { TaskTrainingViewer } from '@/components/task-training-viewer'

interface TrainingPreviewProps {
  fileType: 'PDF' | 'PPTX' | 'PNG'
  filePath: string
  title: string
}

export function TrainingPreview({ fileType, filePath, title }: TrainingPreviewProps) {
  const supabase = createClient()

  return (
    <div className="h-full w-full">
      <TaskTrainingViewer
        fileType={fileType}
        filePath={filePath}
        title={title}
        supabase={supabase}
      />
    </div>
  )
}

