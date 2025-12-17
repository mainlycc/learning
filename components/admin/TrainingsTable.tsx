'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EditTrainingDialog } from '@/components/admin/EditTrainingDialog'
import { toggleTrainingStatus, deleteTrainings } from '@/app/dashboard/trainings/manage/actions'
import { Power, PowerOff, BarChart3, Trash2, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

type Training = {
  id: string
  title: string
  description: string | null
  file_type: 'PDF' | 'PPTX' | 'PNG'
  duration_minutes: number
  is_active: boolean
  created_at: string
  hasTest?: boolean
}

interface TrainingsTableProps {
  trainings: Training[]
}

export function TrainingsTable({ trainings }: TrainingsTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(trainings.map(t => t.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Czy na pewno chcesz usunąć ${selectedIds.size} ${selectedIds.size === 1 ? 'szkolenie' : 'szkoleń'}? Tej operacji nie można cofnąć.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const formData = new FormData()
      Array.from(selectedIds).forEach(id => {
        formData.append('ids[]', id)
      })
      await deleteTrainings(formData)
      // redirect jest już obsłużony w deleteTrainings
    } catch (error) {
      console.error('Błąd podczas usuwania szkoleń:', error)
      alert('Wystąpił błąd podczas usuwania szkoleń.')
      setIsDeleting(false)
    }
  }

  const allSelected = trainings.length > 0 && selectedIds.size === trainings.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < trainings.length

  return (
    <div className="space-y-4">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-md">
          <span className="text-sm font-medium">
            Zaznaczono: {selectedIds.size} {selectedIds.size === 1 ? 'szkolenie' : 'szkoleń'}
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDeleteSelected}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {isDeleting ? 'Usuwanie...' : `Usuń zaznaczone (${selectedIds.size})`}
          </Button>
        </div>
      )}
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Zaznacz wszystkie"
                />
              </TableHead>
              <TableHead>Tytuł</TableHead>
              <TableHead>Typ pliku</TableHead>
              <TableHead>Czas trwania</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Testy</TableHead>
              <TableHead>Data utworzenia</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trainings.length ? (
              trainings.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(t.id)}
                      onCheckedChange={(checked) => handleSelectOne(t.id, checked === true)}
                      aria-label={`Zaznacz ${t.title}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{t.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t.file_type}</Badge>
                  </TableCell>
                  <TableCell>{t.duration_minutes} min</TableCell>
                  <TableCell>
                    {t.is_active ? (
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                        Aktywne
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700">
                        Nieaktywne
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {t.hasTest ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-sm">Tak</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-muted-foreground">Nie</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {new Date(t.created_at).toLocaleDateString('pl-PL')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <form action={toggleTrainingStatus}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="current_status" value={String(t.is_active)} />
                        <Button
                          type="submit"
                          variant={t.is_active ? "outline" : "default"}
                          size="sm"
                          title={t.is_active ? "Deaktywuj szkolenie" : "Aktywuj szkolenie"}
                        >
                          {t.is_active ? (
                            <>
                              <PowerOff className="h-4 w-4 mr-1" />
                              Deaktywuj
                            </>
                          ) : (
                            <>
                              <Power className="h-4 w-4 mr-1" />
                              Aktywuj
                            </>
                          )}
                        </Button>
                      </form>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a href={`/dashboard/trainings/${t.id}`}>Podgląd</a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <Link href={`/dashboard/trainings/manage/wyniki?trainingId=${t.id}`}>
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Wyniki
                        </Link>
                      </Button>
                      <EditTrainingDialog training={{
                        id: t.id,
                        title: t.title,
                        description: t.description ?? null,
                        duration_minutes: t.duration_minutes,
                        file_type: t.file_type,
                        is_active: t.is_active,
                      }} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  Brak szkoleń
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

