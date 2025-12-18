import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

// Página raiz - redireciona baseado no estado de auth
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/projects')
  } else {
    redirect('/login')
  }
}
