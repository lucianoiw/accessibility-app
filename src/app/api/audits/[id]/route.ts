import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCsrfValid } from '@/lib/csrf'
import { runs } from '@trigger.dev/sdk/v3'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * DELETE /api/audits/[id]
 * Exclui uma auditoria e todos os dados relacionados
 */
export async function DELETE(_request: Request, { params }: Props) {
  try {
    // Validar CSRF
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const { id } = await params
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar auditoria
    const { data: audit, error } = await supabase
      .from('audits')
      .select('id, status, project_id, trigger_run_id')
      .eq('id', id)
      .single()

    if (error || !audit) {
      return NextResponse.json({ error: 'Auditoria não encontrada' }, { status: 404 })
    }

    const auditData = audit as {
      id: string
      status: string
      project_id: string
      trigger_run_id: string | null
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

    // Se a auditoria está em andamento, cancelar o run no Trigger.dev primeiro
    const inProgressStatuses = ['PENDING', 'CRAWLING', 'AUDITING', 'AGGREGATING', 'GENERATING']
    if (inProgressStatuses.includes(auditData.status) && auditData.trigger_run_id) {
      try {
        await runs.cancel(auditData.trigger_run_id)
        console.log('[Audit Delete] Trigger.dev run cancelled:', auditData.trigger_run_id)
      } catch (triggerError) {
        // Log mas não falha - o run pode já ter terminado
        console.warn('[Audit Delete] Failed to cancel Trigger.dev run:', triggerError)
      }
    }

    // Usar admin client (bypassa RLS, já verificamos ownership)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminClient = createAdminClient() as any

    // Limpar referências de previous_audit_id em outras auditorias
    // (para não violar FK constraint)
    const { error: updateError } = await adminClient
      .from('audits')
      .update({ previous_audit_id: null })
      .eq('previous_audit_id', id)

    if (updateError) {
      console.error('[Audit Delete] Error clearing previous_audit_id references:', updateError)
      return NextResponse.json({ error: 'Erro ao excluir auditoria' }, { status: 500 })
    }

    // Excluir a auditoria (CASCADE deleta violations, audit_pages, broken_pages, etc.)
    const { error: deleteError } = await adminClient.from('audits').delete().eq('id', id)

    if (deleteError) {
      console.error('[Audit Delete] Delete error:', deleteError)
      return NextResponse.json({ error: 'Erro ao excluir auditoria' }, { status: 500 })
    }

    console.log('[Audit Delete] Audit deleted successfully:', id)
    return NextResponse.json({ success: true, message: 'Auditoria excluída' })
  } catch (error) {
    console.error('[Audit Delete] Error:', error)
    return NextResponse.json({ error: 'Erro ao excluir auditoria' }, { status: 500 })
  }
}
