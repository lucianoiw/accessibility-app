'use client'

import { Link } from '@/i18n/navigation'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight, Home } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbNavProps {
  // Nomes customizados para IDs dinâmicos (ex: nome do projeto)
  customLabels?: Record<string, string>
}

export function BreadcrumbNav({ customLabels = {} }: BreadcrumbNavProps) {
  const pathname = usePathname()
  const t = useTranslations('Navigation')
  const tProject = useTranslations('ProjectSettings')

  // Mapeamento de segmentos para labels traduzidas
  const segmentLabels: Record<string, string> = {
    projects: t('projects'),
    new: t('new'),
    audits: t('audits'),
    settings: t('settings'),
    auth: tProject('authentication'),
    domains: tProject('domains'),
    defaults: tProject('defaults'),
    emag: 'eMAG',
    billing: t('billing'),
    danger: tProject('dangerZone'),
    discovery: tProject('discovery'),
  }

  // Remover prefixo de locale do pathname
  const cleanPathname = pathname.replace(/^\/(pt-BR|en|es)/, '') || '/'

  // Ignorar breadcrumb na home
  if (cleanPathname === '/') {
    return null
  }

  const segments = cleanPathname.split('/').filter(Boolean)

  // Gerar breadcrumb items
  const breadcrumbItems = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    const isLast = index === segments.length - 1

    // Determinar o label
    let label = segmentLabels[segment] || customLabels[segment] || segment

    // Truncar IDs muito longos (UUIDs)
    if (label.length > 20 && !segmentLabels[segment] && !customLabels[segment]) {
      label = label.slice(0, 8) + '...'
    }

    return {
      href,
      label,
      isLast,
    }
  })

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item) => (
          <BreadcrumbItem key={item.href}>
            <BreadcrumbSeparator>
              <ChevronRight className="h-3.5 w-3.5" />
            </BreadcrumbSeparator>
            {item.isLast ? (
              <BreadcrumbPage className="max-w-[200px] truncate">
                {item.label}
              </BreadcrumbPage>
            ) : (
              <BreadcrumbLink asChild>
                <Link href={item.href} className="max-w-[200px] truncate">
                  {item.label}
                </Link>
              </BreadcrumbLink>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
