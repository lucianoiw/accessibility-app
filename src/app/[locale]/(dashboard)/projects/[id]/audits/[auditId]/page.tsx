import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Link } from '@/i18n/navigation'
import type { Audit, Project, AggregatedViolation, BrokenPage } from '@/types'
import { AuditProgress } from './audit-progress'
import { ViolationsFilter } from './violations-filter'
import { ExportButton } from '@/components/reports/export-button'
import { BrokenPagesCard } from './broken-pages-card'
import {
  calculateAccessibilityScore,
  getCategoriesSortedByCount,
  createScanLogEntries,
  type SeverityBreakdown,
} from '@/lib/audit'
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  Info,
} from 'lucide-react'

// Novos componentes
import {
  ScoreCard,
  IssueSummaryChart,
  CategoryChart,
  ConformanceTabs,
  ScanLogs,
} from '@/components/audit'

interface Props {
  params: Promise<{ id: string; auditId: string; locale: string }>
}

export default async function AuditResultsPage({ params }: Props) {
  const { id, auditId, locale } = await params
  const t = await getTranslations('Audit')
  const tStatus = await getTranslations('AuditStatus')
  const tFailed = await getTranslations('AuditFailed')
  const tConfig = await getTranslations('AuditConfig')
  const tViolations = await getTranslations('Violations')
  const tCommon = await getTranslations('Common')
  const tNav = await getTranslations('Navigation')
  const supabase = await createClient()

  // Buscar projeto
  const { data: project } = (await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()) as { data: Project | null }

  if (!project) {
    notFound()
  }

  // Buscar auditoria
  const { data: audit } = (await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()) as { data: Audit | null }

  if (!audit) {
    notFound()
  }

  // Buscar violacoes agregadas
  const { data: violations } = (await supabase
    .from('aggregated_violations')
    .select('*')
    .eq('audit_id', auditId)
    .order('priority', { ascending: false })) as { data: AggregatedViolation[] | null }

  // Contar paginas com violacoes
  const { count: pagesWithViolations } = await supabase
    .from('audit_pages')
    .select('*', { count: 'exact', head: true })
    .eq('audit_id', auditId)
    .gt('violation_count', 0)

  // Buscar audit_pages para scan logs
  const { data: auditPages } = await supabase
    .from('audit_pages')
    .select('url, violation_count')
    .eq('audit_id', auditId)

  // Buscar paginas quebradas
  const { data: brokenPages } = (await supabase
    .from('broken_pages')
    .select('*')
    .eq('audit_id', auditId)
    .order('error_type', { ascending: true })) as { data: BrokenPage[] | null }

  const isInProgress = [
    'PENDING',
    'CRAWLING',
    'AUDITING',
    'AGGREGATING',
    'GENERATING',
  ].includes(audit.status)

  // Calcular dados para os novos componentes
  const violationsList = violations ?? []

  // Calcular passed/failed rules por severidade
  const failedByImpact: SeverityBreakdown = {
    critical: violationsList.filter(v => v.impact === 'critical').length,
    serious: violationsList.filter(v => v.impact === 'serious').length,
    moderate: violationsList.filter(v => v.impact === 'moderate').length,
    minor: violationsList.filter(v => v.impact === 'minor').length,
  }

  // Estimar passed rules (baseado em ~100 regras axe-core)
  const totalRulesRun = 100
  const totalFailed = failedByImpact.critical + failedByImpact.serious + failedByImpact.moderate + failedByImpact.minor
  const totalPassed = Math.max(0, totalRulesRun - totalFailed)

  const passedByImpact: SeverityBreakdown = {
    critical: Math.round(totalPassed * 0.3),
    serious: Math.round(totalPassed * 0.4),
    moderate: Math.round(totalPassed * 0.2),
    minor: Math.max(0, totalPassed - Math.round(totalPassed * 0.9)),
  }

  const scoreData = calculateAccessibilityScore(passedByImpact, failedByImpact)

  // Calcular issue counts por severidade
  const summary = audit.summary ?? { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 }

  // Categorias
  const categories = getCategoriesSortedByCount(violationsList)

  // Scan logs
  const scanLogEntries = createScanLogEntries(
    new Date(audit.created_at),
    auditPages ?? [],
    brokenPages ?? [],
    scoreData.score
  )

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:underline">
          {tNav('projects')}
        </Link>
        <span>/</span>
        <Link href={`/projects/${project.id}`} className="hover:underline">
          {project.name}
        </Link>
        <span>/</span>
        <span>{t('title')}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('results')}</h2>
          <p className="text-muted-foreground">
            {project.base_url} •{' '}
            {new Date(audit.created_at).toLocaleDateString(locale)}
          </p>
        </div>
        {audit.status === 'COMPLETED' && (
          <ExportButton auditId={auditId} projectId={id} showEmag={audit.include_emag} />
        )}
      </div>

      {/* Status */}
      {isInProgress ? (
        <AuditProgress
          auditId={auditId}
          projectId={id}
          initialStatus={audit.status}
        />
      ) : audit.status === 'FAILED' ? (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950">
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
              <p className="text-red-600 dark:text-red-400 font-medium">
                {tFailed('title')}
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {tFailed('description')}
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href={`/projects/${project.id}`}>{t('backToProject')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : audit.status === 'CANCELLED' ? (
        <Card className="border-gray-200 bg-gray-50 dark:bg-gray-900">
          <CardContent className="py-8">
            <div className="text-center space-y-3">
              <Ban className="w-12 h-12 text-gray-500 mx-auto" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                {tStatus('cancelled')}
              </p>
              <p className="text-sm text-muted-foreground">
                {audit.completed_at && new Date(audit.completed_at).toLocaleString(locale)}
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href={`/projects/${project.id}`}>{t('backToProject')}</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Row 1: Score Card + Issue Summary */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreCard scoreData={scoreData} />
            <IssueSummaryChart
              critical={summary.critical}
              serious={summary.serious}
              moderate={summary.moderate}
              minor={summary.minor}
            />
          </div>

          {/* Row 2: Conformance Summary */}
          <ConformanceTabs
            violations={violationsList}
            wcagLevels={audit.wcag_levels}
            includeEmag={audit.include_emag}
          />

          {/* Row 3: Category Chart */}
          <CategoryChart categories={categories} />

          {/* Paginas Quebradas */}
          {brokenPages && brokenPages.length > 0 && (
            <BrokenPagesCard brokenPages={brokenPages} />
          )}

          {/* Violações Agregadas */}
          <Card>
            <CardHeader>
              <CardTitle>
                {tViolations('title')} ({violations?.length ?? 0} {t('uniqueTypes')})
              </CardTitle>
              <CardDescription>
                {tViolations('groupedByType')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ViolationsFilter
                violations={violations ?? []}
                includeAbnt={audit.include_abnt}
                includeEmag={audit.include_emag}
              />
            </CardContent>
          </Card>

          {/* Scan Logs */}
          <ScanLogs entries={scanLogEntries} />

          {/* Detalhes Técnicos (colapsável) */}
          <AuditDetails
            audit={audit}
            pagesWithViolations={pagesWithViolations ?? 0}
            locale={locale}
            t={t}
            tConfig={tConfig}
            tCommon={tCommon}
          />

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" asChild>
              <Link href={`/projects/${project.id}`}>{t('backToProject')}</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE: Audit Details (colapsável)
// ============================================

function AuditDetails({
  audit,
  pagesWithViolations,
  locale,
  t,
  tConfig,
  tCommon,
}: {
  audit: Audit
  pagesWithViolations: number
  locale: string
  t: (key: string) => string
  tConfig: (key: string) => string
  tCommon: (key: string) => string
}) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">{t('technicalDetails')}</CardTitle>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform [[data-state=open]>&]:rotate-180" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 text-sm pt-0">
            <p>
              <strong>{t('pagesRequested')}:</strong> {audit.total_pages}
            </p>
            <p>
              <strong>{t('pagesAudited')}:</strong> {audit.processed_pages}
              {audit.processed_pages < audit.total_pages && (
                <span className="text-muted-foreground ml-1">
                  ({t('lessAccessiblePages')})
                </span>
              )}
            </p>
            <p>
              <strong>{t('pagesWithViolations')}:</strong> {pagesWithViolations}
            </p>
            {audit.broken_pages_count > 0 && (
              <p className="text-yellow-600">
                <strong>{t('pagesWithProblems')}:</strong> {audit.broken_pages_count}
              </p>
            )}
            {audit.crawl_iterations > 0 && (
              <p>
                <strong>{t('discoveryIterations')}:</strong> {audit.crawl_iterations}
              </p>
            )}
            <p>
              <strong>{tConfig('wcagLevels')}:</strong> {audit.wcag_levels.join(', ')}
            </p>
            <p>
              <strong>{tConfig('includeAbnt')}:</strong>{' '}
              {audit.include_abnt ? tCommon('yes') : tCommon('no')}
            </p>
            <p>
              <strong>{tConfig('includeEmag')}:</strong>{' '}
              {audit.include_emag ? tCommon('yes') : tCommon('no')}
            </p>
            <p>
              <strong>{tConfig('includeCoga')}:</strong>{' '}
              {audit.include_coga ? tCommon('yes') : tCommon('no')}
            </p>
            <p>
              <strong>{tConfig('startedAt')}:</strong>{' '}
              {audit.started_at
                ? new Date(audit.started_at).toLocaleString(locale)
                : '-'}
            </p>
            <p>
              <strong>{tConfig('completedAt')}:</strong>{' '}
              {audit.completed_at
                ? new Date(audit.completed_at).toLocaleString(locale)
                : '-'}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
