import { resend, FROM_EMAIL } from './client'
import { generateInvitationEmail } from './templates/invitation-email'

export type SendInvitationEmailParams = {
  to: string
  invitationLink: string
  expiryDays?: number
}

export type SendEmailResult = {
  success: boolean
  error?: string
  messageId?: string
}

export async function sendInvitationEmail({
  to,
  invitationLink,
  expiryDays = 7,
}: SendInvitationEmailParams): Promise<SendEmailResult> {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not set in environment variables')
      return { success: false, error: 'RESEND_API_KEY is not configured' }
    }

    const html = generateInvitationEmail('Nowy Użytkownik', invitationLink, expiryDays)

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [to],
      subject: 'Zaproszenie do AIRSET - Aktywuj swoje konto',
      html,
    })

    if (error) {
      console.error('Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log('Email sent successfully:', data)
    return { success: true, messageId: data?.id }
  } catch (error) {
    console.error('Unexpected error sending email:', error)
    return { success: false, error: 'Nieoczekiwany błąd podczas wysyłania emaila' }
  }
}

