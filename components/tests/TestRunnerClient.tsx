'use client'

import TestRunner from '@/components/tests/TestRunner'

export default function TestRunnerClient(props: {
  userId: string
  test: {
    id: string
    title: string
    pass_threshold: number
    time_limit_minutes: number | null
    randomize_questions: boolean
    questions_count: number
    max_attempts: number | null
  }
  questions: Array<{
    id: string
    test_id: string
    question_type: 'single' | 'multiple' | 'true_false' | 'open' | 'matching' | 'drag_drop' | 'fill_gaps' | 'sorting'
    question_text: string
    points: number
    order_number: number
  }>
  options: Array<{
    id: string
    question_id: string
    option_text: string
    is_correct: boolean
    order_number: number
  }>
  attemptsCount: number
}) {
  return <TestRunner {...props} />
}


