'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface TrainingSelectProps {
  trainings: Array<{ id: string; title: string }>
  selectedTrainingId: string
}

export function TrainingSelect({ trainings, selectedTrainingId }: TrainingSelectProps) {
  const router = useRouter()

  const handleValueChange = (value: string) => {
    router.push(`/dashboard/trainings/manage/wyniki?trainingId=${value}`)
  }

  return (
    <Select value={selectedTrainingId || ''} onValueChange={handleValueChange}>
      <SelectTrigger className="w-full max-w-md">
        <SelectValue placeholder="Wybierz szkolenie" />
      </SelectTrigger>
      <SelectContent>
        {trainings.map((training) => (
          <SelectItem key={training.id} value={training.id}>
            {training.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

