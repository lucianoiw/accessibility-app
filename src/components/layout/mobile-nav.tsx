'use client'

import * as React from 'react'
import { Link } from '@/i18n/navigation'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Menu, LayoutDashboard, FolderKanban, Settings, Globe, FileText, HelpCircle } from 'lucide-react'
import { cn } from '@/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'

export interface ProjectForSwitcher {
  id: string
  name: string
  base_url: string
}

interface MobileNavProps {
  projects?: ProjectForSwitcher[]
}

export function MobileNav({ projects = [] }: MobileNavProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()
  const t = useTranslations('Navigation')

  const navItems = [
    { title: t('dashboard'), href: '/', icon: LayoutDashboard },
    { title: t('projects'), href: '/projects', icon: FolderKanban },
    { title: t('audits'), href: '/audits', icon: FileText },
    { title: t('settings'), href: '/settings', icon: Settings },
    { title: t('help'), href: '/help', icon: HelpCircle },
  ]

  // Remover prefixo de locale do pathname para comparação
  const cleanPathname = pathname.replace(/^\/(pt-BR|en|es)/, '') || '/'

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
          <Menu className="h-5 w-5" />
          <span className="sr-only">{t('openMenu')}</span>
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <SheetHeader className="p-6 border-b">
          <SheetTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <span className="font-bold text-lg">A</span>
            </div>
            <span className="font-semibold">Accessibility</span>
          </SheetTitle>
        </SheetHeader>

        <div className="p-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = cleanPathname === item.href ||
                (item.href !== '/' && cleanPathname.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.title}
                </Link>
              )
            })}
          </nav>

          {projects.length > 0 && (
            <>
              <Separator className="my-4" />
              <div>
                <h4 className="mb-2 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t('projects')}
                </h4>
                <nav className="flex flex-col gap-1">
                  {projects.slice(0, 5).map((project) => (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <Globe className="h-4 w-4" />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
