import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import type { Project, Audit } from '@/types'
import { StartAuditButton } from './start-audit-button'
import {
  Activity,
  AlertTriangle,
  Calendar,
  ChevronRight,
  FileSearch,
  TrendingUp,
} from 'lucide-react'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function ProjectDashboardPage({ params }: Props) {
  const { id, locale } = await params
  const t = await getTranslations('ProjectInfo')
  const tAudit = await getTranslations('Audit')
  const tSeverity = await getTranslations('Severity')
  const tStatus = await getTranslations('AuditStatus')
  const tAuth = await getTranslations('Authentication')
  const tSubdomain = await getTranslations('SubdomainPolicy')
  const tStandards = await getTranslations('Standards')
  const tCommon = await getTranslations('Common')
  const supabase = await createClient()

  // Buscar projeto
  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single() as { data: Project | null }

  if (!project) {
    notFound()
  }

  // Buscar auditorias do projeto
  const { data: audits } = await supabase
    .from('audits')
    .select('*')
    .eq('project_id', id)
    .order('created_at', { ascending: false }) as { data: Audit[] | null }

  const totalAudits = audits?.length || 0
  const completedAudits = audits?.filter(a => a.status === 'COMPLETED') || []
  const lastAudit = completedAudits[0]
  const recentAudits = audits?.slice(0, 5) || []

  // Calcular estatisticas
  const stats = calculateStats(completedAudits)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <p className="text-muted-foreground">{project.base_url}</p>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <StartAuditButton
          projectId={project.id}
          discoveryMethod={project.discovery_method}
          discoveryConfig={project.discovery_config}
          defaults={{
            wcagLevels: project.default_wcag_levels,
            maxPages: project.default_max_pages,
            includeAbnt: project.default_include_abnt,
            includeEmag: project.default_include_emag,
            includeCoga: project.default_include_coga,
          }}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('totalAudits')}</CardTitle>
            <FileSearch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAudits}</div>
            <p className="text-xs text-muted-foreground">
              {completedAudits.length} {t('completed')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('lastAudit')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastAudit
                ? new Date(lastAudit.created_at).toLocaleDateString(locale, {
                    day: '2-digit',
                    month: 'short',
                  })
                : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastAudit
                ? `${lastAudit.processed_pages} ${t('pagesAudited')}`
                : t('noAudit')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('currentViolations')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastAudit?.summary?.total || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {lastAudit?.summary?.critical || 0} {t('critical')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('trend')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.trend > 0 ? '+' : ''}{stats.trend}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.trend <= 0 ? t('improving') : t('worsening')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ultima Auditoria - Resumo */}
      {lastAudit && lastAudit.summary && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {tAudit('lastAuditSummary')}
              </CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/projects/${project.id}/audits/${lastAudit.id}`}>
                  {tCommon('viewDetails')}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950">
                <div className="text-3xl font-bold text-red-600">{lastAudit.summary.critical}</div>
                <div className="text-sm text-red-600">{tSeverity('criticalPlural')}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
                <div className="text-3xl font-bold text-orange-600">{lastAudit.summary.serious}</div>
                <div className="text-sm text-orange-600">{tSeverity('seriousPlural')}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                <div className="text-3xl font-bold text-yellow-600">{lastAudit.summary.moderate}</div>
                <div className="text-sm text-yellow-600">{tSeverity('moderatePlural')}</div>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950">
                <div className="text-3xl font-bold text-blue-600">{lastAudit.summary.minor}</div>
                <div className="text-sm text-blue-600">{tSeverity('minorPlural')}</div>
              </div>
            </div>

            {/* Barra de progresso */}
            {lastAudit.summary.total > 0 && (
              <div className="mt-4">
                <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                  {lastAudit.summary.critical > 0 && (
                    <div
                      className="bg-red-500"
                      style={{ width: `${(lastAudit.summary.critical / lastAudit.summary.total) * 100}%` }}
                    />
                  )}
                  {lastAudit.summary.serious > 0 && (
                    <div
                      className="bg-orange-500"
                      style={{ width: `${(lastAudit.summary.serious / lastAudit.summary.total) * 100}%` }}
                    />
                  )}
                  {lastAudit.summary.moderate > 0 && (
                    <div
                      className="bg-yellow-500"
                      style={{ width: `${(lastAudit.summary.moderate / lastAudit.summary.total) * 100}%` }}
                    />
                  )}
                  {lastAudit.summary.minor > 0 && (
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(lastAudit.summary.minor / lastAudit.summary.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-2 mt-4 text-sm text-muted-foreground">
              <span>{lastAudit.processed_pages} {t('pagesAudited')}</span>
              <span>•</span>
              <span>WCAG {lastAudit.wcag_levels.join('/')}</span>
              {lastAudit.include_emag && (
                <>
                  <span>•</span>
                  <span>eMAG 3.1</span>
                </>
              )}
              {lastAudit.include_abnt && (
                <>
                  <span>•</span>
                  <span>ABNT NBR 17060</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auditorias Recentes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{tAudit('recentAudits')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${project.id}/audits`}>
                {tCommon('viewAll')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentAudits.length > 0 ? (
            <div className="space-y-3">
              {recentAudits.map((audit) => (
                <Link
                  key={audit.id}
                  href={`/projects/${project.id}/audits/${audit.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-24">
                      <span className="text-sm font-medium">
                        {new Date(audit.created_at).toLocaleDateString(locale, {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <AuditStatusBadge status={audit.status} tStatus={tStatus} />
                  </div>

                  <div className="flex items-center gap-4">
                    {audit.summary && (
                      <div className="text-right">
                        <span className="font-medium">{audit.summary.total}</span>
                        <span className="text-muted-foreground text-sm ml-1">{tAudit('violations')}</span>
                      </div>
                    )}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="mb-4">{tAudit('noAudits')}</p>
              <StartAuditButton
                projectId={project.id}
                discoveryMethod={project.discovery_method}
                discoveryConfig={project.discovery_config}
                defaults={{
                  wcagLevels: project.default_wcag_levels,
                  maxPages: project.default_max_pages,
                  includeAbnt: project.default_include_abnt,
                  includeEmag: project.default_include_emag,
                  includeCoga: project.default_include_coga,
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info do Projeto */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('title')}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${project.id}/settings`}>
                {tCommon('edit')}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-sm text-muted-foreground">{tCommon('date')}</dt>
              <dd className="font-medium">
                {new Date(project.created_at).toLocaleDateString(locale, {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{tSubdomain('title')}</dt>
              <dd className="font-medium capitalize">
                {project.subdomain_policy === 'main_only'
                  ? tSubdomain('mainOnly')
                  : project.subdomain_policy === 'all_subdomains'
                  ? tSubdomain('allSubdomains')
                  : tSubdomain('specific')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{tAuth('title')}</dt>
              <dd className="font-medium capitalize">
                {project.auth_config?.type === 'bearer'
                  ? tAuth('bearer')
                  : project.auth_config?.type === 'cookie'
                  ? tAuth('cookie')
                  : tAuth('none')}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">{tStandards('enabledStandards')}</dt>
              <dd className="flex gap-2">
                {project.default_include_emag && (
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                    eMAG
                  </span>
                )}
                {project.default_include_abnt && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                    ABNT
                  </span>
                )}
                {project.default_include_coga && (
                  <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                    COGA
                  </span>
                )}
                {!project.default_include_emag && !project.default_include_abnt && !project.default_include_coga && (
                  <span className="text-muted-foreground">{tStandards('none')}</span>
                )}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateStats(audits: Audit[]): { trend: number } {
  if (audits.length < 2) {
    return { trend: 0 }
  }

  const current = audits[0]?.summary?.total || 0
  const previous = audits[1]?.summary?.total || 0

  if (previous === 0) {
    return { trend: 0 }
  }

  const trend = Math.round(((current - previous) / previous) * 100)
  return { trend }
}

function AuditStatusBadge({ status, tStatus }: { status: string; tStatus: (key: string) => string }) {
  const statusConfig: Record<string, { labelKey: string; className: string }> = {
    PENDING: { labelKey: 'pending', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
    CRAWLING: { labelKey: 'crawling', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    AUDITING: { labelKey: 'auditing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    AGGREGATING: { labelKey: 'aggregating', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    GENERATING: { labelKey: 'generating', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' },
    COMPLETED: { labelKey: 'completed', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' },
    FAILED: { labelKey: 'failed', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' },
    CANCELLED: { labelKey: 'cancelled', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  }

  const config = statusConfig[status] || statusConfig.PENDING

  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {tStatus(config.labelKey)}
    </span>
  )
}
