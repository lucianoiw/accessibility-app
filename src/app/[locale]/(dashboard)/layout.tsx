import { PropsWithChildren } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader, type ProjectForSwitcher } from '@/components/layout'
import type { Profile } from '@/types/database'

export default async function DashboardLayout({ children }: PropsWithChildren) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Buscar perfil do usuário
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  // Buscar projetos do usuário para o switcher
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, base_url')
    .order('updated_at', { ascending: false })
    .limit(10) as { data: ProjectForSwitcher[] | null }

  const userData = {
    email: user.email ?? '',
    name: profile?.name,
    avatar_url: profile?.avatar_url,
    plan: profile?.plan,
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        user={userData}
        projects={projects || []}
      />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
