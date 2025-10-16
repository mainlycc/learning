'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Training = {
  id: string
  title: string
  file_path: string
}

export default function TrainingUpload() {
  const supabase = createClient()
  const [trainings, setTrainings] = useState<Training[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('trainings')
        .select('id, title, file_path')
        .order('title', { ascending: true })
      setTrainings(data || [])
    }
    load()
  }, [supabase])

  const canUpload = useMemo(() => !!selectedId && !!file && !isUploading, [selectedId, file, isUploading])

  const getFileType = (f: File): 'PDF' | 'PPTX' => {
    const name = f.name.toLowerCase()
    if (name.endsWith('.pptx')) return 'PPTX'
    return 'PDF'
  }

  const onUpload = async () => {
    if (!file || !selectedId) return
    setIsUploading(true)
    setMessage(null)

    try {
      const user = (await supabase.auth.getUser()).data.user
      if (!user) throw new Error('Brak sesji użytkownika')

      const path = `${user.id}/${selectedId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('trainings')
        .upload(path, file, { upsert: false })
      if (uploadError) throw uploadError

      const fileType = getFileType(file)
      const { error: updateError } = await supabase
        .from('trainings')
        .update({ file_path: path, file_type: fileType })
        .eq('id', selectedId)
      if (updateError) throw updateError

      setMessage('Plik przesłany i zapisany pomyślnie.')
      // odśwież listę
      const { data } = await supabase
        .from('trainings')
        .select('id, title, file_path')
        .order('title', { ascending: true })
      setTrainings(data || [])
      setFile(null)
    } catch (e) {
      const err = e as { message?: string }
      setMessage(err?.message || 'Błąd podczas uploadu')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Wybierz szkolenie</Label>
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Wybierz szkolenie" />
          </SelectTrigger>
          <SelectContent>
            {trainings.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.title} {t.file_path ? '• (plik obecny)' : '• (brak pliku)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="file">Plik (PDF lub PPTX)</Label>
        <Input
          id="file"
          type="file"
          accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onUpload} disabled={!canUpload}>
          {isUploading ? 'Wgrywanie...' : 'Wyślij plik'}
        </Button>
      </div>

      {message && (
        <div className="text-sm text-muted-foreground">{message}</div>
      )}
    </div>
  )
}


