'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Progress } from '@/components/ui/progress'
import { Link } from '@/i18n/navigation'
import type { EmagComplianceReport } from '@/lib/audit/emag-evaluator'
import type { EmagStatus, EmagSection } from '@/lib/audit/emag-map'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  MinusCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Printer,
  ExternalLink,
  Info,
  Filter,
  Loader2,
  ArrowLeft,
} from 'lucide-react'

type StatusConfigItem = {
  icon: typeof CheckCircle
  color: string
  bg: string
  border: string
  labelKey: string
  descriptionKey: string
}

const STATUS_CONFIG_BASE: Record<EmagStatus, StatusConfigItem> = {
  pass: {
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-50 dark:bg-green-950/50',
    border: 'border-green-200 dark:border-green-900',
    labelKey: 'conformant',
    descriptionKey: 'noViolationsDesc',
  },
  fail: {
    icon: XCircle,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-950/50',
    border: 'border-red-200 dark:border-red-900',
    labelKey: 'nonConformant',
    descriptionKey: 'criticalSeriousDesc',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 dark:text-yellow-400',
    bg: 'bg-yellow-50 dark:bg-yellow-950/50',
    border: 'border-yellow-200 dark:border-yellow-900',
    labelKey: 'attention',
    descriptionKey: 'minorViolationsDesc',
  },
  not_tested: {
    icon: HelpCircle,
    color: 'text-gray-500 dark:text-gray-400',
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-800',
    labelKey: 'notTested',
    descriptionKey: 'manualVerificationDesc',
  },
  not_applicable: {
    icon: MinusCircle,
    color: 'text-gray-400 dark:text-gray-500',
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-800',
    labelKey: 'notApplicable',
    descriptionKey: 'notApplicableDesc',
  },
}

const SECTION_ICONS: Record<EmagSection, string> = {
  marcacao: '🏷️',
  comportamento: '⚡',
  conteudo: '📝',
  apresentacao: '🎨',
  multimidia: '🎬',
  formulario: '📋',
}

type StatusFilter = 'all' | EmagStatus

