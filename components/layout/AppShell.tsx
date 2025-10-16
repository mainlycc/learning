'use client'

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/sidebar'

type UserProfile = {
  id: string
  email: string
  full_name: string | null
  role: 'super_admin' | 'admin' | 'user'
}

export default function AppShell({
  user,
  children,
}: {
  user: UserProfile | null
  children: React.ReactNode
}) {
  // Jeśli brak użytkownika (np. strony publiczne lub /login), renderuj bez shell'a
  if (!user) {
    return <>{children}</>
  }

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}


