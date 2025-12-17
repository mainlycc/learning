'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'

type TrainingForEdit = {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  file_type: 'PDF' | 'PPTX' | 'PNG'
  is_active: boolean
}

export function EditTrainingDialog({ training }: { training: TrainingForEdit }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/dashboard/trainings/manage/new?editId=${training.id}`}>
        Edytuj
      </Link>
    </Button>
  )
}


