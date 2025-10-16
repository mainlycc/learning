'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from 'next-themes'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BookOpen, 
  Users, 
  BarChart3, 
  Settings, 
  FileText, 
  LogOut,
  User,
  Shield,
  Moon,
  Sun,
  Plane
} from 'lucide-react'
import { NotificationCenter } from './NotificationCenter'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SidebarProps {
  user: {
    id: string
    email: string
    full_name: string | null
    role: 'super_admin' | 'admin' | 'user'
  }
}

export function AppSidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const supabase = createClient()
  const { theme, setTheme } = useTheme()
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: BarChart3,
      roles: ['super_admin', 'admin', 'user']
    },
    {
      name: 'Szkolenia',
      href: '/dashboard/trainings',
      icon: BookOpen,
      roles: ['super_admin', 'admin', 'user']
    },
    {
      name: 'Zarządzanie szkoleniami',
      href: '/dashboard/trainings/manage',
      icon: FileText,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Użytkownicy',
      href: '/dashboard/users',
      icon: Users,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Raporty',
      href: '/dashboard/reports',
      icon: BarChart3,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Audit',
      href: '/dashboard/audit',
      icon: Shield,
      roles: ['super_admin', 'admin']
    },
    {
      name: 'Ustawienia',
      href: '/dashboard/settings',
      icon: Settings,
      roles: ['super_admin', 'admin', 'user']
    }
  ]

  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user.role)
  )

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="text-xs">Super Admin</Badge>
      case 'admin':
        return <Badge variant="default" className="text-xs">Admin</Badge>
      case 'user':
        return <Badge variant="secondary" className="text-xs">Użytkownik</Badge>
      default:
        return null
    }
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Plane className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">AIRSET</span>
                  <span className="truncate text-xs">Ochrona Lotnictwa Cywilnego</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Wyszukiwarka</SidebarGroupLabel>
          <SidebarInput
            placeholder="Szukaj szkoleń..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="mb-2"
          />
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Nawigacja</SidebarGroupLabel>
          <SidebarMenu>
            {filteredNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.href}>
                      <Icon className="size-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Narzędzia</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-full justify-start"
              >
                {theme === 'dark' ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
                <span>Zmień motyw</span>
              </Button>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <div className="w-full flex items-center justify-between px-2 py-1.5">
                <span className="text-sm font-medium">Powiadomienia</span>
                <NotificationCenter />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      {user.full_name || user.email}
                    </span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                  <div className="ml-auto">
                    {getRoleBadge(user.role)}
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Wyloguj
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
