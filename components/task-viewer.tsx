'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TaskTrainingViewer } from '@/components/task-training-viewer'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'

interface Training {
  id: string
  title: string
  description: string | null
  file_type: 'PDF' | 'PPTX' | 'PNG'
  file_path: string
}

interface TaskViewerProps {
  trainings: Training[]
}

export function TaskViewer({ trainings }: TaskViewerProps) {
  const supabase = createClient()
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentTraining = trainings[currentIndex]
  const hasNext = currentIndex < trainings.length - 1
  const hasPrevious = currentIndex > 0

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (hasPrevious) {
      setCurrentIndex(prev => prev - 1)
    }
  }

  if (!currentTraining) {
    return null
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="p-6 border-b bg-background">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{currentTraining.title}</h1>
              <span className="text-sm text-muted-foreground">
                ({currentIndex + 1} / {trainings.length})
              </span>
            </div>
            {currentTraining.description && (
              <p className="text-sm text-muted-foreground">{currentTraining.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasPrevious && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex items-center gap-2"
              >
                <ChevronRight className="h-4 w-4 rotate-180" />
                Poprzednie
              </Button>
            )}
            {hasNext && (
              <Button
                onClick={handleNext}
                className="flex items-center gap-2"
              >
                Następne szkolenie
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {!hasNext && (
              <span className="text-sm text-muted-foreground">
                Ostatnie szkolenie
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <TaskTrainingViewer
          key={currentTraining.id}
          fileType={currentTraining.file_type}
          filePath={currentTraining.file_path}
          title={currentTraining.title}
          supabase={supabase}
        />
      </div>
    </div>
  )
}

