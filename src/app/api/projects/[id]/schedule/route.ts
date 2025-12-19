import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCsrfValid } from '@/lib/csrf'
import { ScheduleConfigSchema, validateInput } from '@/lib/validations'
import type { Project } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * GET /api/projects/[id]/schedule
 * Retorna a configuração de agendamento do projeto
 */
export async function GET(request: Request, { params }: Props) {
  try {
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

    // Buscar projeto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(
        'id, schedule_enabled, schedule_frequency, schedule_day_of_week, schedule_day_of_month, schedule_hour, schedule_timezone, last_scheduled_audit_at, next_scheduled_audit_at, user_id'
      )
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Verificar ownership
    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Remover user_id da resposta
    const { user_id: _, ...scheduleConfig } = project as Project & { user_id: string }

    return NextResponse.json(scheduleConfig)
  } catch (error) {
    console.error('[Schedule GET] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar configuração de agendamento' }, { status: 500 })
  }
}

/**
 * PUT /api/projects/[id]/schedule
 * Atualiza a configuração de agendamento do projeto
 */
export async function PUT(request: Request, { params }: Props) {
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

    // Buscar projeto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Verificar ownership
    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Validar body
    const body = await request.json()
    const validation = validateInput(ScheduleConfigSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      )
    }

    const {
      schedule_enabled,
      schedule_frequency,
      schedule_day_of_week,
      schedule_day_of_month,
      schedule_hour,
      schedule_timezone,
    } = validation.data

    // Atualizar configuração de agendamento
    // O trigger do banco vai calcular next_scheduled_audit_at automaticamente
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updated, error: updateError } = await (supabase as any)
      .from('projects')
      .update({
        schedule_enabled,
        schedule_frequency,
        schedule_day_of_week,
        schedule_day_of_month,
        schedule_hour,
        schedule_timezone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select(
        'id, schedule_enabled, schedule_frequency, schedule_day_of_week, schedule_day_of_month, schedule_hour, schedule_timezone, last_scheduled_audit_at, next_scheduled_audit_at'
      )
      .single()

    if (updateError) {
      console.error('[Schedule PUT] Update error:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 })
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[Schedule PUT] Error:', error)
    return NextResponse.json({ error: 'Erro ao atualizar configuração de agendamento' }, { status: 500 })
  }
}

/**
 * DELETE /api/projects/[id]/schedule
 * Desativa o agendamento do projeto
 */
export async function DELETE(request: Request, { params }: Props) {
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

    // Buscar projeto
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Verificar ownership
    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Desativar agendamento
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('projects')
      .update({
        schedule_enabled: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('[Schedule DELETE] Update error:', updateError)
      return NextResponse.json({ error: 'Erro ao desativar agendamento' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Schedule DELETE] Error:', error)
    return NextResponse.json({ error: 'Erro ao desativar agendamento' }, { status: 500 })
  }
}
