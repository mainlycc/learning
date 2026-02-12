'use client'

import { ExportPdfButton } from './export-pdf-button'

interface ExportPdfWrapperProps {
  results: Array<{
    user_id: string
    full_name: string | null
    email: string
    function: string | null
    training_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
    test_score: number | null
    test_passed: boolean | null
    test_completed_at: string | null
    training_completed_at: string | null
  }>
  trainingTitle: string
}

export function ExportPdfWrapper({ results, trainingTitle }: ExportPdfWrapperProps) {
  return <ExportPdfButton results={results} trainingTitle={trainingTitle} />
}
