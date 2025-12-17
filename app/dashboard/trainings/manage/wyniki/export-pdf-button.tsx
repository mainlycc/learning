'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface UserResult {
  user_id: string
  full_name: string | null
  email: string
  function: 'ochrona' | 'pilot' | 'steward' | 'instruktor' | 'uczestnik' | 'gosc' | 'pracownik' | 'kontraktor' | null
  training_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  test_score: number | null
  test_passed: boolean | null
  test_completed_at: string | null
}

interface ExportPdfButtonProps {
  results: UserResult[]
  trainingTitle: string
}

export function ExportPdfButton({ results, trainingTitle }: ExportPdfButtonProps) {
  // Funkcja usuwająca polskie znaki z tekstu (dla treści dokumentu)
  const removePolishCharsFromText = (text: string): string => {
    const polishChars: { [key: string]: string } = {
      'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n',
      'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
      'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N',
      'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z'
    }
    
    return text
      .split('')
      .map(char => polishChars[char] || char)
      .join('')
  }

  // Funkcja usuwająca polskie znaki z nazwy pliku
  const removePolishChars = (text: string): string => {
    return removePolishCharsFromText(text)
      .replace(/[^a-z0-9]/gi, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
  }

  const handleExport = () => {
    const doc = new jsPDF()
    
    // Tytuł szkolenia (bez polskich znaków)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text(removePolishCharsFromText('Wyniki szkolenia'), 14, 20)
    
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(removePolishCharsFromText(trainingTitle), 14, 30)
    
    // Przygotuj dane do tabeli (bez polskich znaków)
    const tableData = results.map((result) => {
      const statusText = getStatusText(result.training_status)
      const functionText = getFunctionLabel(result.function)
      const testResult = result.test_score !== null 
        ? `${result.test_score}% ${result.test_passed ? '(Zaliczony)' : '(Niezaliczony)'}`
        : 'Brak'
      const testDate = result.test_completed_at
        ? new Date(result.test_completed_at).toLocaleDateString('pl-PL')
        : '-'
      
      return [
        removePolishCharsFromText(result.full_name || 'Brak imienia'),
        result.email,
        removePolishCharsFromText(functionText),
        removePolishCharsFromText(statusText),
        removePolishCharsFromText(testResult),
        removePolishCharsFromText(testDate)
      ]
    })
    
    // Dodaj tabelę (bez polskich znaków w nagłówkach)
    autoTable(doc, {
      head: [[
        removePolishCharsFromText('Uzytkownik'),
        'Email',
        removePolishCharsFromText('Funkcja'),
        removePolishCharsFromText('Status szkolenia'),
        removePolishCharsFromText('Wynik testu'),
        removePolishCharsFromText('Data testu')
      ]],
      body: tableData,
      startY: 40,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 10, left: 14, right: 14 },
    })
    
    // Zapisz PDF
    const sanitizedTitle = removePolishChars(trainingTitle)
    const fileName = `wyniki_${sanitizedTitle}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }
  
  const getStatusText = (status: UserResult['training_status']) => {
    switch (status) {
      case 'completed':
        return 'Ukonczone'
      case 'in_progress':
        return 'W toku'
      case 'paused':
        return 'Wstrzymane'
      default:
        return 'Nie rozpoczete'
    }
  }

  const getFunctionLabel = (
    fn: 'ochrona' | 'pilot' | 'steward' | 'instruktor' | 'uczestnik' | 'gosc' | 'pracownik' | 'kontraktor' | null
  ) => {
    switch (fn) {
      case 'ochrona':
        return 'Ochrona'
      case 'pilot':
        return 'Pilot'
      case 'steward':
        return 'Steward'
      case 'instruktor':
        return 'Instruktor'
      case 'uczestnik':
        return 'Uczestnik'
      case 'gosc':
        return 'Gosc'
      case 'pracownik':
        return 'Pracownik'
      case 'kontraktor':
        return 'Kontraktor'
      default:
        return 'Brak'
    }
  }
  
  if (results.length === 0) {
    return null
  }
  
  return (
    <Button onClick={handleExport} variant="outline" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Eksportuj do PDF
    </Button>
  )
}

