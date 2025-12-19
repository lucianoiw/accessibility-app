'use client'

import { useTranslations } from 'next-intl'
import { ArrowRight, GitCompare, Calendar, AlertCircle, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/utils'
import { DeltaBadge } from './delta-badge'
import { ComparisonInsights } from './comparison-insights'
import type { ComparisonResponse, Insight } from '@/types'

interface ComparisonCardProps {
  comparison: ComparisonResponse | null
  insights?: Insight[]
  projectId: string
  auditId: string
  locale: string
  className?: string
  onCompareClick?: () => void
}

/**
 * Card de comparacao de auditoria para exibir no dashboard
 * Mostra resumo das mudancas desde a ultima auditoria
 */
export function ComparisonCard({
  comparison,
  insights = [],
  projectId,
  auditId,
  locale,
  className,
  onCompareClick,
}: ComparisonCardProps) {
  const t = useTranslations('AuditComparison')
  const tSeverity = useTranslations('Severity')

  // Se nao ha comparacao (primeira auditoria)
  if (!comparison || !comparison.previous) {
    return (
      <Card className={cn('', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t('title')}</CardTitle>
          </div>
          <CardDescription>{t('noComparison')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <AlertCircle className="h-10 w-10 mb-3 opacity-40" />
            <p className="text-sm">{t('noComparison')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { current, previous, delta, violations } = comparison

  // Formatar datas
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  const currentDate = formatDate(current.createdAt)
  const previousDate = formatDate(previous.createdAt)

  // Contagens de violacoes por tipo de mudanca
  const violationCounts = {
    new: violations.new.length,
    fixed: violations.fixed.length,
    persistent: violations.persistent.length,
    worsened: violations.worsened.length,
    improved: violations.improved.length,
  }

  // Calcular cor do score
  const getScoreColor = (score: number | null) => {
    if (!score) return 'text-gray-500'
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-blue-600 dark:text-blue-400'
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBg = (score: number | null) => {
    if (!score) return 'bg-gray-100 dark:bg-gray-800'
    if (score >= 90) return 'bg-green-50 dark:bg-green-900/20'
    if (score >= 70) return 'bg-blue-50 dark:bg-blue-900/20'
    if (score >= 50) return 'bg-yellow-50 dark:bg-yellow-900/20'
    return 'bg-red-50 dark:bg-red-900/20'
  }

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{t('title')}</CardTitle>
          </div>
          {onCompareClick && (
            <button
              type="button"
              onClick={onCompareClick}
              className="text-sm text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1"
            >
              {t('compareWith')}
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Comparacao lado a lado: Anterior vs Atual */}
        <div className="grid grid-cols-2 gap-4">
          {/* Auditoria Anterior */}
          <div className="space-y-3 p-3 rounded-lg border border-dashed opacity-75">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>{t('previousAudit')}</span>
            </div>
            <p className="text-xs font-medium">{previousDate}</p>

            {/* Score anterior */}
            <div className={cn('p-2 rounded text-center', getScoreBg(previous.healthScore))}>
              <p className="text-xs text-muted-foreground">Score</p>
              <p className={cn('text-2xl font-bold', getScoreColor(previous.healthScore))}>
                {previous.healthScore ?? '-'}%
              </p>
            </div>

            {/* Violacoes anteriores */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t('summary.violations')}</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-lg font-semibold">{previous.summary?.total ?? 0}</p>
                {previous.summary?.patterns && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-xs text-muted-foreground">
                        ({previous.summary.patterns.total} {t('summary.patterns')})
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{t('tooltips.patterns')}</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </div>

            {/* Paginas auditadas */}
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{previous.pagesAudited} paginas</span>
            </div>
          </div>

          {/* Auditoria Atual */}
          <div className="space-y-3 p-3 rounded-lg border-2 border-primary/20 bg-primary/5">
            <div className="flex items-center gap-2 text-xs text-primary font-medium">
              <Calendar className="h-3 w-3" />
              <span>{t('currentAudit')}</span>
            </div>
            <p className="text-xs font-medium">{currentDate}</p>

            {/* Score atual */}
            <div className={cn('p-2 rounded text-center', getScoreBg(current.healthScore))}>
              <div className="flex items-center justify-center gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Score</p>
                  <p className={cn('text-2xl font-bold', getScoreColor(current.healthScore))}>
                    {current.healthScore ?? '-'}%
                  </p>
                </div>
                {delta.healthScore !== 0 && (
                  <DeltaBadge value={delta.healthScore} type="score" size="sm" />
                )}
              </div>
            </div>

            {/* Violacoes atuais */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">{t('summary.violations')}</p>
                  <div className="flex items-center justify-center gap-2">
                    <p className="text-lg font-semibold">{current.summary?.total ?? 0}</p>
                    {current.summary?.patterns && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground">
                            ({current.summary.patterns.total} {t('summary.patterns')})
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{t('tooltips.patterns')}</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </div>
                {delta.total !== 0 && (
                  <DeltaBadge value={delta.total} type="violations" size="sm" />
                )}
              </div>
            </div>

            {/* Paginas auditadas */}
            <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{current.pagesAudited} paginas</span>
              {delta.pagesAudited !== 0 && (
                <span className="text-blue-500">
                  ({delta.pagesAudited > 0 ? '+' : ''}{delta.pagesAudited})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detalhes por severidade */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">
            Detalhes por Severidade
          </h4>
          <div className="grid grid-cols-4 gap-2">
            <SeverityBox
              label={tSeverity('critical')}
              previous={previous.summary?.critical ?? 0}
              current={current.summary?.critical ?? 0}
              delta={delta.critical}
              severity="critical"
            />
            <SeverityBox
              label={tSeverity('serious')}
              previous={previous.summary?.serious ?? 0}
              current={current.summary?.serious ?? 0}
              delta={delta.serious}
              severity="serious"
            />
            <SeverityBox
              label={tSeverity('moderate')}
              previous={previous.summary?.moderate ?? 0}
              current={current.summary?.moderate ?? 0}
              delta={delta.moderate}
              severity="moderate"
            />
            <SeverityBox
              label={tSeverity('minor')}
              previous={previous.summary?.minor ?? 0}
              current={current.summary?.minor ?? 0}
              delta={delta.minor}
              severity="minor"
            />
          </div>
        </div>

        {/* Resumo de mudancas */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t">
          {violationCounts.fixed > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">{violationCounts.fixed} {t('delta.fixed').toLowerCase()}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('tooltips.fixedViolation')}</TooltipContent>
            </Tooltip>
          )}
          {violationCounts.new > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm font-medium">{violationCounts.new} {t('delta.new').toLowerCase()}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>{t('tooltips.newViolation')}</TooltipContent>
            </Tooltip>
          )}
          {violationCounts.worsened > 0 && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              {violationCounts.worsened} {t('delta.worsened').toLowerCase()}
            </span>
          )}
          {violationCounts.improved > 0 && (
            <span className="text-sm text-blue-600 dark:text-blue-400">
              {violationCounts.improved} {t('delta.improved').toLowerCase()}
            </span>
          )}
          {violationCounts.persistent > 0 && (
            <span className="text-sm text-muted-foreground">
              {violationCounts.persistent} {t('delta.persistent').toLowerCase()}
            </span>
          )}
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <ComparisonInsights insights={insights} className="pt-2" />
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// Componente auxiliar: SeverityBox
// ============================================

interface SeverityBoxProps {
  label: string
  previous: number
  current: number
  delta: number
  severity: 'critical' | 'serious' | 'moderate' | 'minor'
}

function SeverityBox({ label, previous, current, delta, severity }: SeverityBoxProps) {
  const t = useTranslations('AuditComparison')

  const severityStyles = {
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
    },
    serious: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200 dark:border-orange-800',
    },
    moderate: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
    },
    minor: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
    },
  }

  const style = severityStyles[severity]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('p-2 rounded border text-center cursor-help', style.bg, style.border)}>
          <p className={cn('text-[10px] font-medium uppercase tracking-wider', style.text)}>
            {label}
          </p>
          <div className="flex items-center justify-center gap-1 mt-1">
            <span className="text-xs text-muted-foreground line-through">{previous}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className={cn('text-sm font-bold', style.text)}>{current}</span>
          </div>
          {delta !== 0 && (
            <div className="mt-1">
              <DeltaBadge value={delta} type="violations" size="sm" showIcon={false} />
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}: {previous} → {current}</p>
        {delta !== 0 && (
          <p className={delta < 0 ? 'text-green-400' : 'text-red-400'}>
            {delta > 0 ? '+' : ''}{delta} {delta < 0 ? '(melhoria)' : '(piora)'}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
