import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar auditoria
    const { data: audit, error } = await supabase
      .from('audits')
      .select(`
        id,
        status,
        project_id,
        processed_pages,
        total_pages,
        broken_pages_count,
        crawl_iterations,
        created_at,
        started_at,
        completed_at
      `)
      .eq('id', id)
      .single()

    if (error || !audit) {
      console.error('[Audit Status] Audit not found:', { id, error })
      return NextResponse.json({ error: 'Auditoria não encontrada' }, { status: 404 })
    }

    const auditData = audit as {
      id: string
      status: string
      project_id: string
      processed_pages: number
      total_pages: number
      broken_pages_count: number
      crawl_iterations: number
      created_at: string
      started_at: string | null
      completed_at: string | null
    }

    // Verificar ownership via projeto
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', auditData.project_id)
      .single()

    if (!project || (project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar contagem de páginas auditadas
    const { count: pagesAudited } = await supabase
      .from('audit_pages')
      .select('*', { count: 'exact', head: true })
      .eq('audit_id', id)

    // Retornar status
    return NextResponse.json({
      id: auditData.id,
      status: auditData.status,
      processedPages: auditData.processed_pages,
      totalPages: auditData.total_pages,
      pagesAudited: pagesAudited || 0,
      brokenPagesCount: auditData.broken_pages_count,
      crawlIterations: auditData.crawl_iterations,
      createdAt: auditData.created_at,
      startedAt: auditData.started_at,
      completedAt: auditData.completed_at,
    })
  } catch (error) {
    console.error('[Audit Status] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar status' }, { status: 500 })
  }
}
