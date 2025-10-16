'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'

type QuestionType = 'single' | 'multiple' | 'true_false' | 'open' | 'matching' | 'drag_drop' | 'fill_gaps' | 'sorting'

type Test = {
  id: string
  title: string
  pass_threshold: number
  time_limit_minutes: number | null
  randomize_questions: boolean
  questions_count: number
  max_attempts: number | null
}

type Question = {
  id: string
  test_id: string
  question_type: QuestionType
  question_text: string
  points: number
  order_number: number
}

type Option = {
  id: string
  question_id: string
  option_text: string
  is_correct: boolean
  order_number: number
}

export default function TestRunner({
  userId,
  test,
  questions,
  options,
  attemptsCount = 0,
}: {
  userId: string
  test: Test
  questions: Question[]
  options: Option[]
  attemptsCount?: number
}) {
  const supabase = createClient()
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<{ score: number; passed: boolean; reason?: string } | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(
    test.time_limit_minutes ? test.time_limit_minutes * 60 : null
  )
  const maxAttemptsReached = typeof test.max_attempts === 'number' && attemptsCount >= test.max_attempts

  const questionsOrdered = useMemo(() => {
    let arr = [...questions]
    if (test.randomize_questions) {
      arr = arr.sort(() => Math.random() - 0.5)
    }
    if (test.questions_count && arr.length > test.questions_count) {
      arr = arr.slice(0, test.questions_count)
    }
    return arr
  }, [questions, test.randomize_questions, test.questions_count])

  const optionsByQuestion = useMemo(() => {
    const map: Record<string, Option[]> = {}
    for (const opt of options) {
      if (!map[opt.question_id]) map[opt.question_id] = []
      map[opt.question_id].push(opt)
    }
    for (const qid in map) {
      map[qid].sort((a, b) => a.order_number - b.order_number)
    }
    return map
  }, [options])

  const progress = Math.round(((index + 1) / Math.max(1, questionsOrdered.length)) * 100)

  const selectAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  const computeScore = useCallback(() => {
    let score = 0
    let max = 0
    for (const q of questionsOrdered) {
      max += q.points
      const opts = optionsByQuestion[q.id] || []
      const userAnswer = answers[q.id]
      // Prosta ocena dla MVP: single/true_false – pełne punkty jeśli trafione, multiple – pełne jeśli dokładnie zbiór poprawnych, open – 0 (manual)
      if (q.question_type === 'single' || q.question_type === 'true_false') {
        const correct = opts.find(o => o.is_correct)?.id
        if (userAnswer && userAnswer === correct) score += q.points
      } else if (q.question_type === 'multiple') {
        const correctIds = new Set(opts.filter(o => o.is_correct).map(o => o.id))
        const answerIds = new Set<string>(userAnswer || [])
        if (correctIds.size === answerIds.size && [...correctIds].every(id => answerIds.has(id))) {
          score += q.points
        }
      }
    }
    const percent = max > 0 ? Math.round((score / max) * 100) : 0
    return percent
  }, [answers, optionsByQuestion, questionsOrdered])

  const submit = useCallback(async () => {
    setSubmitting(true)
    try {
      if (maxAttemptsReached) {
        setResult({ score: 0, passed: false, reason: 'Przekroczono liczbę prób.' })
        return
      }
      const percent = computeScore()
      const passed = percent >= test.pass_threshold
      const startedAt = new Date(startTimeRef.current).toISOString()
      const completedAt = new Date().toISOString()
      const { error } = await supabase
        .from('user_test_attempts')
        .insert({
          user_id: userId,
          test_id: test.id,
          started_at: startedAt,
          completed_at: completedAt,
          score: percent,
          passed,
          answers_data: answers,
        })
      if (error) throw error
      setResult({ score: percent, passed })
    } catch {
      // noop – można dodać toast
    } finally {
      setSubmitting(false)
    }
  }, [answers, computeScore, maxAttemptsReached, supabase, test.id, test.pass_threshold, userId])

  // Timer limitu czasu
  useEffect(() => {
    if (remainingSeconds === null) return
    const id = setInterval(() => {
      setRemainingSeconds((sec) => {
        if (sec === null) return sec
        if (sec <= 1) {
          clearInterval(id)
          if (!result && !submitting) {
            submit()
          }
          return 0
        }
        return sec - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [remainingSeconds, result, submitting, submit])

  const q = questionsOrdered[index]
  const qOptions = optionsByQuestion[q?.id] || []

  if (!q) {
    return <Card><CardContent className="p-6">Brak pytań w teście.</CardContent></Card>
  }

  if (result) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-lg font-semibold">Wynik: {result.score}%</div>
          <div className={result.passed ? 'text-green-600' : 'text-red-600'}>
            {result.passed ? 'Zaliczone' : 'Nie zaliczone'} (próg {test.pass_threshold}%)
          </div>
          {result.reason ? (
            <div className="text-sm text-muted-foreground">Powód: {result.reason}</div>
          ) : null}
          <Button onClick={() => { window.location.href = '/dashboard' }}>Powrót do dashboardu</Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Progress value={progress} className="h-2 w-1/2" />
        {remainingSeconds !== null && (
          <div className="text-sm">
            Pozostały czas: {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
          </div>
        )}
        {maxAttemptsReached && (
          <div className="text-sm text-red-600">Przekroczono maksymalną liczbę prób</div>
        )}
      </div>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="font-medium">{index + 1}. {q.question_text}</div>
          <div className="space-y-2">
            {q.question_type === 'single' || q.question_type === 'true_false' ? (
              qOptions.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={q.id}
                    value={opt.id}
                    checked={answers[q.id] === opt.id}
                    onChange={() => selectAnswer(q.id, opt.id)}
                  />
                  <span>{opt.option_text}</span>
                </label>
              ))
            ) : q.question_type === 'multiple' ? (
              qOptions.map((opt) => {
                const set = new Set<string>(answers[q.id] || [])
                const checked = set.has(opt.id)
                return (
                  <label key={opt.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        if (checked) set.delete(opt.id); else set.add(opt.id)
                        selectAnswer(q.id, Array.from(set))
                      }}
                    />
                    <span>{opt.option_text}</span>
                  </label>
                )
              })
            ) : (
              <textarea
                className="w-full rounded border p-2 text-sm"
                rows={5}
                placeholder="Odpowiedź otwarta..."
                value={answers[q.id] || ''}
                onChange={(e) => selectAnswer(q.id, e.target.value)}
              />
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setIndex(Math.max(0, index - 1))}
              disabled={index === 0 || maxAttemptsReached}
            >
              Wstecz
            </Button>
            {index < questionsOrdered.length - 1 ? (
              <Button onClick={() => setIndex(Math.min(questionsOrdered.length - 1, index + 1))} disabled={maxAttemptsReached}>
                Dalej
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting || maxAttemptsReached}>
                {submitting ? 'Zapisuję...' : 'Zakończ test'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


