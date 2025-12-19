import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateSeverityPatternSummary } from '@/lib/audit/pattern-grouping'
import type { Audit, AggregatedViolation, AuditSummary } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * POST /api/audits/[id]/recalculate-patterns
 *
 * Recalcula os padrões de uma auditoria existente baseado nas aggregated_violations.
 * Útil para auditorias que foram criadas antes do cálculo de padrões ser implementado.
 */
export async function POST(request: Request, { params }: Props) {
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

    // Buscar auditoria
    const { data: auditData, error: auditError } = await supabase
      .from('audits')
      .select('*, projects!inner(user_id)')
      .eq('id', id)
      .single()

    if (auditError || !auditData) {
      return NextResponse.json({ error: 'Auditoria não encontrada' }, { status: 404 })
    }

    const audit = auditData as Audit & { projects: { user_id: string } }

    // Verificar ownership
    if (audit.projects.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar violações agregadas
    const { data: violations, error: violationsError } = await supabase
      .from('aggregated_violations')
      .select('impact, unique_elements')
      .eq('audit_id', id)

    if (violationsError) {
      return NextResponse.json({ error: 'Erro ao buscar violações' }, { status: 500 })
    }

    const aggregatedViolations = (violations || []) as Pick<AggregatedViolation, 'impact' | 'unique_elements'>[]

    // Calcular padrões usando os unique_elements das violações agregadas
    const patternSummary = calculateSeverityPatternSummary(aggregatedViolations)

    // Construir novo summary com padrões
    const newSummary: AuditSummary = {
      ...(audit.summary || { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 }),
      patterns: {
        critical: patternSummary.critical.patterns,
        serious: patternSummary.serious.patterns,
        moderate: patternSummary.moderate.patterns,
        minor: patternSummary.minor.patterns,
        total: patternSummary.total.patterns,
      },
    }

    // Atualizar no banco
    const { error: updateError } = await supabase
      .from('audits')
      .update({ summary: newSummary } as never)
      .eq('id', id)

    if (updateError) {
      console.error('[Recalculate Patterns] Update error:', updateError)
      return NextResponse.json({ error: 'Erro ao atualizar auditoria' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      patterns: newSummary.patterns,
      message: 'Padrões recalculados com sucesso',
    })
  } catch (error) {
    console.error('[Recalculate Patterns] Error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
