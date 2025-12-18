import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Link } from '@/i18n/navigation'
import type { Project, Audit } from '@/types'
import { StartAuditButton } from '../start-audit-button'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function ProjectAuditsPage({ params }: Props) {
  const { id, locale } = await params
  const t = await getTranslations('Audit')
  const tSeverity = await getTranslations('Severity')
  const tStatus = await getTranslations('AuditStatus')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('audits')}</h2>
          <p className="text-muted-foreground">
            {project.name}
          </p>
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

      {/* Lista de Auditorias */}
      {audits && audits.length > 0 ? (
        <div className="space-y-3">
          {audits.map((audit) => (
            <Link
              key={audit.id}
              href={`/projects/${project.id}/audits/${audit.id}`}
              className="block"
            >
              <Card className="hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-6">
                    {/* Data e Status */}
                    <div className="w-40 shrink-0">
                      <div className="font-medium">
                        {new Date(audit.created_at).toLocaleDateString(locale, {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(audit.created_at).toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="w-32 shrink-0">
                      <AuditStatusBadge status={audit.status} tStatus={tStatus} />
                    </div>

                    {/* Violações ou status */}
                    {audit.status === 'COMPLETED' && audit.summary ? (
                      <div className="flex items-center gap-4 flex-1">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{audit.summary.total}</div>
                          <div className="text-xs text-muted-foreground">{t('violations')}</div>
                        </div>

                        {/* Breakdown por severidade */}
                        <div className="flex gap-3 text-sm">
                          {audit.summary.critical > 0 && (
                            <span className="text-red-600 font-medium">
                              {audit.summary.critical} {tSeverity('criticalPlural').toLowerCase()}
                            </span>
                          )}
                          {audit.summary.serious > 0 && (
                            <span className="text-orange-600 font-medium">
                              {audit.summary.serious} {tSeverity('seriousPlural').toLowerCase()}
                            </span>
                          )}
                          {audit.summary.moderate > 0 && (
                            <span className="text-yellow-600 font-medium">
                              {audit.summary.moderate} {tSeverity('moderatePlural').toLowerCase()}
                            </span>
                          )}
                          {audit.summary.minor > 0 && (
                            <span className="text-blue-600 font-medium">
                              {audit.summary.minor} {tSeverity('minorPlural').toLowerCase()}
                            </span>
                          )}
                        </div>
                      </div>
                    ) : audit.status === 'CANCELLED' ? (
                      <div className="flex-1" />
                    ) : audit.status === 'FAILED' ? (
                      <div className="flex-1" />
                    ) : (
                      <div className="flex-1 text-muted-foreground text-sm">
                        {tStatus('waitingStart')}
                      </div>
                    )}

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-1.5 text-xs shrink-0">
                      <span className="bg-muted px-2 py-1 rounded">
                        {audit.processed_pages} {t('pages')}
                      </span>
                      <span className="bg-muted px-2 py-1 rounded">
                        WCAG {audit.wcag_levels.join('/')}
                      </span>
                      {audit.include_emag && (
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          eMAG
                        </span>
                      )}
                      {audit.include_abnt && (
                        <span className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                          ABNT
                        </span>
                      )}
                      {audit.include_coga && (
                        <span className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                          COGA
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              {t('noAudits')}
            </p>
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
          </CardContent>
        </Card>
      )}
    </div>
  )
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
