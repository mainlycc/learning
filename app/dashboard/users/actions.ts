'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend, FROM_EMAIL, APP_URL } from '@/lib/email/client'
import { InviteEmail } from '@/lib/email/templates/invite-email'
import { render } from '@react-email/components'
import { revalidatePath } from 'next/cache'

async function checkAdminPermissions() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    throw new Error('Brak autoryzacji')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    throw new Error('Brak uprawnień administratora')
  }

  return { user, profile }
}

async function logAuditEvent(
  userId: string,
  actionType: string,
  resourceType: string,
  resourceId: string | null = null,
  metadata: Record<string, unknown> = {}
) {
  const supabase = await createClient()
  await supabase.rpc('log_audit_event', {
    p_user_id: userId,
    p_action_type: actionType,
    p_resource_type: resourceType,
    p_resource_id: resourceId,
    p_metadata: metadata,
  })
}

export async function inviteUser(formData: FormData) {
  try {
    const { user, profile } = await checkAdminPermissions()

    const email = String(formData.get('email') || '').trim().toLowerCase()
    const fullName = String(formData.get('full_name') || '').trim() || null
    const role = String(formData.get('role') || 'user') as 'user' | 'admin' | 'super_admin'

    if (!email || !email.includes('@')) {
      return { error: 'Nieprawidłowy adres email' }
    }

    // Sprawdź czy użytkownik już istnieje
    const adminClient = createAdminClient()
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    
    if (listError) {
      console.error('Błąd sprawdzania użytkowników:', listError)
      return { error: 'Nie udało się sprawdzić czy użytkownik istnieje' }
    }
    
    const existingUser = usersData?.users?.find(user => user.email?.toLowerCase() === email.toLowerCase())
    
    if (existingUser) {
      return { error: 'Użytkownik o tym adresie email już istnieje' }
    }

    // Wygeneruj magic link do zaproszenia (bez automatycznego wysyłania emaila przez Supabase)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${APP_URL}/auth/callback?invite=true`,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    })

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Błąd generowania linku zaproszenia:', linkError)
      return { error: linkError?.message || 'Nie udało się wygenerować linku zaproszenia' }
    }

    const inviteUrl = linkData.properties.action_link
    const invitedUserId = linkData.user?.id

    // Aktualizuj profil użytkownika (rolę i full_name), jeśli użytkownik został utworzony
    // Trigger automatycznie tworzy profil, ale zawsze ustawia rolę na 'user'
    if (invitedUserId) {
      // Używamy adminClient do aktualizacji profilu, aby ominąć RLS
      const { error: profileError } = await adminClient
        .from('profiles')
        .update({ role: role, full_name: fullName })
        .eq('id', invitedUserId)

      if (profileError) {
        console.error('Błąd aktualizacji profilu użytkownika:', profileError)
        // Nie przerywamy procesu - użytkownik został utworzony, tylko rola/full_name mogą być niepoprawne
      }
    }

    // Wyślij customowy email przez Resend
    try {
      const emailHtml = await render(
        InviteEmail({
          inviteUrl,
          fullName: fullName || undefined,
          role,
          inviterName: profile.full_name || undefined,
        })
      )

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Zaproszenie do platformy AIRSET',
        html: emailHtml,
      })
    } catch (emailError) {
      console.error('Błąd wysyłki emaila:', emailError)
      return { error: 'Nie udało się wysłać emaila z zaproszeniem' }
    }

    // Zaloguj akcję
    await logAuditEvent(
      user.id,
      'user_invited',
      'user',
      invitedUserId || null,
      { email, role, full_name: fullName }
    )

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Zaproszenie wysłane pomyślnie' }
  } catch (error) {
    console.error('Błąd zapraszania użytkownika:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

export async function updateUserRole(userId: string, newRole: 'user' | 'admin' | 'super_admin') {
  try {
    const { user } = await checkAdminPermissions()

    const supabase = await createClient()

    // Sprawdź czy próbujemy usunąć ostatniego super_admin
    if (newRole !== 'super_admin') {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (currentProfile?.role === 'super_admin') {
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('role', 'super_admin')

        if (count === 1) {
          return { error: 'Nie można usunąć ostatniego super administratora' }
        }
      }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) {
      return { error: error.message }
    }

    await logAuditEvent(
      user.id,
      'user_role_updated',
      'user',
      userId,
      { new_role: newRole }
    )

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Rola użytkownika zaktualizowana' }
  } catch (error) {
    console.error('Błąd aktualizacji roli:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

export async function updateUserProfile(userId: string, fullName: string | null) {
  try {
    const { user } = await checkAdminPermissions()

    const supabase = await createClient()

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', userId)

    if (error) {
      return { error: error.message }
    }

    await logAuditEvent(
      user.id,
      'user_profile_updated',
      'user',
      userId,
      { full_name: fullName }
    )

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Profil użytkownika zaktualizowany' }
  } catch (error) {
    console.error('Błąd aktualizacji profilu:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

export async function deleteUser(userId: string) {
  try {
    const { user } = await checkAdminPermissions()

    const supabase = await createClient()

    // Sprawdź czy próbujemy usunąć siebie
    if (userId === user.id) {
      return { error: 'Nie możesz usunąć własnego konta' }
    }

    // Sprawdź czy próbujemy usunąć ostatniego super_admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single()

    if (userProfile?.role === 'super_admin') {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin')

      if (count === 1) {
        return { error: 'Nie można usunąć ostatniego super administratora' }
      }
    }

    // Usuń użytkownika przez Supabase Auth (to również usunie profil przez CASCADE)
    const adminClient = createAdminClient()
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

    if (deleteError) {
      return { error: deleteError.message }
    }

    await logAuditEvent(
      user.id,
      'user_deleted',
      'user',
      userId,
      { deleted_user_email: userProfile?.email }
    )

    revalidatePath('/dashboard/users')
    return { success: true, message: 'Użytkownik usunięty pomyślnie' }
  } catch (error) {
    console.error('Błąd usuwania użytkownika:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

export async function resendInvitation(email: string) {
  try {
    const { user, profile } = await checkAdminPermissions()

    const adminClient = createAdminClient()

    // Pobierz użytkownika
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    })
    
    if (listError) {
      return { error: 'Nie udało się znaleźć użytkownika' }
    }
    
    const userData = usersData?.users?.find(user => user.email?.toLowerCase() === email.toLowerCase())
    
    if (!userData) {
      return { error: 'Użytkownik nie znaleziony' }
    }

    // Sprawdź czy użytkownik ma już ustawione hasło
    if (userData.email_confirmed_at) {
      return { error: 'Użytkownik już aktywował swoje konto' }
    }

    // Wygeneruj nowy magic link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `${APP_URL}/auth/callback?invite=true`,
      },
    })

    if (linkError || !linkData.properties?.action_link) {
      return { error: 'Nie udało się wygenerować linku zaproszenia' }
    }

    // Wyślij email
    try {
      const supabase = await createClient()
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', userData.id)
        .single()

      const emailHtml = await render(
        InviteEmail({
          inviteUrl: linkData.properties.action_link,
          fullName: profileData?.full_name || undefined,
          role: (profileData?.role as 'user' | 'admin' | 'super_admin') || 'user',
          inviterName: profile.full_name || undefined,
        })
      )

      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: 'Zaproszenie do platformy AIRSET',
        html: emailHtml,
      })
    } catch (emailError) {
      console.error('Błąd wysyłki emaila:', emailError)
      return { error: 'Nie udało się wysłać emaila' }
    }

    await logAuditEvent(
      user.id,
      'user_invitation_resent',
      'user',
      userData.id,
      { email }
    )

    return { success: true, message: 'Zaproszenie wysłane ponownie' }
  } catch (error) {
    console.error('Błąd ponownego wysłania zaproszenia:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

