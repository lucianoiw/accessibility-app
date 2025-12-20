import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, Play, CheckCircle2, Clock, AlertCircle, SkipForward } from 'lucide-react'
import { IGTList } from './igt-list'

interface Props {
  params: Promise<{
    locale: string
    id: string
    auditId: string
  }>
}

export default async function IGTPage({ params }: Props) {
  const { id: projectId, auditId } = await params
  const t = await getTranslations('IGT')

  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  // Get audit with project
  const { data: audit, error } = await supabase
    .from('audits')
    .select(`
      *,
      projects!inner(id, name, url, user_id)
    `)
    .eq('id', auditId)
    .single() as {
      data: {
        id: string
        include_emag: boolean
        include_coga: boolean
        audited_pages: string[] | null
        projects: { id: string; name: string; url: string; user_id: string }
      } | null
      error: unknown
    }

  if (error || !audit) {
    notFound()
  }

  // Verify ownership
  if (audit.projects.user_id !== user.id) {
    notFound()
  }

  // Get existing IGT sessions for this audit
  // Note: Using 'as any' because igt_sessions table is not yet in generated Supabase types
  // Run 'supabase gen types typescript' after applying migration 00019
  interface IGTSessionRow {
    id: string
    igt_id: string
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped'
    current_candidate_index: number
    total_candidates: number
    results: Array<{ result: string }>
    completed_at: string | null
  }
  const { data: sessions } = await (supabase.from('igt_sessions') as any)
    .select('*')
    .eq('audit_id', auditId) as { data: IGTSessionRow[] | null }

  // Get violations for context
  const { data: violations } = await supabase
    .from('aggregated_violations')
    .select('id, rule_id, fingerprint, selector, help, affected_pages, unique_elements')
    .eq('audit_id', auditId) as {
      data: Array<{
        id: string
        rule_id: string
        fingerprint: string
        selector: string
        help: string
        affected_pages: string[]
        unique_elements: unknown[]
      }> | null
    }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href={`/projects/${projectId}/audits/${auditId}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('backToAudit')}
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.available')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.completed')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {sessions?.filter(s => s.status === 'completed').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.inProgress')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {sessions?.filter(s => s.status === 'in_progress').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t('stats.issuesFound')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {sessions?.reduce((acc, s) => acc + (s.results as Array<{ result: string }>)?.filter(r => r.result === 'fail').length || 0, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* IGT List */}
      <Suspense fallback={<div className="animate-pulse bg-muted h-64 rounded-lg" />}>
        <IGTList
          auditId={auditId}
          projectId={projectId}
          baseUrl={audit.projects.url}
          violations={violations || []}
          sessions={sessions || []}
          pages={(audit.audited_pages as string[]) || []}
          includeEmag={audit.include_emag || false}
          includeCoga={audit.include_coga || false}
        />
      </Suspense>
    </div>
  )
}
