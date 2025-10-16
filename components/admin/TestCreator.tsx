'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'

type Training = { id: string; title: string }
type TestRow = { id: string; title: string }

export default function TestCreator() {
  const supabase = createClient()
  const [trainings, setTrainings] = useState<Training[]>([])
  const [selectedTrainingId, setSelectedTrainingId] = useState('')

  const [testTitle, setTestTitle] = useState('Test końcowy')
  const [passThreshold, setPassThreshold] = useState(80)
  const [timeLimit, setTimeLimit] = useState<number | ''>('')
  const [maxAttempts, setMaxAttempts] = useState<number | ''>('')
  const [questionsCount, setQuestionsCount] = useState<number | ''>('')
  const [randomize, setRandomize] = useState<'true' | 'false'>('true')
  const [createdTest, setCreatedTest] = useState<TestRow | null>(null)
  const [creating, setCreating] = useState(false)

  // Question form
  const [questionText, setQuestionText] = useState('')
  const [questionType, setQuestionType] = useState<'single' | 'multiple' | 'true_false' | 'open'>('single')
  const [points, setPoints] = useState(1)
  const [options, setOptions] = useState<Array<{ text: string; correct: boolean }>>([
    { text: '', correct: false },
    { text: '', correct: false },
  ])
  const [addingQuestion, setAddingQuestion] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('trainings')
        .select('id, title')
        .order('title', { ascending: true })
      setTrainings(data || [])
    }
    load()
  }, [supabase])

  const canCreateTest = useMemo(() => !!selectedTrainingId && !!testTitle && !creating, [selectedTrainingId, testTitle, creating])
  const canAddQuestion = useMemo(() => !!createdTest && !!questionText && !addingQuestion, [createdTest, questionText, addingQuestion])

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
      setCreatedTest(data!)
    } catch (e) {
      // noop
    } finally {
      setCreating(false)
    }
  }

  const handleAddOption = () => setOptions(prev => [...prev, { text: '', correct: false }])
  const handleChangeOption = (idx: number, prop: 'text' | 'correct', value: any) => {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, [prop]: value } : o))
  }

  const handleAddQuestion = async () => {
    if (!createdTest) return
    setAddingQuestion(true)
    try {
      const { data: q, error: qErr } = await supabase
        .from('test_questions')
        .insert({
          test_id: createdTest.id,
          question_type: questionType,
          question_text: questionText,
          points,
          order_number: Date.now(),
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
    } catch (e) {
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
            <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
              <SelectTrigger>
                <SelectValue placeholder="Wybierz szkolenie" />
              </SelectTrigger>
              <SelectContent>
                {trainings.map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          {createdTest ? (
            <div className="text-sm text-muted-foreground">Utworzono test: {createdTest.title}</div>
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
              <Select value={questionType} onValueChange={(v: any) => setQuestionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="multiple">Multiple</SelectItem>
                  <SelectItem value="true_false">Prawda/Fałsz</SelectItem>
                  <SelectItem value="open">Otwarta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">Punkty</Label>
              <Input id="points" type="number" min={1} value={points} onChange={(e) => setPoints(Number(e.target.value))} />
            </div>
          </div>

          {questionType !== 'open' && (
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


