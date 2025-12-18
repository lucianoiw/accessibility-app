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

    // Buscar auditoria
    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, project_id')
      .eq('id', id)
      .single()

    if (error || !audit) {
      return NextResponse.json({ error: 'Auditoria não encontrada' }, { status: 404 })
    }

    const auditData = audit as { id: string; status: string; project_id: string }

    // Verificar ownership via projeto
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', auditData.project_id)
      .single()

    if (!project || (project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se pode cancelar (só auditorias em progresso)
    const inProgressStatuses = ['PENDING', 'CRAWLING', 'AUDITING', 'AGGREGATING', 'GENERATING']
    if (!inProgressStatuses.includes(auditData.status)) {
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
