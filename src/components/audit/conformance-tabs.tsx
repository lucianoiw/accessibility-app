'use client'

import { useState, useMemo, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Circle,
  MinusCircle,
  ExternalLink,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/utils'
import type { AggregatedViolation } from '@/types'
import {
  WCAG_22_CRITERIA,
  WCAG_PRINCIPLES,
  EMAG_31_RECOMMENDATIONS,
  EMAG_SECTIONS,
  type CriterionStatus,
} from '@/lib/audit/conformance-standards'

// IDs das regras WCAG partial (detecção parcial que requer verificação manual)
const WCAG_PARTIAL_RULE_IDS = new Set([
  'input-sem-autocomplete',
  'link-sem-underline-em-texto',
  'video-sem-legendas',
  'video-sem-audiodescricao',
  'select-onchange-navega',
])

interface ConformanceTabsProps {
  violations: AggregatedViolation[]
  wcagLevels?: string[]
  includeEmag?: boolean
  className?: string
}

type TabId = 'wcag' | 'emag'
type SortOption = 'status' | 'id'

const STATUS_STYLES: Record<CriterionStatus, {
  icon: typeof CheckCircle2
  color: string
  bgColor: string
}> = {
  pass: {
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  fail: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  needs_review: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  manual: {
    icon: Circle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
  },
  not_tested: {
    icon: MinusCircle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900',
  },
}

export function ConformanceTabs({
  violations,
  wcagLevels = ['A', 'AA'],
  includeEmag = false,
  className,
}: ConformanceTabsProps) {
  const t = useTranslations('AuditComponents')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabId>('wcag')
  const [sortBy, setSortBy] = useState<SortOption>('status')

  // Translated status labels and tooltips
  const STATUS_CONFIG = useMemo(() => ({
    pass: {
      ...STATUS_STYLES.pass,
      label: t('statusNoIssuesFound'),
      tooltip: t('statusNoIssuesFoundTooltip'),
    },
    fail: {
      ...STATUS_STYLES.fail,
      label: t('statusIssuesFound'),
      tooltip: t('statusIssuesFoundTooltip'),
    },
    needs_review: {
      ...STATUS_STYLES.needs_review,
      label: t('statusNeedsAssistedTests'),
      tooltip: t('statusNeedsAssistedTestsTooltip'),
    },
    manual: {
      ...STATUS_STYLES.manual,
      label: t('statusNeedsManualChecks'),
      tooltip: t('statusNeedsManualChecksTooltip'),
    },
    not_tested: {
      ...STATUS_STYLES.not_tested,
      label: t('statusNotTested'),
      tooltip: t('statusNotTestedTooltip'),
    },
  }), [t])

  // Mapear violacoes para criterios afetados com contagem de paginas
  // Também rastreia se as violações são de regras WCAG partial (detecção parcial)
  const wcagViolationData = useMemo(() => {
    const data: Record<string, {
      pageCount: number
      occurrences: number
      hasDefiniteViolations: boolean  // true se tem violações de regras não-partial
      hasPartialViolations: boolean   // true se tem violações de regras partial
    }> = {}
    for (const v of violations) {
      if (v.wcag_criteria && Array.isArray(v.wcag_criteria)) {
        const isPartialRule = WCAG_PARTIAL_RULE_IDS.has(v.rule_id)
        for (const c of v.wcag_criteria) {
          if (!data[c]) {
            data[c] = {
              pageCount: 0,
              occurrences: 0,
              hasDefiniteViolations: false,
              hasPartialViolations: false,
            }
          }
          data[c].pageCount += v.page_count || 0
          data[c].occurrences += v.occurrences || 0
          if (isPartialRule) {
            data[c].hasPartialViolations = true
          } else {
            data[c].hasDefiniteViolations = true
          }
        }
      }
    }
    return data
  }, [violations])

  const emagViolationData = useMemo(() => {
    const data: Record<string, { pageCount: number; occurrences: number }> = {}
    for (const v of violations) {
      if (v.emag_recommendations && Array.isArray(v.emag_recommendations)) {
        for (const r of v.emag_recommendations) {
          if (!data[r]) {
            data[r] = { pageCount: 0, occurrences: 0 }
          }
          data[r].pageCount += v.page_count || 0
          data[r].occurrences += v.occurrences || 0
        }
      }
    }
    return data
  }, [violations])

  // Calcular status de cada criterio WCAG
  const wcagCriteria = useMemo(() => {
    const normalizedLevels = wcagLevels.map(l => l.toUpperCase())

    return WCAG_22_CRITERIA
      .filter(c => c.level && normalizedLevels.includes(c.level))
      .map(c => {
        let status: CriterionStatus = 'manual'
        const violationInfo = wcagViolationData[c.id]

        if (violationInfo && violationInfo.pageCount > 0) {
          // Determinar status baseado no tipo de violação
          if (violationInfo.hasDefiniteViolations) {
            // Se há violações definitivas (regras não-partial), é 'fail'
            status = 'fail'
          } else if (violationInfo.hasPartialViolations) {
            // Se só há violações de regras partial, é 'needs_review'
            status = 'needs_review'
          }
        } else {
          // Criterios que podem ser testados automaticamente
          const autoTestable = [
            '1.1.1', '1.3.1', '1.4.3', '1.4.4', '1.4.11', '1.4.12',
            '2.1.1', '2.4.1', '2.4.2', '2.4.4', '2.4.6', '2.4.7',
            '3.1.1', '3.1.2', '3.3.1', '3.3.2',
            '4.1.1', '4.1.2',
          ]

          if (autoTestable.includes(c.id)) {
            status = 'pass'
          }
        }

        return {
          ...c,
          status,
          pageCount: violationInfo?.pageCount || 0,
          occurrences: violationInfo?.occurrences || 0,
        }
      })
  }, [wcagLevels, wcagViolationData])

  // Calcular status de cada recomendacao eMAG
  const emagCriteria = useMemo(() => {
    return EMAG_31_RECOMMENDATIONS.map(r => {
      let status: CriterionStatus = 'manual'
      const violationInfo = emagViolationData[r.id]

      if (violationInfo && violationInfo.pageCount > 0) {
        status = 'fail'
      } else {
        // Recomendacoes que podem ser testadas automaticamente
        const autoTestable = [
          '1.5', '1.6', '1.7', '1.9',
          '2.3', '2.4', '2.7',
          '3.1', '3.2', '3.4', '3.5', '3.6', '3.8',
          '4.1', '4.3',
        ]

        if (autoTestable.includes(r.id)) {
          status = 'pass'
        }
      }

      return {
        ...r,
        status,
        pageCount: violationInfo?.pageCount || 0,
        occurrences: violationInfo?.occurrences || 0,
      }
    })
  }, [emagViolationData])

  // Agrupar por principio/secao
  const wcagByPrinciple = useMemo(() => {
    return WCAG_PRINCIPLES.map(p => ({
      ...p,
      criteria: wcagCriteria.filter(c => c.principle === p.id),
    }))
  }, [wcagCriteria])

  const emagBySection = useMemo(() => {
    return EMAG_SECTIONS.map(s => ({
      ...s,
      criteria: emagCriteria.filter(c => c.principle === s.id),
    }))
  }, [emagCriteria])

  // Contagens de status
  const wcagStatusCounts = useMemo(() => {
    const counts: Record<CriterionStatus, number> = {
      pass: 0, fail: 0, needs_review: 0, manual: 0, not_tested: 0,
    }
    for (const c of wcagCriteria) {
      counts[c.status]++
    }
    return counts
  }, [wcagCriteria])

  const emagStatusCounts = useMemo(() => {
    const counts: Record<CriterionStatus, number> = {
      pass: 0, fail: 0, needs_review: 0, manual: 0, not_tested: 0,
    }
    for (const c of emagCriteria) {
      counts[c.status]++
    }
    return counts
  }, [emagCriteria])

  // Handler para navegar para violacoes filtradas
  const handleViewViolations = useCallback((criterionId: string, isWcag: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    if (isWcag) {
      params.set('wcag', criterionId)
    } else {
      params.set('emag', criterionId)
    }
    router.push(`?${params.toString()}#violations`, { scroll: true })
  }, [router, searchParams])

  const currentPrinciples = activeTab === 'wcag' ? wcagByPrinciple : emagBySection
  const currentStatusCounts = activeTab === 'wcag' ? wcagStatusCounts : emagStatusCounts
  const currentDescription = activeTab === 'wcag'
    ? t('conformanceWcagDescription')
    : t('conformanceEmagDescription')

  const tabs = [
    { id: 'wcag' as TabId, label: 'WCAG 2.2 AA' },
    ...(includeEmag ? [{ id: 'emag' as TabId, label: 'eMAG 3.1' }] : []),
  ]

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg">{t('conformanceSummary')}</CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label={t('conformanceSummaryTooltip')}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-sm">{t('conformanceSummaryTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tabs e controles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab buttons */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  activeTab === tab.id
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder={t('sortByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="status">{t('sortByStatus')}</SelectItem>
              <SelectItem value="id">{t('sortById')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground">
          {currentDescription}
        </p>

        {/* Grid por principio */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {currentPrinciples.map(principle => (
            <div key={principle.id}>
              <div className="flex items-center gap-1 mb-2">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {principle.name}
                </h4>
                {(principle as { description?: string }).description && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">{(principle as { description?: string }).description}</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1">
                {principle.criteria
                  .sort((a, b) => {
                    if (sortBy === 'status') {
                      const statusOrder: CriterionStatus[] = ['fail', 'needs_review', 'pass', 'manual', 'not_tested']
                      return statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
                    }
                    return a.id.localeCompare(b.id, undefined, { numeric: true })
                  })
                  .map(criterion => {
                    const config = STATUS_CONFIG[criterion.status]
                    const Icon = config.icon
                    const isWcag = activeTab === 'wcag'
                    const hasFailed = criterion.status === 'fail'

                    return (
                      <Popover key={criterion.id}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              'flex items-center justify-center gap-0.5 px-1 py-1 rounded text-xs font-medium transition-colors w-full min-w-[52px]',
                              config.bgColor,
                              config.color,
                              'hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1'
                            )}
                            aria-label={`${criterion.id}: ${criterion.name} - ${config.label}`}
                          >
                            <Icon className="w-3 h-3 shrink-0" />
                            <span className="truncate">{criterion.id}</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="start">
                          <div className="space-y-3">
                            {/* Header */}
                            <div>
                              <h3 className="font-semibold text-sm">
                                {criterion.id} {criterion.name}
                                {(criterion as { level?: string }).level && (
                                  <span className="ml-1 text-muted-foreground">
                                    ({(criterion as { level?: string }).level})
                                  </span>
                                )}
                              </h3>
                              {(criterion as { abntRef?: string }).abntRef && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {(criterion as { abntRef?: string }).abntRef}
                                </p>
                              )}
                            </div>

                            {/* Description */}
                            <p className="text-sm text-muted-foreground">
                              {(criterion as { description?: string }).description || criterion.name}
                            </p>

                            {/* Learn more link */}
                            {(criterion as { learnMoreUrl?: string }).learnMoreUrl && (
                              <a
                                href={(criterion as { learnMoreUrl?: string }).learnMoreUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                {t('learnMore')}
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}

                            {/* Status */}
                            <div className="pt-2 border-t">
                              <div className={cn('flex items-center gap-2 text-sm', config.color)}>
                                <Icon className="w-4 h-4" />
                                <span className="font-medium">{config.label}</span>
                              </div>

                              {hasFailed && (criterion as { pageCount?: number }).pageCount ? (
                                <div className="mt-2 space-y-2">
                                  <p className="text-sm text-muted-foreground">
                                    {t('foundInPages', { count: (criterion as { pageCount?: number }).pageCount ?? 0 })}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleViewViolations(criterion.id, isWcag)}
                                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                  >
                                    {t('viewViolations')}
                                    <ArrowRight className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 pt-4 border-t text-xs">
          {Object.entries(STATUS_CONFIG).map(([status, config]) => {
            const count = currentStatusCounts[status as CriterionStatus]
            if (count === 0) return null

            const Icon = config.icon

            return (
              <Tooltip key={status}>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 cursor-help">
                    <Icon className={cn('w-4 h-4', config.color)} />
                    <span>{config.label}</span>
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {count}
                    </Badge>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">{config.tooltip}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
