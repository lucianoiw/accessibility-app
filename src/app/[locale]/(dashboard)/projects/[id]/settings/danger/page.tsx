import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'
import { DangerZoneForm } from './danger-zone-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDangerZonePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single() as { data: Project | null }

  if (!project) {
    notFound()
  }

  // Buscar contagem de auditorias
  const { count: auditCount } = await supabase
    .from('audits')
    .select('*', { count: 'exact', head: true })
    .eq('project_id', id)

  return <DangerZoneForm project={project} auditCount={auditCount || 0} />
}
