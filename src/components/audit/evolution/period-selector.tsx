'use client'

import { useTranslations } from 'next-intl'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type Period = '7d' | '30d' | '90d' | '1y' | 'all'

interface PeriodSelectorProps {
  value: Period
  onChange: (value: Period) => void
  className?: string
}

const PERIODS: Period[] = ['7d', '30d', '90d', '1y', 'all']

/**
 * Seletor de periodo para filtrar dados de evolucao
 */
export function PeriodSelector({ value, onChange, className }: PeriodSelectorProps) {
  const t = useTranslations('AuditEvolution')

  return (
    <Select value={value} onValueChange={(v) => onChange(v as Period)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={t('period.label')} />
      </SelectTrigger>
      <SelectContent>
        {PERIODS.map((period) => (
          <SelectItem key={period} value={period}>
            {getPeriodLabel(period, t)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function getPeriodLabel(
  period: Period,
  t: ReturnType<typeof useTranslations<'AuditEvolution'>>
): string {
  try {
    return t(`period.${period}`)
  } catch {
    return getFallbackLabel(period)
  }
}

function getFallbackLabel(period: Period): string {
  switch (period) {
    case '7d':
      return 'Ultimos 7 dias'
    case '30d':
      return 'Ultimos 30 dias'
    case '90d':
      return 'Ultimos 90 dias'
    case '1y':
      return 'Ultimo ano'
    case 'all':
      return 'Todo o historico'
  }
}
