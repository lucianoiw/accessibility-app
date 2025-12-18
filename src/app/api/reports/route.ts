import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { tasks } from '@trigger.dev/sdk/v3'
import type { generateReportTask } from '@/trigger/report'
import type { ReportType, Report } from '@/types'
import { requireCsrfValid } from '@/lib/csrf'
import { z } from 'zod'
import { validateInput } from '@/lib/validations'

const GenerateReportSchema = z.object({
  auditId: z.string().uuid('auditId deve ser UUID válido'),
  type: z.enum(['executive_pdf', 'technical_pdf', 'csv', 'json']),
})

/**
 * POST /api/reports
 * Inicia a geracao de um relatorio
 */
export async function POST(request: Request) {
  try {
    // 1. Validar CSRF
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const supabase = await createClient()

    // 2. Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    // 3. Parse e validar entrada com Zod
    let body
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    const validation = validateInput(GenerateReportSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const { auditId, type } = validation.data

    // Verificar se auditoria existe e pertence ao usuario
    const { data: audit, error: auditError } = (await supabase
      .from('audits')
      .select('id, project_id, status, projects!inner(name, user_id)')
      .eq('id', auditId)
      .single()) as {
      data: { id: string; project_id: string; status: string; projects: { name: string; user_id: string } } | null
      error: Error | null
    }

    if (auditError || !audit) {
      return NextResponse.json({ error: 'Auditoria nao encontrada' }, { status: 404 })
    }

    const projectData = audit.projects

    if (projectData.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Verificar se auditoria esta completa
    if (audit.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Auditoria ainda nao foi concluida' },
        { status: 400 }
      )
    }

    // Verificar se ja existe um relatorio em geracao para esta auditoria/tipo
    const { data: existingReport } = (await supabase
      .from('reports')
      .select('id, status')
      .eq('audit_id', auditId)
      .eq('type', type)
      .in('status', ['pending', 'generating'])
      .single()) as { data: { id: string; status: string } | null }

    if (existingReport) {
      return NextResponse.json({
        reportId: existingReport.id,
        status: existingReport.status,
        message: 'Relatorio ja esta sendo gerado',
      })
    }

    // Criar registro do relatorio
    const { data: report, error: insertError } = await supabase
      .from('reports')
      .insert({
        audit_id: auditId,
        type,
        status: 'pending',
      } as never)
      .select()
      .single()

    if (insertError || !report) {
      console.error('Erro ao criar relatorio:', insertError)
      return NextResponse.json(
        { error: 'Erro ao criar relatorio' },
        { status: 500 }
      )
    }

    const typedReport = report as Report

    // Disparar task do Trigger.dev
    await tasks.trigger<typeof generateReportTask>('generate-report', {
      reportId: typedReport.id,
      auditId,
      type,
      projectName: projectData.name,
    })

    return NextResponse.json({
      reportId: typedReport.id,
      status: 'pending',
      message: 'Geracao de relatorio iniciada',
    })
  } catch (error) {
    console.error('Erro ao iniciar geracao de relatorio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reports?auditId=xxx
 * Lista relatorios de uma auditoria
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    // Obter auditId da query
    const { searchParams } = new URL(request.url)
    const auditId = searchParams.get('auditId')

    if (!auditId) {
      return NextResponse.json(
        { error: 'auditId e obrigatorio' },
        { status: 400 }
      )
    }

    // Verificar se auditoria pertence ao usuario
    const { data: audit, error: auditError } = (await supabase
      .from('audits')
      .select('id, projects!inner(user_id)')
      .eq('id', auditId)
      .single()) as {
      data: { id: string; projects: { user_id: string } } | null
      error: Error | null
    }

    if (auditError || !audit) {
      return NextResponse.json({ error: 'Auditoria nao encontrada' }, { status: 404 })
    }

    if (audit.projects.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar relatorios
    const { data: reports, error: reportsError } = await supabase
      .from('reports')
      .select('*')
      .eq('audit_id', auditId)
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('Erro ao buscar relatorios:', reportsError)
      return NextResponse.json(
        { error: 'Erro ao buscar relatorios' },
        { status: 500 }
      )
    }

    return NextResponse.json({ reports: reports || [] })
  } catch (error) {
    console.error('Erro ao listar relatorios:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
