import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not set in environment variables')
}

export const resend = new Resend(process.env.RESEND_API_KEY)

// Resend wymaga formatu: "email@example.com" lub "Name <email@example.com>"
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'AIRSET <noreply@mail.mainly.pl>'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

