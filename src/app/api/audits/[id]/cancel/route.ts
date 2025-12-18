import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runs } from '@trigger.dev/sdk/v3'

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

    // Buscar auditoria com trigger_run_id
    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, project_id, trigger_run_id')
      .eq('id', id)
      .single()

    if (error || !audit) {
      return NextResponse.json({ error: 'Auditoria não encontrada' }, { status: 404 })
    }

    const auditData = audit as { id: string; status: string; project_id: string; trigger_run_id: string | null }

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

    // Cancelar o run no Trigger.dev (se tiver o ID)
    if (auditData.trigger_run_id) {
      try {
        await runs.cancel(auditData.trigger_run_id)
        console.log('[Audit Cancel] Trigger.dev run cancelled:', auditData.trigger_run_id)
      } catch (triggerError) {
        // Log mas não falha - o run pode já ter terminado
        console.warn('[Audit Cancel] Failed to cancel Trigger.dev run:', triggerError)
      }
    }

    // Atualizar status para CANCELLED
    const { error: updateError } = await supabase
      .from('audits')
      .update({
        status: 'CANCELLED',
        completed_at: new Date().toISOString(),
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
