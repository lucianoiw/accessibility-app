import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Project } from '@/types'
import { AuthSettingsForm } from './auth-settings-form'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectAuthSettingsPage({ params }: Props) {
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

  return <AuthSettingsForm project={project} />
}
