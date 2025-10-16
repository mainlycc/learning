'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Calendar, Download, FileText, BarChart3 } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface MonthlyReport {
  id: string
  year: number
  month: number
  generated_by: string
  generated_at: string
  data: ReportData
  file_path: string | null
}

interface ReportData {
  trainings_completed: number
  total_users_active: number
  average_completion_time: number
  tests_passed: number
  tests_failed: number
  unique_trainings_completed: number
}

export function MonthlyReportGenerator() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedReport, setGeneratedReport] = useState<MonthlyReport | null>(null)
  const [existingReports, setExistingReports] = useState<MonthlyReport[]>([])
  const [loadingReports, setLoadingReports] = useState(true)

  const supabase = createClient()

  // Pobierz istniejące raporty
  const loadExistingReports = async () => {
    try {
      const { data, error } = await supabase
        .from('monthly_reports')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(12)

      if (error) throw error
      setExistingReports(data || [])
    } catch (error) {
      console.error('Błąd ładowania raportów:', error)
    } finally {
      setLoadingReports(false)
    }
  }

  // Generuj raport miesięczny
  const generateReport = async () => {
    setIsGenerating(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Brak sesji użytkownika')

      // Wywołaj funkcję SQL do generowania raportu
      const { data, error } = await supabase.rpc('generate_monthly_report', {
        p_year: selectedYear,
        p_month: selectedMonth,
        p_generated_by: user.id
      })

      if (error) throw error

      // Pobierz wygenerowany raport
      const { data: report, error: reportError } = await supabase
        .from('monthly_reports')
        .select('*')
        .eq('id', data)
        .single()

      if (reportError) throw reportError

      setGeneratedReport(report)
      
      // Odśwież listę raportów
      await loadExistingReports()
      
    } catch (error) {
      console.error('Błąd generowania raportu:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // Pobierz szczegółowe dane dla wybranego miesiąca
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getDetailedData = async (_year: number, _month: number): Promise<ReportData> => {
    try {
      const startDate = new Date(_year, _month - 1, 1)
      const endDate = new Date(_year, _month, 0, 23, 59, 59)

      // Ukończone szkolenia
      const { count: trainingsCompleted } = await supabase
        .from('user_training_progress')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())

      // Aktywni użytkownicy
      const { count: activeUsers } = await supabase
        .from('user_training_progress')
        .select('user_id', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      // Średni czas ukończenia
      const { data: completionTimes } = await supabase
        .from('user_training_progress')
        .select('total_time_seconds')
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())

      const avgTime = completionTimes && completionTimes.length > 0
        ? completionTimes.reduce((sum, t) => sum + t.total_time_seconds, 0) / completionTimes.length
        : 0

      // Testy zaliczone/niezaliczone
      const { count: testsPassed } = await supabase
        .from('user_test_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('passed', true)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())

      const { count: testsFailed } = await supabase
        .from('user_test_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('passed', false)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())

      // Unikalne szkolenia
      const { data: uniqueTrainings } = await supabase
        .from('user_training_progress')
        .select('training_id')
        .eq('status', 'completed')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString())

      const uniqueTrainingIds = new Set(uniqueTrainings?.map(t => t.training_id) || [])

      return {
        trainings_completed: trainingsCompleted || 0,
        total_users_active: activeUsers || 0,
        average_completion_time: Math.round(avgTime / 60), // w minutach
        tests_passed: testsPassed || 0,
        tests_failed: testsFailed || 0,
        unique_trainings_completed: uniqueTrainingIds.size
      }
    } catch (error) {
      console.error('Błąd pobierania danych:', error)
      return {
        trainings_completed: 0,
        total_users_active: 0,
        average_completion_time: 0,
        tests_passed: 0,
        tests_failed: 0,
        unique_trainings_completed: 0
      }
    }
  }

  // Załaduj dane przy montowaniu komponentu
  useState(() => {
    loadExistingReports()
  })

  const monthNames = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'
  ]

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Generator raportu miesięcznego
          </CardTitle>
          <CardDescription>
            Generuj szczegółowy raport za wybrany miesiąc
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="year">Rok</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Miesiąc</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>{month}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={generateReport} 
            disabled={isGenerating}
            className="w-full"
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            {isGenerating ? 'Generuję raport...' : `Generuj raport za ${monthNames[selectedMonth - 1]} ${selectedYear}`}
          </Button>

          {generatedReport && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">
                Raport wygenerowany pomyślnie!
              </h4>
              <p className="text-sm text-green-700 dark:text-green-300">
                Wygenerowano: {format(new Date(generatedReport.generated_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
              </p>
              <div className="mt-3 space-y-1 text-sm">
                <p>Ukończone szkolenia: <strong>{generatedReport.data.trainings_completed}</strong></p>
                <p>Aktywni użytkownicy: <strong>{generatedReport.data.total_users_active}</strong></p>
                <p>Średni czas ukończenia: <strong>{Math.round(generatedReport.data.average_completion_time / 60)} min</strong></p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Ostatnie raporty
          </CardTitle>
          <CardDescription>
            Lista wygenerowanych raportów miesięcznych
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingReports ? (
            <div className="text-center py-8">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Ładowanie raportów...</p>
            </div>
          ) : existingReports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Brak wygenerowanych raportów</p>
            </div>
          ) : (
            <div className="space-y-3">
              {existingReports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">
                      {monthNames[report.month - 1]} {report.year}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Wygenerowano: {format(new Date(report.generated_at), 'dd.MM.yyyy HH:mm', { locale: pl })}
                    </p>
                    <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Szkolenia: {report.data.trainings_completed}</span>
                      <span>Użytkownicy: {report.data.total_users_active}</span>
                      <span>Średni czas: {Math.round(report.data.average_completion_time / 60)} min</span>
                    </div>
                  </div>
                  {report.file_path && (
                    <Button variant="outline" size="sm">
                      <Download className="mr-2 h-3 w-3" />
                      Pobierz
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
