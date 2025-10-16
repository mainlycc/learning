'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Download, FileSpreadsheet, FileText, File } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'

interface UserProgress {
  id: string
  user_id: string
  training_id: string
  current_slide: number
  total_time_seconds: number
  completed_at: string | null
  status: string
  profiles: {
    full_name: string | null
    email: string
  }
  trainings: {
    title: string
  }
}

interface TestAttempt {
  id: string
  user_id: string
  test_id: string
  started_at: string
  completed_at: string | null
  score: number
  passed: boolean
  profiles: {
    full_name: string | null
    email: string
  }
  tests: {
    title: string
  }
}

interface ExportDataRow {
  'Typ': string
  'Użytkownik': string
  'Email': string
  'Szkolenie'?: string
  'Test'?: string
  'Status': string
  'Aktualny slajd'?: number
  'Czas spędzony (min)'?: number
  'Wynik (%)'?: number
  'Data rozpoczęcia'?: string
  'Data ukończenia': string
}

interface DataExporterProps {
  userProgress: UserProgress[]
  testAttempts: TestAttempt[]
}

export function DataExporter({ userProgress, testAttempts }: DataExporterProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx' | 'pdf'>('csv')
  const [isExporting, setIsExporting] = useState(false)

  const prepareData = (): ExportDataRow[] => {
    const data: ExportDataRow[] = []

    // Dodaj postępy szkoleń
    userProgress.forEach(progress => {
      data.push({
        'Typ': 'Postęp szkolenia',
        'Użytkownik': progress.profiles.full_name || progress.profiles.email,
        'Email': progress.profiles.email,
        'Szkolenie': progress.trainings.title,
        'Status': progress.status === 'completed' ? 'Ukończone' : progress.status === 'in_progress' ? 'W toku' : 'Wstrzymane',
        'Aktualny slajd': progress.current_slide,
        'Czas spędzony (min)': Math.round(progress.total_time_seconds / 60),
        'Data ukończenia': progress.completed_at ? new Date(progress.completed_at).toLocaleDateString('pl-PL') : 'Brak'
      } as ExportDataRow)
    })

    // Dodaj próby testów
    testAttempts.forEach(attempt => {
      data.push({
        'Typ': 'Próba testu',
        'Użytkownik': attempt.profiles.full_name || attempt.profiles.email,
        'Email': attempt.profiles.email,
        'Test': attempt.tests.title,
        'Status': attempt.passed ? 'Zaliczony' : 'Niezaliczony',
        'Wynik (%)': attempt.score,
        'Data rozpoczęcia': new Date(attempt.started_at).toLocaleDateString('pl-PL'),
        'Data ukończenia': attempt.completed_at ? new Date(attempt.completed_at).toLocaleDateString('pl-PL') : 'Brak'
      } as ExportDataRow)
    })

    return data
  }

  const exportToCSV = () => {
    const data = prepareData()
    const csv = Papa.unparse(data)
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `raport-${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportToXLSX = () => {
    const data = prepareData()
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Raport')
    
    // Dodaj arkusz ze statystykami
    const statsData = [
      ['Statystyki', ''],
      ['Łączna liczba użytkowników', new Set(data.map(d => d.Email)).size],
      ['Ukończone szkolenia', data.filter(d => d.Typ === 'Postęp szkolenia' && d.Status === 'Ukończone').length],
      ['Zaliczone testy', data.filter(d => d.Typ === 'Próba testu' && d.Status === 'Zaliczony').length],
      ['Niezaliczone testy', data.filter(d => d.Typ === 'Próba testu' && d.Status === 'Niezaliczony').length]
    ]
    
    const statsWorksheet = XLSX.utils.aoa_to_sheet(statsData)
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Statystyki')
    
    XLSX.writeFile(workbook, `raport-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToPDF = () => {
    const data = prepareData()
    const doc = new jsPDF()
    
    // Nagłówek
    doc.setFontSize(20)
    doc.text('Raport systemu e-learning', 14, 22)
    
    doc.setFontSize(12)
    doc.text(`Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`, 14, 30)
    
    // Statystyki
    doc.setFontSize(16)
    doc.text('Statystyki', 14, 45)
    
    doc.setFontSize(10)
    doc.text(`Łączna liczba użytkowników: ${new Set(data.map(d => d.Email)).size}`, 14, 55)
    doc.text(`Ukończone szkolenia: ${data.filter(d => d.Typ === 'Postęp szkolenia' && d.Status === 'Ukończone').length}`, 14, 60)
    doc.text(`Zaliczone testy: ${data.filter(d => d.Typ === 'Próba testu' && d.Status === 'Zaliczony').length}`, 14, 65)
    doc.text(`Niezaliczone testy: ${data.filter(d => d.Typ === 'Próba testu' && d.Status === 'Niezaliczony').length}`, 14, 70)
    
    // Tabela danych (uproszczona)
    doc.setFontSize(16)
    doc.text('Dane szczegółowe', 14, 85)
    
    doc.setFontSize(8)
    let y = 95
    const pageHeight = doc.internal.pageSize.height
    const columns = ['Typ', 'Użytkownik', 'Status', 'Wynik (%)']
    const columnWidths = [30, 50, 30, 30]
    
    // Nagłówki kolumn
    let x = 14
    columns.forEach((col, i) => {
      doc.text(col, x, y)
      x += columnWidths[i]
    })
    
    y += 5
    
    // Dane (maksymalnie 20 wierszy na stronę)
    data.slice(0, 20).forEach((row) => {
      if (y > pageHeight - 20) {
        doc.addPage()
        y = 20
      }
      
      x = 14
      const rowData = [
        row.Typ,
        (row.Użytkownik as string).substring(0, 20),
        row.Status,
        row.Typ === 'Próba testu' ? row['Wynik (%)'] : '-'
      ]
      
      rowData.forEach((cell, i) => {
        doc.text(String(cell), x, y)
        x += columnWidths[i]
      })
      
      y += 5
    })
    
    if (data.length > 20) {
      doc.text(`... i ${data.length - 20} więcej rekordów`, 14, y + 5)
    }
    
    doc.save(`raport-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      switch (exportFormat) {
        case 'csv':
          exportToCSV()
          break
        case 'xlsx':
          exportToXLSX()
          break
        case 'pdf':
          exportToPDF()
          break
      }
    } catch (error) {
      console.error('Błąd eksportu:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Download className="mr-2 h-5 w-5" />
          Eksport danych
        </CardTitle>
        <CardDescription>
          Eksportuj dane do CSV, XLSX lub PDF
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Format eksportu</label>
          <Select value={exportFormat} onValueChange={(value: 'csv' | 'xlsx' | 'pdf') => setExportFormat(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center">
                  <FileText className="mr-2 h-4 w-4" />
                  CSV
                </div>
              </SelectItem>
              <SelectItem value="xlsx">
                <div className="flex items-center">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Excel (XLSX)
                </div>
              </SelectItem>
              <SelectItem value="pdf">
                <div className="flex items-center">
                  <File className="mr-2 h-4 w-4" />
                  PDF
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>Eksport obejmuje:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Postępy użytkowników w szkoleniach</li>
            <li>Wyniki testów</li>
            <li>Podstawowe statystyki</li>
          </ul>
          <p className="mt-2">
            Łącznie: {userProgress.length + testAttempts.length} rekordów
          </p>
        </div>

        <Button 
          onClick={handleExport} 
          disabled={isExporting || (userProgress.length === 0 && testAttempts.length === 0)}
          className="w-full"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? 'Eksportuję...' : `Eksportuj do ${exportFormat.toUpperCase()}`}
        </Button>
      </CardContent>
    </Card>
  )
}
