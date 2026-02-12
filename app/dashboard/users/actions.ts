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
    const rawFunction = String(formData.get('function') || '').trim()
    const allowedFunctions = [
      'ochrona',
      'pilot',
      'steward',
      'instruktor',
      'uczestnik',
      'gosc',
      'pracownik',
      'kontraktor',
    ] as const
    const userFunction = allowedFunctions.includes(rawFunction as any)
      ? (rawFunction as (typeof allowedFunctions)[number])
      : null

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
    // Linki zaproszeń zawsze wskazują na airset.pl
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `https://airset.pl/auth/callback?invite=true`,
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
        .update({ role: role, full_name: fullName, function: userFunction })
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
        subject: 'Zaproszenie do platformy airset',
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
      { email, role, full_name: fullName, function: userFunction }
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

export async function updateUserProfile(
  userId: string,
  fullName: string | null,
  userFunction: string | null
) {
  try {
    const { user } = await checkAdminPermissions()

    // Używamy adminClient do aktualizacji profilu, aby ominąć RLS
    const adminClient = createAdminClient()

    const { error } = await adminClient
      .from('profiles')
      .update({ full_name: fullName, function: userFunction })
      .eq('id', userId)

    if (error) {
      console.error('Błąd aktualizacji profilu:', error)
      return { error: error.message }
    }

    await logAuditEvent(
      user.id,
      'user_profile_updated',
      'user',
      userId,
      { full_name: fullName, function: userFunction }
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

export async function deleteUsers(userIds: string[]) {
  try {
    const { user } = await checkAdminPermissions()

    if (userIds.length === 0) {
      return { error: 'Nie wybrano żadnych użytkowników' }
    }

    const supabase = await createClient()
    const adminClient = createAdminClient()

    // Sprawdź czy próbujemy usunąć siebie
    if (userIds.includes(user.id)) {
      return { error: 'Nie możesz usunąć własnego konta' }
    }

    // Sprawdź czy próbujemy usunąć ostatniego super_admin
    const { data: userProfiles } = await supabase
      .from('profiles')
      .select('id, role')
      .in('id', userIds)

    const superAdminIds = userProfiles?.filter(p => p.role === 'super_admin').map(p => p.id) || []
    
    if (superAdminIds.length > 0) {
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin')

      const remainingSuperAdmins = (count || 0) - superAdminIds.length
      if (remainingSuperAdmins < 1) {
        return { error: 'Nie można usunąć ostatniego super administratora' }
      }
    }

    // Usuń użytkowników
    const errors: string[] = []
    const deletedEmails: string[] = []

    for (const userId of userIds) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()

      const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)

      if (deleteError) {
        errors.push(`${userProfile?.email || userId}: ${deleteError.message}`)
      } else {
        deletedEmails.push(userProfile?.email || userId)
        await logAuditEvent(
          user.id,
          'user_deleted',
          'user',
          userId,
          { deleted_user_email: userProfile?.email }
        )
      }
    }

    if (errors.length > 0 && deletedEmails.length === 0) {
      return { error: `Nie udało się usunąć użytkowników: ${errors.join(', ')}` }
    }

    if (errors.length > 0) {
      revalidatePath('/dashboard/users')
      return { 
        success: true, 
        message: `Usunięto ${deletedEmails.length} użytkowników. Błędy: ${errors.join(', ')}` 
      }
    }

    revalidatePath('/dashboard/users')
    return { 
      success: true, 
      message: `Usunięto ${deletedEmails.length} ${deletedEmails.length === 1 ? 'użytkownika' : 'użytkowników'}` 
    }
  } catch (error) {
    console.error('Błąd usuwania użytkowników:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

// ========== ZARZĄDZANIE GRUPAMI ==========

interface UserGroup {
  id: string
  name: string
  display_name: string
  description: string | null
  created_at: string
  created_by: string | null
}

export async function getGroups(): Promise<{ groups: UserGroup[] | null; error: string | null }> {
  try {
    const supabase = await createClient()
    
    const { data: groups, error } = await supabase
      .from('user_groups')
      .select('*')
      .order('display_name')
    
    if (error) {
      console.error('Błąd pobierania grup:', error)
      return { groups: null, error: error.message }
    }
    
    return { groups, error: null }
  } catch (error) {
    console.error('Błąd pobierania grup:', error)
    return { groups: null, error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

export async function createGroup(formData: FormData) {
  try {
    const { user } = await checkAdminPermissions()
    
    const displayName = String(formData.get('display_name') || '').trim()
    
    if (!displayName) {
      return { error: 'Nazwa grupy jest wymagana' }
    }
    
    // Generuj nazwę techniczną z nazwy wyświetlanej
    // Konwertuj na małe litery, zamień spacje na podkreślenia, usuń polskie znaki
    const name = displayName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // usuń znaki diakrytyczne
      .replace(/[^a-z0-9]+/g, '_') // zamień wszystko co nie jest literą/cyfrą na podkreślenie
      .replace(/^_+|_+$/g, '') // usuń podkreślenia na początku i końcu
    
    if (!name) {
      return { error: 'Nie można wygenerować nazwy technicznej z podanej nazwy' }
    }
    
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('user_groups')
      .insert({
        name,
        display_name: displayName,
        created_by: user.id,
      })
      .select()
      .single()
    
    if (error) {
      if (error.code === '23505') {
        return { error: 'Grupa o takiej nazwie już istnieje' }
      }
      console.error('Błąd tworzenia grupy:', error)
      return { error: error.message }
    }
    
    await logAuditEvent(
      user.id,
      'group_created',
      'user_group',
      data.id,
      { name, display_name: displayName }
    )
    
    revalidatePath('/dashboard/users')
    return { success: true, message: 'Grupa utworzona pomyślnie', group: data }
  } catch (error) {
    console.error('Błąd tworzenia grupy:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

export async function updateGroup(groupId: string, formData: FormData) {
  try {
    const { user } = await checkAdminPermissions()
    
    const displayName = String(formData.get('display_name') || '').trim()
    
    if (!displayName) {
      return { error: 'Nazwa grupy jest wymagana' }
    }
    
    const supabase = await createClient()
    
    const { error } = await supabase
      .from('user_groups')
      .update({
        display_name: displayName,
      })
      .eq('id', groupId)
    
    if (error) {
      console.error('Błąd aktualizacji grupy:', error)
      return { error: error.message }
    }
    
    await logAuditEvent(
      user.id,
      'group_updated',
      'user_group',
      groupId,
      { display_name: displayName }
    )
    
    revalidatePath('/dashboard/users')
    return { success: true, message: 'Grupa zaktualizowana pomyślnie' }
  } catch (error) {
    console.error('Błąd aktualizacji grupy:', error)
    return { error: error instanceof Error ? error.message : 'Nieznany błąd' }
  }
}

export async function deleteGroup(groupId: string) {
  try {
    await checkAdminPermissions()
    
    const supabase = await createClient()
    
    // Sprawdź czy profil aktualnego użytkownika to super_admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Brak autoryzacji' }
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profile?.role !== 'super_admin') {
      return { error: 'Tylko super administrator może usuwać grupy' }
    }
    
    // Pobierz dane grupy przed usunięciem
    const { data: group } = await supabase
      .from('user_groups')
      .select('name')
      .eq('id', groupId)
      .single()
    
    if (!group) {
      return { error: 'Grupa nie znaleziona' }
    }
    
    // Sprawdź czy ktoś używa tej grupy
    const adminClient = createAdminClient()
    const { count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('function', group.name)
    
    if (count && count > 0) {
      return { error: `Nie można usunąć grupy - ${count} użytkowników jest do niej przypisanych` }
    }
    
    const { error } = await supabase
      .from('user_groups')
      .delete()
      .eq('id', groupId)
    
    if (error) {
      console.error('Błąd usuwania grupy:', error)
      return { error: error.message }
    }
    
    await logAuditEvent(
      user.id,
      'group_deleted',
      'user_group',
      groupId,
      { name: group.name }
    )
    
    revalidatePath('/dashboard/users')
    return { success: true, message: 'Grupa usunięta pomyślnie' }
  } catch (error) {
    console.error('Błąd usuwania grupy:', error)
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
    // Linki zaproszeń zawsze wskazują na airset.pl
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: `https://airset.pl/auth/callback?invite=true`,
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
        subject: 'Zaproszenie do platformy airset',
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

