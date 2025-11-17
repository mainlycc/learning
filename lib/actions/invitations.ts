'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendInvitationEmail } from '@/lib/email/send'

export type TutorInvitation = {
  id: string
  email: string
  token: string
  status: 'pending' | 'accepted' | 'expired'
  role: 'user' | 'admin' | 'super_admin'
  created_by: string
  expires_at: string
  created_at: string
  updated_at: string
}

export type CreateInvitationResult = {
  success: boolean
  error?: string
  invitation?: TutorInvitation
}

export type ValidateTokenResult = {
  valid: boolean
  error?: string
  email?: string
  role?: 'user' | 'admin' | 'super_admin'
}

export type RegisterResult = {
  success: boolean
  error?: string
}

export type GetInvitationsResult = {
  success: boolean
  invitations?: TutorInvitation[]
  error?: string
}

export async function createInvitation(
  email: string,
  role: 'user' | 'admin' | 'super_admin' = 'user'
): Promise<CreateInvitationResult> {
  const supabase = await createClient()

  // Sprawdź czy użytkownik jest adminem
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nie jesteś zalogowany' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { success: false, error: 'Brak uprawnień' }
  }

  // Sprawdź czy email już nie istnieje w systemie
  const { data: existingUser } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .single()

  if (existingUser) {
    return { success: false, error: 'Użytkownik z tym adresem email już istnieje' }
  }

  // Sprawdź czy istnieje aktywne zaproszenie dla tego emaila
  const { data: existingInvitation } = await supabase
    .from('tutor_invitations')
    .select('*')
    .eq('email', email)
    .eq('status', 'pending')
    .single()

  if (existingInvitation) {
    return { success: false, error: 'Aktywne zaproszenie dla tego emaila już istnieje' }
  }

  // Ustaw datę wygaśnięcia na 7 dni od teraz
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  // Utwórz zaproszenie
  const { data: invitation, error } = await supabase
    .from('tutor_invitations')
    .insert({
      email,
      role,
      created_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating invitation:', error)
    return { success: false, error: 'Nie udało się utworzyć zaproszenia' }
  }

  // Wyślij email z zaproszeniem
  // Linki zaproszeń zawsze wskazują na airset.pl
  const baseUrl = 'https://airset.pl'
  const invitationLink = `${baseUrl}/register?token=${invitation.token}`

  const emailResult = await sendInvitationEmail({
    to: email,
    invitationLink,
    expiryDays: 7,
  })

  if (!emailResult.success) {
    console.error('Failed to send invitation email:', emailResult.error)
    // Kontynuujemy - zaproszenie jest już utworzone, użytkownik może skopiować link ręcznie
    // W przyszłości można dodać opcję ponownego wysłania emaila
  } else {
    console.log('Invitation email sent successfully to:', email)
  }

  revalidatePath('/dashboard/invitations')
  return { success: true, invitation: invitation as TutorInvitation }
}

export async function validateInvitationToken(token: string): Promise<ValidateTokenResult> {
  const supabase = await createClient()

  console.log('Validating invitation token:', token)

  const { data: invitation, error } = await supabase
    .from('tutor_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (error) {
    console.error('Error fetching invitation:', error)
    return { valid: false, error: 'Nieprawidłowy token zaproszenia' }
  }

  if (!invitation) {
    console.error('Invitation not found for token:', token)
    return { valid: false, error: 'Nieprawidłowy token zaproszenia' }
  }

  console.log('Found invitation:', invitation)

  if (invitation.status !== 'pending') {
    return { valid: false, error: 'To zaproszenie zostało już wykorzystane lub wygasło' }
  }

  const now = new Date()
  const expiresAt = new Date(invitation.expires_at)

  if (now > expiresAt) {
    // Aktualizuj status na expired
    await supabase
      .from('tutor_invitations')
      .update({ status: 'expired' })
      .eq('id', invitation.id)

    return { valid: false, error: 'To zaproszenie wygasło' }
  }

  return { valid: true, email: invitation.email, role: invitation.role as 'user' | 'admin' | 'super_admin' }
}

