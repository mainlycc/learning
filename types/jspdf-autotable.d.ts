import { jsPDF } from 'jspdf'

interface AutoTableOptions {
  head?: string[][]
  body?: (string | number)[][]
  startY?: number
  styles?: {
    fontSize?: number
    fontStyle?: string
    textColor?: number | [number, number, number]
    fillColor?: number | [number, number, number]
  }
  headStyles?: {
    fillColor?: number | [number, number, number]
    textColor?: number | [number, number, number]
    fontStyle?: string
  }
  alternateRowStyles?: {
    fillColor?: number | [number, number, number]
  }
  margin?: {
    top?: number
    left?: number
    right?: number
    bottom?: number
  }
}

declare module 'jspdf-autotable' {
  function autoTable(doc: jsPDF, options: AutoTableOptions): jsPDF
  export default autoTable
}

