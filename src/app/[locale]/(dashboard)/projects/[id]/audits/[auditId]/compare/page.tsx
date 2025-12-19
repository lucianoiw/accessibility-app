import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, GitCompare, Calendar, CheckCircle2, AlertTriangle, Minus, TrendingUp, TrendingDown } from 'lucide-react'
import { calculateComparison } from '@/lib/audit/comparison'
import { generateComparisonInsights } from '@/lib/audit/insights'
import { calculateHealthScore } from '@/lib/audit/health'
import { DeltaBadge, ComparisonInsights } from '@/components/audit/comparison'
import { cn } from '@/utils'
import type { Audit, AggregatedViolation, ViolationChangeDetail } from '@/types'

interface Props {
  params: Promise<{ id: string; auditId: string; locale: string }>
  searchParams: Promise<{ with?: string }>
}

export default async function ComparisonPage({ params, searchParams }: Props) {
  const { id: projectId, auditId, locale } = await params
  const { with: compareWithId } = await searchParams

  const t = await getTranslations('AuditComparison')
  const tNav = await getTranslations('Navigation')
  const tSeverity = await getTranslations('Severity')

  const supabase = await createClient()

  // Verificar autenticacao
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    notFound()
  }

  // Buscar projeto
  const { data: projectData } = await supabase
    .from('projects')
    .select('id, name, user_id')
    .eq('id', projectId)
    .single()

  const project = projectData as { id: string; name: string; user_id: string } | null

  if (!project || project.user_id !== user.id) {
    notFound()
  }

  // Buscar auditoria atual
  const { data: currentAuditData } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()

  if (!currentAuditData) {
    notFound()
  }

  const currentAudit = currentAuditData as Audit

  // Buscar violacoes da auditoria atual
  const { data: currentViolationsData } = await supabase
    .from('aggregated_violations')
    .select('*')
    .eq('audit_id', auditId)

  const currentViolations = (currentViolationsData || []) as AggregatedViolation[]

  // Buscar auditorias disponiveis para comparacao
  const { data: availableAuditsData } = await supabase
    .from('audits')
    .select('id, created_at, summary, health_score')
    .eq('project_id', projectId)
    .eq('status', 'COMPLETED')
    .neq('id', auditId)
    .order('created_at', { ascending: false })
    .limit(20)

  const availableAudits = (availableAuditsData || []) as Array<{
    id: string
    created_at: string
    summary: Audit['summary']
    health_score: number | null
  }>

  // Determinar auditoria para comparar
  const previousAuditId = compareWithId || currentAudit.previous_audit_id || availableAudits[0]?.id

  if (!previousAuditId) {
    // Primeira auditoria, sem comparacao
    return (
      <div className="space-y-6">
        <Breadcrumb projectId={projectId} projectName={project.name} auditId={auditId} tNav={tNav} t={t} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              {t('title')}
            </CardTitle>
            <CardDescription>{t('noComparison')}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  // Buscar auditoria anterior
  const { data: previousAuditData } = await supabase
    .from('audits')
    .select('*')
    .eq('id', previousAuditId)
    .single()

  if (!previousAuditData) {
    notFound()
  }

  const previousAudit = previousAuditData as Audit

  // Buscar violacoes da auditoria anterior
  const { data: previousViolationsData } = await supabase
    .from('aggregated_violations')
    .select('*')
    .eq('audit_id', previousAuditId)

  const previousViolations = (previousViolationsData || []) as AggregatedViolation[]

  // Calcular comparacao
  const comparison = calculateComparison(
    currentAudit,
    currentViolations,
    previousAudit,
    previousViolations
  )

  // Gerar insights
  const insights = generateComparisonInsights({
    delta: comparison.delta,
    violations: comparison.violations,
    currentSummary: currentAudit.summary,
  })

  // Formatar datas
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const currentHealthScore = currentAudit.health_score ?? calculateHealthScore(currentAudit)
  const previousHealthScore = previousAudit.health_score ?? calculateHealthScore(previousAudit)

  return (
    <div className="space-y-6">
      <Breadcrumb projectId={projectId} projectName={project.name} auditId={auditId} tNav={tNav} t={t} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('comparingWith')} {formatDate(previousAudit.created_at)}
          </p>
        </div>
        <Link href={`/projects/${projectId}/audits/${auditId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {tNav('results')}
          </Button>
        </Link>
      </div>

      {/* Score Comparison */}
      <div className="grid md:grid-cols-2 gap-6">
        <AuditSummaryCard
          title={t('currentAudit')}
          date={formatDate(currentAudit.created_at)}
          healthScore={currentHealthScore}
          summary={currentAudit.summary}
          tSeverity={tSeverity}
        />
        <AuditSummaryCard
          title={t('previousAudit')}
          date={formatDate(previousAudit.created_at)}
          healthScore={previousHealthScore}
          summary={previousAudit.summary}
          tSeverity={tSeverity}
        />
      </div>

      {/* Delta Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('summary.violations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <DeltaItem label={tSeverity('critical')} value={comparison.delta.critical} type="violations" />
            <DeltaItem label={tSeverity('serious')} value={comparison.delta.serious} type="violations" />
            <DeltaItem label={tSeverity('moderate')} value={comparison.delta.moderate} type="violations" />
            <DeltaItem label={tSeverity('minor')} value={comparison.delta.minor} type="violations" />
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      {insights.length > 0 && (
        <ComparisonInsights insights={insights} />
      )}

      {/* Violation Changes Tabs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{t('summary.violations')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="fixed" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="fixed" className="text-green-600">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                {comparison.violations.fixed.length}
              </TabsTrigger>
              <TabsTrigger value="new" className="text-red-600">
                <AlertTriangle className="h-4 w-4 mr-1" />
                {comparison.violations.new.length}
              </TabsTrigger>
              <TabsTrigger value="persistent">
                <Minus className="h-4 w-4 mr-1" />
                {comparison.violations.persistent.length}
              </TabsTrigger>
              <TabsTrigger value="improved" className="text-blue-600">
                <TrendingDown className="h-4 w-4 mr-1" />
                {comparison.violations.improved.length}
              </TabsTrigger>
              <TabsTrigger value="worsened" className="text-orange-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                {comparison.violations.worsened.length}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="fixed" className="mt-4">
              <ViolationList
                violations={comparison.violations.fixed}
                type="fixed"
                tSeverity={tSeverity}
                t={t}
              />
            </TabsContent>

            <TabsContent value="new" className="mt-4">
              <ViolationList
                violations={comparison.violations.new}
                type="new"
                tSeverity={tSeverity}
                t={t}
              />
            </TabsContent>

            <TabsContent value="persistent" className="mt-4">
              <ViolationList
                violations={comparison.violations.persistent}
                type="persistent"
                tSeverity={tSeverity}
                t={t}
              />
            </TabsContent>

            <TabsContent value="improved" className="mt-4">
              <ViolationList
                violations={comparison.violations.improved}
                type="improved"
                tSeverity={tSeverity}
                t={t}
              />
            </TabsContent>

            <TabsContent value="worsened" className="mt-4">
              <ViolationList
                violations={comparison.violations.worsened}
                type="worsened"
                tSeverity={tSeverity}
                t={t}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selector for different audit */}
      {availableAudits.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('compareWith')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableAudits.map((audit) => (
                <Link
                  key={audit.id}
                  href={`/projects/${projectId}/audits/${auditId}/compare?with=${audit.id}`}
                >
                  <Button
                    variant={audit.id === previousAuditId ? 'default' : 'outline'}
                    size="sm"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    {new Date(audit.created_at).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Componentes auxiliares
function Breadcrumb({
  projectId,
  projectName,
  auditId,
  tNav,
  t,
}: {
  projectId: string
  projectName: string
  auditId: string
  tNav: ReturnType<typeof getTranslations> extends Promise<infer T> ? T : never
  t: ReturnType<typeof getTranslations> extends Promise<infer T> ? T : never
}) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Link href="/projects" className="hover:underline">
        {tNav('projects')}
      </Link>
      <span>/</span>
      <Link href={`/projects/${projectId}`} className="hover:underline">
        {projectName}
      </Link>
      <span>/</span>
      <Link href={`/projects/${projectId}/audits/${auditId}`} className="hover:underline">
        {tNav('results')}
      </Link>
      <span>/</span>
      <span>{t('title')}</span>
    </div>
  )
}

function AuditSummaryCard({
  title,
  date,
  healthScore,
  summary,
  tSeverity,
}: {
  title: string
  date: string
  healthScore: number
  summary: Audit['summary']
  tSeverity: ReturnType<typeof getTranslations> extends Promise<infer T> ? T : never
}) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {date}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className={cn('text-4xl font-bold', getScoreColor(healthScore))}>
            {healthScore}%
          </div>
          <div className="text-right text-sm space-y-1">
            <div><span className="text-red-600 font-medium">{summary?.critical ?? 0}</span> {tSeverity('critical')}</div>
            <div><span className="text-orange-600 font-medium">{summary?.serious ?? 0}</span> {tSeverity('serious')}</div>
            <div><span className="text-yellow-600 font-medium">{summary?.moderate ?? 0}</span> {tSeverity('moderate')}</div>
            <div><span className="text-gray-600 font-medium">{summary?.minor ?? 0}</span> {tSeverity('minor')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DeltaItem({
  label,
  value,
  type,
}: {
  label: string
  value: number
  type: 'violations' | 'score'
}) {
  return (
    <div className="text-center p-4 rounded-lg border">
      <div className="text-sm text-muted-foreground mb-1">{label}</div>
      <DeltaBadge value={value} type={type} size="lg" />
    </div>
  )
}

function ViolationList({
  violations,
  type,
  tSeverity,
  t,
}: {
  violations: ViolationChangeDetail[]
  type: 'new' | 'fixed' | 'persistent' | 'worsened' | 'improved'
  tSeverity: ReturnType<typeof getTranslations> extends Promise<infer T> ? T : never
  t: ReturnType<typeof getTranslations> extends Promise<infer T> ? T : never
}) {
  if (violations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('delta.noChange')}
      </div>
    )
  }

  const getImpactColor = (impact: string | undefined) => {
    switch (impact) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'serious': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'moderate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'minor': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-2">
      {violations.map((v, idx) => {
        const impact = v.current?.impact || v.previous?.impact
        const occurrences = v.current?.occurrences ?? v.previous?.occurrences ?? 0
        const pageCount = v.current?.pageCount ?? v.previous?.pageCount ?? 0
        const delta = v.delta?.occurrences ?? 0

        return (
          <div
            key={`${v.ruleId}-${idx}`}
            className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <span className={cn('px-2 py-0.5 text-xs rounded-full', getImpactColor(impact))}>
                {impact && tSeverity(impact as 'critical' | 'serious' | 'moderate' | 'minor')}
              </span>
              <div>
                <div className="font-medium">{v.ruleId}</div>
                <div className="text-sm text-muted-foreground">
                  {occurrences} {occurrences === 1 ? 'ocorrencia' : 'ocorrencias'} em {pageCount} {pageCount === 1 ? 'pagina' : 'paginas'}
                </div>
              </div>
            </div>
            {delta !== 0 && (
              <DeltaBadge value={delta} type="violations" size="sm" />
            )}
          </div>
        )
      })}
    </div>
  )
}
