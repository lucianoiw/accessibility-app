import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    // Buscar projeto e verificar ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      console.error('[Project Audits] Project not found:', { id, error: projectError })
      return NextResponse.json({ error: 'Projeto nao encontrado' }, { status: 404 })
    }

    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar auditorias do projeto
    const { data: audits, error: auditsError } = await supabase
      .from('audits')
      .select('*')
      .eq('project_id', id)
      .order('created_at', { ascending: false })

    if (auditsError) {
      console.error('[Project Audits] Error fetching audits:', auditsError)
      return NextResponse.json({ error: 'Erro ao buscar auditorias' }, { status: 500 })
    }

    return NextResponse.json(audits || [])
  } catch (error) {
    console.error('[Project Audits] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar auditorias' }, { status: 500 })
  }
}
