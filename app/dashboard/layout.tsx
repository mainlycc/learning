import { createClient } from '@/lib/supabase/server'
// Globalny AppShell jest już w app/layout.tsx – tutaj pozostawiamy tylko autoryzację

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div>Brak autoryzacji</div>
  }
  
  // Pobierz profil użytkownika
  const { error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Debug: sprawdź czy profil istnieje
  if (profileError) {
    console.error('Błąd pobierania profilu:', profileError)
    
    // Jeśli profil nie istnieje, spróbuj go utworzyć
    if (profileError.code === 'PGRST116') { // No rows returned
      console.log('Profil nie istnieje, tworzę nowy...')
      
      const { data: newProfile, error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || null,
          role: 'user'
        })
        .select()
        .single()
      
      if (insertError) {
        console.error('Błąd tworzenia profilu:', insertError)
      } else {
        console.log('Profil utworzony:', newProfile)
      }
    }
  }

  // Pobierz profil ponownie (nowy lub istniejący)
  await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return <>{children}</>
}
