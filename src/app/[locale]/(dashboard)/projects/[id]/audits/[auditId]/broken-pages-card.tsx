'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { BrokenPage, BrokenPageErrorType } from '@/types'
import { AlertTriangle, Clock, Globe, Lock, Server, HelpCircle } from 'lucide-react'

interface BrokenPagesCardProps {
  brokenPages: BrokenPage[]
}

// Configuração de estilos por tipo de erro (sem labels)
const ERROR_STYLES: Record<BrokenPageErrorType, {
  color: string
  bgColor: string
  icon: typeof AlertTriangle
}> = {
  timeout: {
    color: 'text-yellow-700 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    icon: Clock,
  },
  http_error: {
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: Server,
  },
  connection_error: {
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    icon: Globe,
  },
  ssl_error: {
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: Lock,
  },
  other: {
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    icon: HelpCircle,
  },
}

function truncateUrl(url: string, maxLength: number = 60): string {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname + parsed.search
    if (path.length <= maxLength) return path
    return path.substring(0, maxLength - 3) + '...'
  } catch {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength - 3) + '...'
  }
}

export function BrokenPagesCard({ brokenPages }: BrokenPagesCardProps) {
  const t = useTranslations('BrokenPagesCard')

  // Labels traduzidos
  const errorLabels = useMemo(() => ({
    timeout: t('timeout'),
    http_error: t('httpError'),
    connection_error: t('connectionError'),
    ssl_error: t('sslError'),
    other: t('other'),
  }), [t])

  const getDisplayLabel = (page: BrokenPage): string => {
    if (page.error_type === 'http_error' && page.http_status) {
      return page.http_status.toString()
    }
    return errorLabels[page.error_type] || t('error')
  }

  if (!brokenPages || brokenPages.length === 0) {
    return null
  }

  // Agrupar por tipo de erro para estatísticas
  const byType = brokenPages.reduce((acc, page) => {
    const type = page.error_type
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<BrokenPageErrorType, number>)

  return (
    <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <CardTitle className="text-lg">
            {t('title', { count: brokenPages.length })}
          </CardTitle>
        </div>
        <CardDescription>
          {t('description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Resumo por tipo */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(byType).map(([type, count]) => {
            const styles = ERROR_STYLES[type as BrokenPageErrorType]
            return (
              <Badge
                key={type}
                variant="secondary"
                className={`${styles.bgColor} ${styles.color}`}
              >
                {errorLabels[type as BrokenPageErrorType]}: {count}
              </Badge>
            )
          })}
        </div>

        {/* Lista de páginas */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {brokenPages.map((page) => {
            const styles = ERROR_STYLES[page.error_type]
            const Icon = styles.icon

            return (
              <div
                key={page.id}
                className="flex items-center gap-3 py-2 px-3 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
              >
                <Badge
                  variant="outline"
                  className={`${styles.bgColor} ${styles.color} font-mono text-xs min-w-[65px] justify-center`}
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {getDisplayLabel(page)}
                </Badge>
                <span
                  className="text-sm font-mono text-gray-700 dark:text-gray-300 truncate flex-1"
                  title={page.url}
                >
                  {truncateUrl(page.url)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Dica */}
        <p className="text-xs text-muted-foreground mt-4 pt-3 border-t">
          {t('hint')}
        </p>
      </CardContent>
    </Card>
  )
}
