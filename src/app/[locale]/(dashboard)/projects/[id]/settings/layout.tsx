'use client'

import { PropsWithChildren } from 'react'
import { usePathname, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { cn } from '@/utils'
import { Settings, KeyRound, Sliders, Trash2, Search } from 'lucide-react'

export default function ProjectSettingsLayout({ children }: PropsWithChildren) {
  const pathname = usePathname()
  const params = useParams()
  const projectId = params.id as string
  const t = useTranslations('ProjectSettings')
  const tDanger = useTranslations('DangerZone')

  const settingsNav = [
    {
      titleKey: 'general',
      href: '',
      icon: Settings,
    },
    {
      titleKey: 'discovery',
      href: '/discovery',
      icon: Search,
    },
    {
      titleKey: 'authentication',
      href: '/auth',
      icon: KeyRound,
    },
    {
      titleKey: 'defaults',
      href: '/defaults',
      icon: Sliders,
    },
  ]

  const basePath = `/projects/${projectId}/settings`
  const dangerHref = `${basePath}/danger`
  const isDangerActive = pathname === dangerHref

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="w-64 shrink-0">
        <nav className="flex flex-col gap-1">
          {settingsNav.map((item) => {
            const href = `${basePath}${item.href}`
            const isActive = item.href === ''
              ? pathname === basePath
              : pathname.startsWith(href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {t(item.titleKey)}
              </Link>
            )
          })}

          {/* Separador */}
          <div className="my-3 border-t" />

          {/* Zona de Perigo */}
          <Link
            href={dangerHref}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
              isDangerActive
                ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 font-medium'
                : 'text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50'
            )}
          >
            <Trash2 className="h-4 w-4" />
            {tDanger('title')}
          </Link>
        </nav>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  )
}