export default function EmagCompliancePage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string
  const auditId = params.auditId as string
  const locale = params.locale as string

  const t = useTranslations('EmagReport')
  const tNav = useTranslations('Navigation')
  const tAudit = useTranslations('Audit')
  const tCommon = useTranslations('Common')

  const [report, setReport] = useState<EmagComplianceReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  // Create translated status config
  const statusConfig = useMemo(() => {
    const config: Record<EmagStatus, { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string; description: string }> = {} as typeof config
    for (const [key, value] of Object.entries(STATUS_CONFIG_BASE)) {
      config[key as EmagStatus] = {
        ...value,
        label: t(value.labelKey),
        description: t(value.descriptionKey),
      }
    }
    return config
  }, [t])

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/audits/${auditId}/emag`)
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || t('loadError'))
        }
        const data = await res.json()
        setReport(data)
        // Expand sections with failures by default
        const sectionsWithIssues = data.sections
          .filter((s: { failed: number }) => s.failed > 0)
          .map((s: { section: string }) => s.section)
        setExpandedSections(new Set(sectionsWithIssues))
      } catch (err) {
        setError(err instanceof Error ? err.message : t('unknownError'))
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [auditId, t])

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const expandAll = () => {
    if (report) {
      setExpandedSections(new Set(report.sections.map((s) => s.section)))
    }
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  const handlePrint = () => {
    window.print()
  }

  const filterEvaluations = (evaluations: EmagComplianceReport['sections'][0]['evaluations']) => {
    if (statusFilter === 'all') return evaluations
    return evaluations.filter((e) => e.status === statusFilter)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-muted-foreground">{t('loadingReport')}</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-8">
        <Card>
          <CardContent className="py-12 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <p className="text-lg font-medium text-muted-foreground mb-2">{error}</p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href={`/projects/${projectId}/audits/${auditId}`}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('backToResults')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!report) return null

  const getComplianceColor = (percent: number) => {
    if (percent >= 90) return 'text-green-500'
    if (percent >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getProgressColor = (passed: number, total: number) => {
    const percent = (passed / total) * 100
    if (percent >= 90) return '#22c55e' // green-500
    if (percent >= 70) return '#eab308' // yellow-500
    return '#ef4444' // red-500
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Breadcrumb - hide on print */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground print:hidden">
        <Link href="/projects" className="hover:underline">
          {tNav('projects')}
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:underline">
          {report.projectName}
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}/audits/${auditId}`} className="hover:underline">
          {tAudit('title')}
        </Link>
        <span>/</span>
        <span className="font-medium text-foreground">{t('compliance')}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('compliance')}</h2>
          <p className="text-muted-foreground">
            {t('complianceDescription')}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/projects/${projectId}/audits/${auditId}`}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {tCommon('back')}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            {t('printReport')}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://emag.governoeletronico.gov.br/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              {t('emagDocs')}
            </a>
          </Button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block border-b pb-4 mb-6">
        <h1 className="text-xl font-bold">{t('reportTitle')}</h1>
        <p className="text-sm text-muted-foreground">
          {t('project')}: {report.projectName} | {t('url')}: {report.projectUrl}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('auditDate')}: {new Date(report.auditDate).toLocaleDateString(locale)} |
          {t('generatedAt')}: {new Date(report.generatedAt).toLocaleDateString(locale)}
        </p>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('complianceSummary')}
          </CardTitle>
          <CardDescription>
            {t('complianceSummaryDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
            {/* Gauge */}
            <div className="relative w-36 h-36 mx-auto lg:mx-0 flex-shrink-0">
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  className="text-gray-200 dark:text-gray-700"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="60"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(report.summary.compliancePercent / 100) * 377} 377`}
                  className={getComplianceColor(report.summary.compliancePercent)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-3xl font-bold ${getComplianceColor(report.summary.compliancePercent)}`}>
                  {report.summary.compliancePercent}%
                </span>
                <span className="text-xs text-muted-foreground">{t('compliancePercent')}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 w-full">
              <StatCard
                status="pass"
                value={report.summary.passed}
                total={report.summary.totalRecommendations}
                statusConfig={statusConfig}
                tOfTotal={t('ofTotal')}
              />
              <StatCard
                status="fail"
                value={report.summary.failed}
                total={report.summary.totalRecommendations}
                statusConfig={statusConfig}
                tOfTotal={t('ofTotal')}
              />
              <StatCard
                status="warning"
                value={report.summary.warnings}
                total={report.summary.totalRecommendations}
                statusConfig={statusConfig}
                tOfTotal={t('ofTotal')}
              />
              <StatCard
                status="not_tested"
                value={report.summary.notTested}
                total={report.summary.totalRecommendations}
                statusConfig={statusConfig}
                tOfTotal={t('ofTotal')}
              />
            </div>
          </div>

          <p className="text-sm text-muted-foreground mt-6 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              {t('complianceNote')}
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Filters and Controls - hide on print */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('filterByStatus')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStatuses')}</SelectItem>
              <SelectItem value="pass">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  {t('conformant')}
                </span>
              </SelectItem>
              <SelectItem value="fail">
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-600" />
                  {t('nonConformant')}
                </span>
              </SelectItem>
              <SelectItem value="warning">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  {t('attention')}
                </span>
              </SelectItem>
              <SelectItem value="not_tested">
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-gray-500" />
                  {t('notTested')}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={expandAll}>
            {t('expandAll')}
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            {t('collapseAll')}
          </Button>
        </div>
      </div>

      {/* Sections */}
      {report.sections.map((section) => {
        const filteredEvaluations = filterEvaluations(section.evaluations)
        if (filteredEvaluations.length === 0 && statusFilter !== 'all') return null

        const isExpanded = expandedSections.has(section.section)
        const progressPercent = (section.passed / section.total) * 100

        return (
          <Collapsible
            key={section.section}
            open={isExpanded}
            onOpenChange={() => toggleSection(section.section)}
          >
            <Card className="print:break-inside-avoid">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors print:cursor-default">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl" role="img" aria-label={section.label}>
                        {SECTION_ICONS[section.section]}
                      </span>
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {section.label}
                          <ChevronRight
                            className={`w-5 h-5 text-muted-foreground transition-transform print:hidden ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                          />
                        </CardTitle>
                        <CardDescription className="mt-1">{section.description}</CardDescription>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold">
                        <span className="text-green-600">{section.passed}</span>
                        <span className="text-muted-foreground">/{section.total}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">{t('conformantCount')}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-4">
                    <Progress
                      value={progressPercent}
                      className="h-2"
                      style={
                        {
                          '--progress-background': getProgressColor(section.passed, section.total),
                        } as React.CSSProperties
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{Math.round(progressPercent)}% {t('conformantCount')}</span>
                      <span>{section.failed} {t('failures')}</span>
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent className="print:block">
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {filteredEvaluations.map((evaluation) => {
                      const config = statusConfig[evaluation.status]
                      const Icon = config.icon
                      const hasViolations = report.violationsByRecommendation[evaluation.recommendation.id]

                      return (
                        <div
                          key={evaluation.recommendation.id}
                          className={`p-4 rounded-lg border ${config.bg} ${config.border} print:break-inside-avoid`}
                        >
                          <div className="flex items-start gap-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="shrink-0 cursor-help">
                                  <Icon className={`w-5 h-5 mt-0.5 ${config.color}`} />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="right" className="max-w-xs">
                                <p className="font-medium">{config.label}</p>
                                <p className="text-xs opacity-80">{config.description}</p>
                              </TooltipContent>
                            </Tooltip>

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono text-sm text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                  {evaluation.recommendation.id}
                                </span>
                                <h4 className="font-medium">
                                  {evaluation.recommendation.title}
                                </h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} border ${config.border}`}>
                                  {config.label}
                                </span>
                              </div>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <p className="text-sm text-muted-foreground mt-1 cursor-help">
                                    {evaluation.recommendation.description}
                                  </p>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="max-w-md">
                                  <p className="text-xs">
                                    {evaluation.recommendation.description}
                                    {evaluation.recommendation.helpUrl && (
                                      <a
                                        href={evaluation.recommendation.helpUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-1 underline"
                                      >
                                        {t('learnMore')}
                                      </a>
                                    )}
                                  </p>
                                </TooltipContent>
                              </Tooltip>

                              {/* Metadata */}
                              <div className="flex flex-wrap gap-3 mt-2 text-xs">
                                {evaluation.details && (
                                  <span className={`px-2 py-0.5 rounded ${config.color} font-medium`}>
                                    {evaluation.details}
                                  </span>
                                )}
                                {evaluation.recommendation.wcagCriteria.length > 0 && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-muted-foreground cursor-help flex items-center gap-1">
                                        <span className="font-medium">WCAG:</span>
                                        {evaluation.recommendation.wcagCriteria.join(', ')}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t('wcagCriteria')}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                                <span className="text-muted-foreground">
                                  {t('verification')}:{' '}
                                  <span className="font-medium">
                                    {evaluation.recommendation.checkType === 'automated'
                                      ? t('automated')
                                      : evaluation.recommendation.checkType === 'semi-automated'
                                        ? t('semiAutomated')
                                        : t('manual')}
                                  </span>
                                </span>
                              </div>

                              {/* Violations found */}
                              {hasViolations && (
                                <div className="mt-3 space-y-2">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {t('violationsDetected')}:
                                  </p>
                                  {hasViolations.violations.map((v) => (
                                    <Link
                                      key={v.ruleId}
                                      href={`/projects/${projectId}/audits/${auditId}?rule=${v.ruleId}`}
                                      className="block text-xs bg-white dark:bg-gray-800 p-2 rounded border hover:border-primary transition-colors print:hover:border-inherit"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-foreground">
                                          {v.ruleLabel}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                          v.impact === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' :
                                          v.impact === 'serious' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' :
                                          v.impact === 'moderate' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' :
                                          'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                        }`}>
                                          {v.impact}
                                        </span>
                                      </div>
                                      <span className="text-muted-foreground">
                                        {t('occurrencesInPages', { occurrences: v.occurrences, pages: v.pages })}
                                      </span>
                                      <ExternalLink className="inline-block w-3 h-3 ml-1 print:hidden" />
                                    </Link>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}

                    {filteredEvaluations.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">
                        {t('noMatchingFilter')}
                      </p>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )
      })}

      {/* Print footer */}
      <div className="hidden print:block border-t pt-4 mt-6 text-xs text-muted-foreground">
        <p>
          {t('reportFooter')}
        </p>
      </div>
    </div>
  )
}

function StatCard({
  status,
  value,
  total,
  statusConfig,
  tOfTotal,
}: {
  status: EmagStatus
  value: number
  total: number
  statusConfig: Record<EmagStatus, { icon: typeof CheckCircle; color: string; bg: string; border: string; label: string; description: string }>
  tOfTotal: string
}) {
  const config = statusConfig[status]
  const Icon = config.icon
  const percent = Math.round((value / total) * 100)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`p-3 rounded-lg border ${config.bg} ${config.border} cursor-help transition-all hover:scale-105`}>
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className={`text-xl font-bold ${config.color}`}>{value}</span>
          </div>
          <div className="text-xs text-muted-foreground">{config.label}</div>
          <div className="text-[10px] text-muted-foreground">{percent}% {tOfTotal}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{config.description}</p>
      </TooltipContent>
    </Tooltip>
  )
}
