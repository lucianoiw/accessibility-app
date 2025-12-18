import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Props) {
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

    // Verificar se pode cancelar (só auditorias em progresso)
    const inProgressStatuses = ['PENDING', 'CRAWLING', 'AUDITING', 'AGGREGATING', 'GENERATING']
    if (!inProgressStatuses.includes(audit.status)) {
      return NextResponse.json(
        { error: 'Apenas auditorias em andamento podem ser canceladas' },
        { status: 400 }
      )
    }

    // Atualizar status para CANCELLED
    const { error: updateError } = await supabase
      .from('audits')
      .update({
        status: 'CANCELLED',
        completed_at: new Date().toISOString(),
        error_message: 'Auditoria cancelada pelo usuário',
      } as never)
      .eq('id', id)

    if (updateError) {
      console.error('[Audit Cancel] Update error:', updateError)
      return NextResponse.json({ error: 'Erro ao cancelar auditoria' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Auditoria cancelada' })
  } catch (error) {
    console.error('[Audit Cancel] Error:', error)
    return NextResponse.json({ error: 'Erro ao cancelar auditoria' }, { status: 500 })
  }
}
