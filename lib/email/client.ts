import { Resend } from 'resend'

// Leniwa inicjalizacja - sprawdzamy zmienną tylko w runtime, nie podczas builda
let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables')
    }
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

export const resend = {
  get emails() {
    return getResend().emails
  },
}

// Resend wymaga formatu: "email@example.com" lub "Name <email@example.com>"
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AIRSET <noreply@mail.mainly.pl>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://airset.pl'

