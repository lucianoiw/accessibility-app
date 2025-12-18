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

    // Buscar auditoria com info do projeto
    const { data: audit, error } = await supabase
      .from('audits')
      .select(`
        id,
        status,
        processed_pages,
        total_pages,
        broken_pages_count,
        crawl_iterations,
        error_message,
        created_at,
        started_at,
        completed_at,
        projects!inner(user_id)
      `)
      .eq('id', id)
      .single()

    if (error || !audit) {
      return NextResponse.json({ error: 'Auditoria não encontrada' }, { status: 404 })
    }

    // Verificar ownership
    const project = audit.projects as { user_id: string }
    if (project.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar contagem de páginas auditadas
    const { count: pagesAudited } = await supabase
      .from('audit_pages')
      .select('*', { count: 'exact', head: true })
      .eq('audit_id', id)

    // Retornar status
    return NextResponse.json({
      id: audit.id,
      status: audit.status,
      processedPages: audit.processed_pages,
      totalPages: audit.total_pages,
      pagesAudited: pagesAudited || 0,
      brokenPagesCount: audit.broken_pages_count,
      crawlIterations: audit.crawl_iterations,
      errorMessage: audit.error_message,
      createdAt: audit.created_at,
      startedAt: audit.started_at,
      completedAt: audit.completed_at,
    })
  } catch (error) {
    console.error('[Audit Status] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar status' }, { status: 500 })
  }
}
