import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { IGTRunner } from './igt-runner'

interface Props {
  params: Promise<{
    locale: string
    id: string
    auditId: string
    igtId: string
  }>
}

export default async function IGTRunnerPage({ params }: Props) {
  const { id: projectId, auditId, igtId } = await params
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

  // Get existing session for this IGT
  // Note: Using 'as any' because igt_sessions table is not yet in generated Supabase types
  // Run 'supabase gen types typescript' after applying migration 00019
  const { data: session } = await (supabase.from('igt_sessions') as any)
    .select('*')
    .eq('audit_id', auditId)
    .eq('igt_id', igtId)
    .single()

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
      <div className="flex items-center gap-2">
        <Link href={`/projects/${projectId}/audits/${auditId}/igt`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('backToList')}
          </Button>
        </Link>
      </div>

      {/* Runner */}
      <IGTRunner
        igtId={igtId}
        auditId={auditId}
        projectId={projectId}
        userId={user.id}
        baseUrl={audit.projects.url}
        existingSession={session}
        violations={violations?.map(v => ({
          id: v.id,
          ruleId: v.rule_id,
          selector: v.selector,
          html: (v.unique_elements as Array<{ html: string }>)?.[0]?.html || '',
          pageUrl: v.affected_pages?.[0] || '',
          confidenceLevel: undefined,
        })) || []}
        pages={(audit.audited_pages as string[])?.map(url => ({ url, title: url })) || []}
        includeEmag={audit.include_emag || false}
        includeCoga={audit.include_coga || false}
      />
    </div>
  )
}
