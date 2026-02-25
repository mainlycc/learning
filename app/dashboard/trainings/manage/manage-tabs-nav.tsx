'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, ShieldCheck, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  {
    href: '/dashboard/trainings/manage',
    label: 'Szkolenia',
    icon: BookOpen,
  },
  {
    href: '/dashboard/trainings/manage/access',
    label: 'Zarządzanie dostępem',
    icon: ShieldCheck,
  },
  {
    href: '/dashboard/trainings/manage/wyniki',
    label: 'Wyniki',
    icon: BarChart3,
  },
]

export function ManageTabsNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard/trainings/manage') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="border-b mb-6">
      <nav className="-mb-px flex space-x-1" aria-label="Zakładki">
        {tabs.map((tab) => {
          const active = isActive(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
