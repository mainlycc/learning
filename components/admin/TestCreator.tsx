'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

type Training = { id: string; title: string }
type TestRow = { id: string; title: string }

interface TestCreatorProps {
  initialTrainingId?: string
}

export default function TestCreator({ initialTrainingId }: TestCreatorProps) {
  const supabase = createClient()
  const [trainings, setTrainings] = useState<Training[]>([])
  const [selectedTrainingId, setSelectedTrainingId] = useState(initialTrainingId || '')

  const [testTitle, setTestTitle] = useState('Test końcowy')
  const [passThreshold, setPassThreshold] = useState(80)
  const [timeLimit, setTimeLimit] = useState<number | ''>('')
  const [maxAttempts, setMaxAttempts] = useState<number | ''>('')
  const [questionsCount, setQuestionsCount] = useState<number | ''>('')
  const [randomize, setRandomize] = useState<'true' | 'false'>('true')
  const [tests, setTests] = useState<TestRow[]>([])
  const [selectedTestId, setSelectedTestId] = useState('')
  const [creating, setCreating] = useState(false)

  // Question form
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<'single' | 'multiple' | 'true_false' | 'open' | 'fill_gaps' | 'matching'>('single')
  const [points, setPoints] = useState(1)
  const [options, setOptions] = useState<Array<{ text: string; correct: boolean }>>([
    { text: '', correct: false },
    { text: '', correct: false },
  ])
  const [addingQuestion, setAddingQuestion] = useState(false)

  useEffect(() => {
    const loadTrainings = async () => {
      const { data } = await supabase
        .from('trainings')
        .select('id, title')
        .order('title', { ascending: true })
      setTrainings(data || [])
      // Jeśli mamy initialTrainingId, ustaw go po załadowaniu szkoleń
      if (initialTrainingId && data?.some(t => t.id === initialTrainingId)) {
        setSelectedTrainingId(initialTrainingId)
      }
    }
    loadTrainings()
  }, [supabase, initialTrainingId])

  const loadTests = useCallback(async (trainingId: string, preferredTestId?: string) => {
    if (!trainingId) {
      setTests([])
      setSelectedTestId('')
      return
    }
    const { data } = await supabase
      .from('tests')
      .select('id, title')
      .eq('training_id', trainingId)
      .order('created_at', { ascending: false })
    const loadedTests = data || []
    setTests(loadedTests)
    if (!loadedTests.length) {
      setSelectedTestId('')
      return
    }
    if (preferredTestId && loadedTests.some((test) => test.id === preferredTestId)) {
      setSelectedTestId(preferredTestId)
      return
    }
    setSelectedTestId((prev) => (prev && loadedTests.some((test) => test.id === prev) ? prev : loadedTests[0].id))
  }, [supabase])

  useEffect(() => {
    if (!selectedTrainingId) {
      setTests([])
      setSelectedTestId('')
      return
    }
    loadTests(selectedTrainingId)
  }, [selectedTrainingId, loadTests])

  const canCreateTest = useMemo(() => !!selectedTrainingId && !!testTitle && !creating, [selectedTrainingId, testTitle, creating])
  const canAddQuestion = useMemo(() => !!selectedTestId && !!questionText && !addingQuestion, [selectedTestId, questionText, addingQuestion])

  const handleCreateTest = async () => {
    if (!selectedTrainingId) return
    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('tests')
        .insert({
          training_id: selectedTrainingId,
          title: testTitle,
          pass_threshold: passThreshold,
          time_limit_minutes: timeLimit === '' ? null : Number(timeLimit),
          max_attempts: maxAttempts === '' ? null : Number(maxAttempts),
          questions_count: questionsCount === '' ? 0 : Number(questionsCount),
          randomize_questions: randomize === 'true',
        })
        .select('id, title')
        .single()
      if (error) throw error
      if (data) {
        await loadTests(selectedTrainingId, data.id)
      }
    } catch {
      // noop
    } finally {
      setCreating(false)
    }
  }

  const handleAddOption = () => setOptions(prev => [...prev, { text: '', correct: false }])
  const handleChangeOption = (idx: number, prop: 'text' | 'correct', value: string | boolean) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, [prop]: value } : o))
  }

  const handleAddQuestion = async () => {
    if (!selectedTestId) return
    setAddingQuestion(true)
    try {
      // Pobierz maksymalny order_number dla tego testu
      const { data: existingQuestions } = await supabase
        .from('test_questions')
        .select('order_number')
        .eq('test_id', selectedTestId)
        .order('order_number', { ascending: false })
        .limit(1)

      const nextOrderNumber = existingQuestions && existingQuestions.length > 0
        ? existingQuestions[0].order_number + 1
        : 1

      const { data: q, error: qErr } = await supabase
        .from('test_questions')
        .insert({
          test_id: selectedTestId,
          question_type: questionType,
          question_text: questionText,
          points,
          order_number: nextOrderNumber,
        })
        .select('id')
        .single()
      if (qErr) throw qErr

      if (questionType !== 'open') {
        const payload = options
          .filter(o => o.text.trim())
          .map((o, idx) => ({
            question_id: q!.id,
            option_text: o.text.trim(),
            is_correct: o.correct,
            order_number: idx + 1,
          }))
        if (payload.length) {
          const { error: oErr } = await supabase.from('test_question_options').insert(payload)
          if (oErr) throw oErr
        }
      }

      // Reset fields
      setQuestionText('')
      setQuestionType('single')
      setPoints(1)
      setOptions([{ text: '', correct: false }, { text: '', correct: false }])
    } catch {
      // noop
    } finally {
      setAddingQuestion(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Szkolenie</Label>
            <Select 
              value={selectedTrainingId} 
              onValueChange={setSelectedTrainingId}
              disabled={!!initialTrainingId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Wybierz szkolenie" />
              </SelectTrigger>
              <SelectContent>
                {trainings.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {initialTrainingId && (
              <p className="text-xs text-muted-foreground">
                Szkolenie jest przypisane do tego testu
              </p>
            )}
          </div>

          {selectedTrainingId ? (
            <div className="space-y-2">
              <Label htmlFor="testSelect">Test (wybierz istniejący lub utwórz nowy)</Label>
              <Select
                value={selectedTestId}
                onValueChange={(value) => setSelectedTestId(value)}
                disabled={!tests.length}
              >
                <SelectTrigger id="testSelect">
                  <SelectValue placeholder={tests.length ? 'Wybierz test' : 'Brak testów dla tego szkolenia'} />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((test) => (
                    <SelectItem key={test.id} value={test.id}>
                      {test.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!tests.length && (
                <p className="text-sm text-muted-foreground">
                  Utwórz nowy test, aby móc dodawać pytania.
                </p>
              )}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="testTitle">Tytuł testu</Label>
              <Input id="testTitle" value={testTitle} onChange={(e) => setTestTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pass">Próg zaliczenia (%)</Label>
              <Input id="pass" type="number" min={0} max={100} value={passThreshold} onChange={(e) => setPassThreshold(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Limit czasu (min)</Label>
              <Input id="time" type="number" min={1} value={timeLimit} onChange={(e) => setTimeLimit(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max">Maks. prób</Label>
              <Input id="max" type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="count">Liczba pytań (0 = wszystkie)</Label>
              <Input id="count" type="number" min={0} value={questionsCount} onChange={(e) => setQuestionsCount(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Losowanie pytań</Label>
              <Select value={randomize} onValueChange={(v: 'true' | 'false') => setRandomize(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Tak</SelectItem>
                  <SelectItem value="false">Nie</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleCreateTest} disabled={!canCreateTest}>{creating ? 'Tworzenie...' : 'Utwórz test'}</Button>
          {selectedTestId ? (
            <div className="text-sm text-muted-foreground">
              Aktualnie dodajesz pytania do: {tests.find((t) => t.id === selectedTestId)?.title || 'wybrany test'}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="font-medium">Dodaj pytanie</div>
          <div className="space-y-2">
            <Label htmlFor="qtext">Treść pytania</Label>
            <Input id="qtext" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={questionType} onValueChange={(v: 'single' | 'multiple' | 'true_false' | 'open' | 'fill_gaps' | 'matching') => setQuestionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="multiple">Multiple</SelectItem>
                  <SelectItem value="true_false">Prawda/Fałsz</SelectItem>
                  <SelectItem value="open">Otwarta</SelectItem>
                  <SelectItem value="fill_gaps">Uzupełnij luki</SelectItem>
                  <SelectItem value="matching">Dopasuj pary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Punkty</Label>
              <Input id="points" type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
          </div>

          {questionType === 'fill_gaps' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-md">
                <h4 className="font-medium mb-2">Instrukcje dla pytań &quot;Uzupełnij luki&quot;:</h4>
                <p className="text-sm text-gray-600 mb-2">
                  W treści pytania użyj znaczników <code className="bg-gray-200 px-1 rounded">{`{{gap1}}`}</code>, <code className="bg-gray-200 px-1 rounded">{`{{gap2}}`}</code> itd. 
                  dla miejsc gdzie użytkownik ma wpisać odpowiedź.
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Przykład:</strong> &quot;Stolicą Polski jest {`{{gap1}}`}, a największą rzeką {`{{gap2}}`}.&quot;
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Poprawne odpowiedzi dla luk:</Label>
                {options.map((o, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm font-medium">Luka {idx + 1}:</span>
                    <Input
                      placeholder={`Poprawna odpowiedź dla luki ${idx + 1}`}
                      value={o.text}
                      onChange={(e) => handleChangeOption(idx, 'text', e.target.value)}
                    />
                    <input 
                      type="checkbox" 
                      checked={o.correct} 
                      onChange={(e) => handleChangeOption(idx, 'correct', e.target.checked)}
                      className="hidden"
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={handleAddOption}>Dodaj lukę</Button>
              </div>
            </div>
          )}

          {questionType === 'matching' && (
            <div className="space-y-4">
              <div className="p-3 bg-green-50 rounded-md">
                <h4 className="font-medium mb-2">Instrukcje dla pytań &quot;Dopasuj pary&quot;:</h4>
                <p className="text-sm text-gray-600">
                  Dodaj elementy w parach - pierwszy element każdej pary to element do dopasowania, 
                  drugi to poprawna odpowiedź.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label>Pary do dopasowania:</Label>
                {Array.from({ length: Math.ceil(options.length / 2) }, (_, pairIdx) => (
                  <div key={pairIdx} className="grid grid-cols-2 gap-2 p-3 border rounded">
                    <div>
                      <Label className="text-sm">Element {pairIdx + 1}:</Label>
                      <Input
                        placeholder="Element do dopasowania"
                        value={options[pairIdx * 2]?.text || ''}
                        onChange={(e) => handleChangeOption(pairIdx * 2, 'text', e.target.value)}
                      />
                      <input 
                        type="checkbox" 
                        checked={options[pairIdx * 2]?.correct || false} 
                        onChange={() => handleChangeOption(pairIdx * 2, 'correct', false)}
                        className="hidden"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Poprawna odpowiedź:</Label>
                      <Input
                        placeholder="Poprawna odpowiedź"
                        value={options[pairIdx * 2 + 1]?.text || ''}
                        onChange={(e) => handleChangeOption(pairIdx * 2 + 1, 'text', e.target.value)}
                      />
                      <input 
                        type="checkbox" 
                        checked={options[pairIdx * 2 + 1]?.correct || true} 
                        onChange={() => handleChangeOption(pairIdx * 2 + 1, 'correct', true)}
                        className="hidden"
                      />
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => setOptions(prev => [...prev, { text: '', correct: false }, { text: '', correct: true }])}>
                  Dodaj parę
                </Button>
              </div>
            </div>
          )}

          {questionType !== 'open' && questionType !== 'fill_gaps' && questionType !== 'matching' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Odpowiedzi</Label>
                <Button type="button" variant="outline" onClick={handleAddOption}>Dodaj opcję</Button>
              </div>
              <div className="space-y-2">
                {options.map((o, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      placeholder={`Opcja ${idx + 1}`}
                      value={o.text}
                      onChange={(e) => handleChangeOption(idx, 'text', e.target.value)}
                    />
                    <label className="flex items-center gap-1 text-sm">
                      <input type="checkbox" checked={o.correct} onChange={(e) => handleChangeOption(idx, 'correct', e.target.checked)} />
                      Poprawna
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={handleAddQuestion} disabled={!canAddQuestion}>{addingQuestion ? 'Dodawanie...' : 'Dodaj pytanie do testu'}</Button>
        </CardContent>
      </Card>
    </div>
  )
}