export async function registerWithInvitation(
  token: string,
  fullName: string,
  password: string
): Promise<RegisterResult> {
  const supabase = await createClient()

  // Waliduj token
  const validation = await validateInvitationToken(token)
  if (!validation.valid || !validation.email || !validation.role) {
    return { success: false, error: validation.error }
  }

  // Pobierz zaproszenie
  const { data: invitation } = await supabase
    .from('tutor_invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (!invitation) {
    return { success: false, error: 'Nie znaleziono zaproszenia' }
  }

  // Utwórz użytkownika w Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: validation.email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: validation.role,
      },
    },
  })

  if (authError) {
    console.error('Auth error:', authError)
    return { success: false, error: authError.message }
  }

  if (!authData.user) {
    return { success: false, error: 'Nie udało się utworzyć konta' }
  }

  // Aktualizuj profil użytkownika (rolę), ponieważ trigger zawsze ustawia rolę na 'user'
  // Używamy adminClient do aktualizacji profilu, aby ominąć RLS
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ role: validation.role })
    .eq('id', authData.user.id)

  if (profileError) {
    console.error('Error updating user profile role:', profileError)
    // Nie przerywamy - konto zostało utworzone, tylko rola może być niepoprawna
  }

  // Aktualizuj status zaproszenia używając funkcji bazy danych (omija RLS)
  const { error: updateError } = await supabase.rpc('accept_invitation_by_token', {
    invitation_token: token
  })

  if (updateError) {
    console.error('Error updating invitation:', updateError)
    // Nie przerywamy - konto zostało utworzone, tylko status zaproszenia się nie zaktualizował
  }

  // Odśwież cache dla strony zaproszeń (aby admin zobaczył zmieniony status)
  revalidatePath('/dashboard/invitations')

  return { success: true }
}

export async function getInvitations(): Promise<TutorInvitation[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return []
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return []
  }

  const { data: invitations, error } = await supabase
    .from('tutor_invitations')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    return []
  }

  return (invitations || []) as TutorInvitation[]
}

export async function resendInvitations(ids: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nie jesteś zalogowany' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { success: false, error: 'Brak uprawnień' }
  }

  // Pobierz zaproszenia
  const { data: invitations, error } = await supabase
    .from('tutor_invitations')
    .select('*')
    .in('id', ids)

  if (error || !invitations) {
    return { success: false, error: 'Nie udało się pobrać zaproszeń' }
  }

  // Linki zaproszeń zawsze wskazują na airset.pl
  const baseUrl = 'https://airset.pl'

  // Wyślij ponownie email dla każdego zaproszenia
  for (const invitation of invitations) {
    if (invitation.status === 'pending') {
      const invitationLink = `${baseUrl}/register?token=${invitation.token}`
      await sendInvitationEmail({
        to: invitation.email,
        invitationLink,
        expiryDays: 7,
      })
    }
  }

  revalidatePath('/dashboard/invitations')
  return { success: true }
}

export async function deleteInvitations(ids: string[]): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nie jesteś zalogowany' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const { error } = await supabase
    .from('tutor_invitations')
    .delete()
    .in('id', ids)

  if (error) {
    console.error('Error deleting invitations:', error)
    return { success: false, error: 'Nie udało się usunąć zaproszeń' }
  }

  revalidatePath('/dashboard/invitations')
  return { success: true }
}

export async function cancelInvitation(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Nie jesteś zalogowany' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return { success: false, error: 'Brak uprawnień' }
  }

  const { error } = await supabase
    .from('tutor_invitations')
    .update({ status: 'expired' })
    .eq('id', id)

  if (error) {
    console.error('Error canceling invitation:', error)
    return { success: false, error: 'Nie udało się anulować zaproszenia' }
  }

  revalidatePath('/dashboard/invitations')
  return { success: true }
}

