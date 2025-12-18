'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Settings,
  CreditCard,
  Moon,
  Sun,
  Globe,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import type { PlanType } from '@/types/database'

interface UserNavProps {
  user: {
    email: string
    name?: string | null
    avatar_url?: string | null
    plan?: PlanType
  }
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const t = useTranslations('UserMenu')
  const tPlan = useTranslations('Plan')

  const initials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email.slice(0, 2).toUpperCase()

  const planBadge = {
    FREE: { label: tPlan('free'), variant: 'secondary' as const },
    PRO: { label: tPlan('pro'), variant: 'default' as const },
    ENTERPRISE: { label: tPlan('enterprise'), variant: 'default' as const },
  }

  const currentPlan = planBadge[user.plan || 'FREE']

  const handleSignOut = async () => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <div className="relative">
          <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-primary transition-all">
            <AvatarImage src={user.avatar_url || undefined} alt={user.name || user.email} />
            <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          {/* Online indicator */}
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || undefined} alt={user.name || user.email} />
              <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">
                  {user.name || 'Usuario'}
                </span>
                <Badge variant={currentPlan.variant} className="text-[10px] px-1.5 py-0 font-medium">
                  {currentPlan.label}
                </Badge>
              </div>
              <span className="text-xs text-muted-foreground">
                {user.email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer py-2.5 px-4">
            <User className="mr-3 h-4 w-4 text-muted-foreground" />
            <span>{t('profile')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings')} className="cursor-pointer py-2.5 px-4">
            <Settings className="mr-3 h-4 w-4 text-muted-foreground" />
            <span>{t('settings')}</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push('/settings/billing')} className="cursor-pointer py-2.5 px-4">
            <CreditCard className="mr-3 h-4 w-4 text-muted-foreground" />
            <span>{t('billing')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer py-2.5 px-4">
            <Globe className="mr-3 h-4 w-4 text-muted-foreground" />
            <span className="flex-1">{t('language')}</span>
            <span className="text-xs text-muted-foreground">Portugues</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="cursor-pointer py-2.5 px-4"
          >
            {theme === 'dark' ? (
              <Sun className="mr-3 h-4 w-4 text-muted-foreground" />
            ) : (
              <Moon className="mr-3 h-4 w-4 text-muted-foreground" />
            )}
            <span>{theme === 'dark' ? t('lightMode') : t('darkMode')}</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <div className="p-2">
          <button
            onClick={handleSignOut}
            className="w-full py-2 px-4 text-sm text-muted-foreground border border-border rounded-lg hover:bg-accent hover:text-foreground transition-colors"
          >
            {t('logout')}
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
