import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateComparison } from '@/lib/audit/comparison'
import { generateComparisonInsights, generateFirstAuditInsight } from '@/lib/audit/insights'
import { calculateHealthScore } from '@/lib/audit/health'
import type {
  Audit,
  AggregatedViolation,
  ComparisonResponse,
  AuditComparisonSummary,
  AvailableAuditForComparison,
} from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const compareWithId = searchParams.get('with')

    const supabase = await createClient()

    // Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    // Buscar auditoria atual
    const { data: currentAudit, error: auditError } = await supabase
      .from('audits')
      .select('*')
      .eq('id', id)
      .single()

    if (auditError || !currentAudit) {
      console.error('[Audit Comparison] Audit not found:', { id, error: auditError })
      return NextResponse.json({ error: 'Auditoria nao encontrada' }, { status: 404 })
    }

    const audit = currentAudit as Audit

    // Verificar ownership via projeto
    const { data: project } = await supabase
      .from('projects')
      .select('user_id')
      .eq('id', audit.project_id)
      .single()

    if (!project || (project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar violacoes da auditoria atual
    const { data: currentViolations } = await supabase
      .from('aggregated_violations')
      .select('*')
      .eq('audit_id', id)

    const violations = (currentViolations || []) as AggregatedViolation[]

    // Buscar auditorias disponiveis para comparacao (excluindo a atual)
    const { data: availableAudits } = await supabase
      .from('audits')
      .select('id, created_at, summary, health_score')
      .eq('project_id', audit.project_id)
      .eq('status', 'COMPLETED')
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(20)

    const available: AvailableAuditForComparison[] = ((availableAudits || []) as Array<{
      id: string
      created_at: string
      summary: Audit['summary']
      health_score: number | null
    }>).map((a) => ({
      id: a.id,
      createdAt: a.created_at,
      summary: a.summary,
      healthScore: a.health_score,
    }))

    // Determinar qual auditoria usar para comparacao
    let previousAuditId = compareWithId || audit.previous_audit_id

    // Se nao tiver previous_audit_id e nao foi especificado, usar a mais recente
    if (!previousAuditId && available.length > 0) {
      previousAuditId = available[0].id
    }

    // Construir resposta da auditoria atual
    // NOTA: Para auditorias antigas sem health_score, recalculamos usando a fórmula atual
    // Isso garante consistência nas comparações (mesma fórmula para ambas as auditorias)
    const currentSummary: AuditComparisonSummary = {
      id: audit.id,
      createdAt: audit.created_at,
      completedAt: audit.completed_at,
      healthScore: audit.health_score ?? calculateHealthScore(audit),
      summary: audit.summary,
      pagesAudited: audit.processed_pages,
      brokenPagesCount: audit.broken_pages_count,
    }

    // Se nao ha auditoria anterior, retornar apenas a atual
    if (!previousAuditId) {
      const response: ComparisonResponse = {
        current: currentSummary,
        previous: null,
        delta: {
          healthScore: 0,
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
          total: 0,
          pagesAudited: 0,
          brokenPages: 0,
        },
        violations: {
          new: [],
          fixed: [],
          persistent: [],
          worsened: [],
          improved: [],
        },
        availableAudits: available,
      }

      return NextResponse.json(response)
    }

    // Buscar auditoria anterior
    const { data: previousAuditData, error: prevError } = await supabase
      .from('audits')
      .select('*')
      .eq('id', previousAuditId)
      .single()

    if (prevError || !previousAuditData) {
      // Auditoria anterior nao encontrada, retornar sem comparacao
      const response: ComparisonResponse = {
        current: currentSummary,
        previous: null,
        delta: {
          healthScore: 0,
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
          total: 0,
          pagesAudited: 0,
          brokenPages: 0,
        },
        violations: {
          new: [],
          fixed: [],
          persistent: [],
          worsened: [],
          improved: [],
        },
        availableAudits: available,
      }

      return NextResponse.json(response)
    }

    const previousAudit = previousAuditData as Audit

    // Buscar violacoes da auditoria anterior
    const { data: previousViolationsData } = await supabase
      .from('aggregated_violations')
      .select('*')
      .eq('audit_id', previousAuditId)

    const previousViolations = (previousViolationsData || []) as AggregatedViolation[]

    // Calcular comparacao
    const comparison = calculateComparison(
      audit,
      violations,
      previousAudit,
      previousViolations
    )

    // Construir resposta da auditoria anterior
    // NOTA: Mesmo tratamento de fallback para garantir comparação justa
    const previousSummary: AuditComparisonSummary = {
      id: previousAudit.id,
      createdAt: previousAudit.created_at,
      completedAt: previousAudit.completed_at,
      healthScore: previousAudit.health_score ?? calculateHealthScore(previousAudit),
      summary: previousAudit.summary,
      pagesAudited: previousAudit.processed_pages,
      brokenPagesCount: previousAudit.broken_pages_count,
    }

    // Gerar insights
    const insights = generateComparisonInsights({
      delta: comparison.delta,
      violations: comparison.violations,
      currentSummary: audit.summary,
    })

    const response: ComparisonResponse = {
      current: currentSummary,
      previous: previousSummary,
      delta: comparison.delta,
      violations: comparison.violations,
      availableAudits: available,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Audit Comparison] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar comparacao' }, { status: 500 })
  }
}
