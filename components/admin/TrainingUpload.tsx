'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Clock, Eye, Lock } from 'lucide-react'
import { toast } from 'sonner'

type Training = {
  id: string
  title: string
  file_path: string
}

type AccessPolicy = {
  id: string
  training_id: string
  policy_type: 'full' | 'preview' | 'time_limited'
  time_limit_days: number | null
}

export default function TrainingUpload() {
  const supabase = createClient()
  const [trainings, setTrainings] = useState<Training[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  
  // Polityki dostępu
  const [selectedPolicyType, setSelectedPolicyType] = useState<'full' | 'preview' | 'time_limited'>('full')
  const [timeLimitDays, setTimeLimitDays] = useState<number>(30)
  const [existingPolicy, setExistingPolicy] = useState<AccessPolicy | null>(null)

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

  // Załaduj politykę dostępu gdy zmieni się wybrane szkolenie
  useEffect(() => {
    const loadPolicy = async () => {
      if (!selectedId) {
        setExistingPolicy(null)
        return
      }

      try {
        const { data, error } = await supabase
          .from('access_policies')
          .select('*')
          .eq('training_id', selectedId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw error
        }

        if (data) {
          setExistingPolicy(data)
          setSelectedPolicyType(data.policy_type)
          setTimeLimitDays(data.time_limit_days || 30)
        } else {
          setExistingPolicy(null)
          setSelectedPolicyType('full')
          setTimeLimitDays(30)
        }
      } catch (error) {
        console.error('Błąd ładowania polityki dostępu:', error)
        setExistingPolicy(null)
      }
    }

    loadPolicy()
  }, [selectedId, supabase])

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
      toast.success('Plik przesłany i zapisany pomyślnie.')
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
      toast.error(err?.message || 'Błąd podczas uploadu')
    } finally {
      setIsUploading(false)
    }
  }

  const onSavePolicy = async () => {
    if (!selectedId) return

    try {
      const policyData = {
        training_id: selectedId,
        policy_type: selectedPolicyType,
        time_limit_days: selectedPolicyType === 'time_limited' ? timeLimitDays : null
      }

      if (existingPolicy) {
        // Aktualizuj istniejącą politykę
        const { error } = await supabase
          .from('access_policies')
          .update(policyData)
          .eq('id', existingPolicy.id)

        if (error) throw error
        setMessage('Polityka dostępu zaktualizowana pomyślnie.')
        toast.success('Polityka dostępu zaktualizowana pomyślnie.')
      } else {
        // Utwórz nową politykę
        const { error } = await supabase
          .from('access_policies')
          .insert(policyData)

        if (error) throw error
        setMessage('Polityka dostępu utworzona pomyślnie.')
        toast.success('Polityka dostępu utworzona pomyślnie.')
      }

      // Odśwież politykę
      const { data } = await supabase
        .from('access_policies')
        .select('*')
        .eq('training_id', selectedId)
        .single()

      setExistingPolicy(data)
    } catch (e) {
      const err = e as { message?: string }
      setMessage(err?.message || 'Błąd podczas zapisywania polityki dostępu')
      toast.error(err?.message || 'Błąd podczas zapisywania polityki dostępu')
    }
  }

  const getPolicyIcon = (type: string) => {
    switch (type) {
      case 'full': return <Lock className="h-4 w-4" />
      case 'preview': return <Eye className="h-4 w-4" />
      case 'time_limited': return <Clock className="h-4 w-4" />
      default: return <Shield className="h-4 w-4" />
    }
  }

  const getPolicyLabel = (type: string) => {
    switch (type) {
      case 'full': return 'Pełny dostęp'
      case 'preview': return 'Tylko podgląd'
      case 'time_limited': return 'Dostęp czasowy'
      default: return 'Nieznany typ'
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload pliku */}
      <Card>
        <CardHeader>
          <CardTitle>Upload pliku szkolenia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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

          <Button onClick={onUpload} disabled={!canUpload}>
            {isUploading ? 'Wgrywanie...' : 'Wyślij plik'}
          </Button>
        </CardContent>
      </Card>

      {/* Polityki dostępu */}
      {selectedId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Polityki dostępu
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingPolicy && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getPolicyIcon(existingPolicy.policy_type)}
                  <span className="font-medium">
                    Obecna polityka: {getPolicyLabel(existingPolicy.policy_type)}
                  </span>
                </div>
                {existingPolicy.time_limit_days && (
                  <p className="text-sm text-muted-foreground">
                    Limit czasowy: {existingPolicy.time_limit_days} dni
                  </p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Typ polityki dostępu</Label>
              <Select value={selectedPolicyType} onValueChange={(value: 'full' | 'preview' | 'time_limited') => setSelectedPolicyType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Pełny dostęp - użytkownicy mają pełny dostęp do szkolenia
                    </div>
                  </SelectItem>
                  <SelectItem value="preview">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Tylko podgląd - ograniczony dostęp do pierwszych slajdów
                    </div>
                  </SelectItem>
                  <SelectItem value="time_limited">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Dostęp czasowy - dostęp przez określoną liczbę dni
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPolicyType === 'time_limited' && (
              <div className="space-y-2">
                <Label htmlFor="timeLimit">Limit czasowy (dni)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="1"
                  max="365"
                  value={timeLimitDays}
                  onChange={(e) => setTimeLimitDays(parseInt(e.target.value) || 30)}
                />
                <p className="text-sm text-muted-foreground">
                  Użytkownicy będą mieli dostęp do szkolenia przez {timeLimitDays} dni od pierwszego otwarcia.
                </p>
              </div>
            )}

            {selectedPolicyType === 'preview' && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Uwaga:</strong> W trybie podglądu użytkownicy będą mieli dostęp tylko do pierwszych slajdów szkolenia.
                  Pełna implementacja ograniczeń będzie dostępna w przyszłych wersjach.
                </p>
              </div>
            )}

            <Button onClick={onSavePolicy} disabled={!selectedId}>
              {existingPolicy ? 'Zaktualizuj politykę' : 'Utwórz politykę'}
            </Button>
          </CardContent>
        </Card>
      )}

      {message && (
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      )}
    </div>
  )
}


