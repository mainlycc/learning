import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getInvitations } from '@/lib/actions/invitations'
import { InvitationsManagement } from './invitations-management'

export default async function InvitationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Sprawdź uprawnienia
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    return (
      <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10">
        <p className="text-sm text-destructive font-medium">
          Brak dostępu. Ta strona jest dostępna tylko dla administratorów.
        </p>
      </div>
    )
  }

  const invitations = await getInvitations()

  return (
    <div className="space-y-4">
      <InvitationsManagement invitations={invitations} />
    </div>
  )
}

