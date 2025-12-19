'use client'

import { cn } from '@/utils'
import { useTranslations } from 'next-intl'
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react'
import type { Insight, InsightType } from '@/types'

interface ComparisonInsightsProps {
  insights: Insight[]
  className?: string
}

/**
 * Componente que exibe insights/mensagens explicativas sobre a comparacao
 */
export function ComparisonInsights({ insights, className }: ComparisonInsightsProps) {
  const t = useTranslations('AuditEvolution')

  if (insights.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-2', className)}>
      {insights.map((insight, index) => (
        <InsightItem key={index} insight={insight} t={t} />
      ))}
    </div>
  )
}

interface InsightItemProps {
  insight: Insight
  t: ReturnType<typeof useTranslations<'AuditEvolution'>>
}

function InsightItem({ insight, t }: InsightItemProps) {
  const Icon = getInsightIcon(insight.type)
  const colorClass = getInsightColorClass(insight.type)

  // Tentar traduzir, senao usar fallback
  let message: string
  try {
    message = t(`insights.${insight.key}`, insight.params as Record<string, string>)
  } catch {
    message = getFallbackMessage(insight)
  }

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        colorClass
      )}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm leading-relaxed">{message}</p>
    </div>
  )
}

function getInsightIcon(type: InsightType) {
  switch (type) {
    case 'positive':
      return CheckCircle2
    case 'negative':
      return AlertCircle
    case 'warning':
      return AlertTriangle
    case 'neutral':
      return Info
  }
}

function getInsightColorClass(type: InsightType): string {
  switch (type) {
    case 'positive':
      return 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300'
    case 'negative':
      return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
    case 'warning':
      return 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300'
    case 'neutral':
      return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
  }
}

function getFallbackMessage(insight: Insight): string {
  const { key, params } = insight
  const count = params.count as number | undefined
  const percent = params.percent as number | undefined

  switch (key) {
    case 'criticalFixed':
      return `${count} problema(s) critico(s) corrigido(s) desde a ultima auditoria`
    case 'seriousFixed':
      return `${count} problema(s) serio(s) corrigido(s)`
    case 'newCritical':
      return `${count} novo(s) problema(s) critico(s) detectado(s)`
    case 'newSerious':
      return `${count} novo(s) problema(s) serio(s) detectado(s)`
    case 'scoreImproved':
      return `O score de saude melhorou ${percent}%`
    case 'scoreDecreased':
      return `O score de saude caiu ${percent}%`
    case 'focusOn':
      return `Foque em corrigir os ${count} problema(s) critico(s) restante(s)`
    case 'greatProgress':
      return 'Excelente progresso! Continue assim.'
    case 'significantRegression':
      return `Atencao: ${count} novas violacoes detectadas`
    case 'noViolations':
      return 'Parabens! Nenhuma violacao encontrada.'
    case 'firstAudit':
      return 'Esta e a primeira auditoria. Execute mais para ver a evolucao.'
    case 'manyFixed':
      return `${count} violacoes foram corrigidas`
    case 'manyNew':
      return `${count} novas violacoes detectadas`
    case 'stable':
      return 'O site esta estavel, sem mudancas significativas.'
    case 'consistentImprovement':
      return `Melhoria consistente de ${percent}% ao longo do tempo`
    case 'consistentWorsening':
      return `Piora consistente de ${percent}% ao longo do tempo`
    default:
      return `Insight: ${key}`
  }
}
