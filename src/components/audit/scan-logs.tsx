'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/utils'
import type { ScanLogEntry } from '@/lib/audit'

interface ScanLogsProps {
  entries: ScanLogEntry[]
  className?: string
}

type FilterOption = 'all' | 'success' | 'failure' | 'redirect'

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'success',
  },
  failure: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    label: 'failures',
  },
  redirect: {
    icon: RefreshCw,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'redirects',
  },
}

export function ScanLogs({ entries, className }: ScanLogsProps) {
  const t = useTranslations('AuditComponents')
  const [filter, setFilter] = useState<FilterOption>('all')

  // Contagens por status
  const statusCounts = useMemo(() => {
    const counts = { success: 0, failure: 0, redirect: 0 }
    for (const entry of entries) {
      counts[entry.status]++
    }
    return counts
  }, [entries])

  // Entries filtradas
  const filteredEntries = useMemo(() => {
    if (filter === 'all') return entries
    return entries.filter(e => e.status === filter)
  }, [entries, filter])

  // Formatar data
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)
  }

  // Truncar URL para exibicao
  const truncateUrl = (url: string, maxLength = 50) => {
    if (url.length <= maxLength) return url
    return url.substring(0, maxLength) + '...'
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">{t('scanLogs')}</CardTitle>

          <div className="flex items-center gap-4">
            {/* Filter */}
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterOption)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('statusAll')}</SelectItem>
                <SelectItem value="success">{t('statusSuccess')}</SelectItem>
                <SelectItem value="failure">{t('statusFailures')}</SelectItem>
                <SelectItem value="redirect">{t('statusRedirects')}</SelectItem>
              </SelectContent>
            </Select>

            {/* Status badges */}
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">
                  {statusCounts.success} {t('statusSuccessLabel')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-red-600 font-medium">
                  {statusCounts.failure} {t('statusFailuresLabel')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <RefreshCw className="w-4 h-4 text-blue-600" />
                <span className="text-blue-600 font-medium">
                  {statusCounts.redirect} {t('statusRedirectsLabel')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-xs uppercase tracking-wider border-b">
                <th className="text-left py-3 font-medium">{t('tableDate')}</th>
                <th className="text-left py-3 font-medium">{t('tablePage')}</th>
                <th className="text-left py-3 font-medium">{t('tableDescription')}</th>
                <th className="text-right py-3 font-medium">{t('tableScore')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    {t('noEntriesFound')}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => {
                  const config = STATUS_CONFIG[entry.status]
                  const Icon = config.icon

                  return (
                    <tr key={entry.id} className="border-b border-border/50 hover:bg-muted/50">
                      <td className="py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(entry.date)}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Icon className={cn('w-4 h-4 shrink-0', config.color)} />
                          <a
                            href={entry.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:underline flex items-center gap-1 max-w-[300px]"
                            title={entry.url}
                          >
                            <span className="truncate">{truncateUrl(entry.url)}</span>
                            <ExternalLink className="w-3 h-3 shrink-0 text-muted-foreground" />
                          </a>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={cn('text-sm', config.color)}>
                          {entry.description}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {entry.score !== undefined ? (
                          <div className="inline-flex items-center justify-center w-10 h-10 rounded-full border-2 border-current">
                            <span className="text-sm font-medium">{entry.score}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
