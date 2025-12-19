import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateEvolutionTrends, generateEvolutionInsights } from '@/lib/audit/insights'
import { calculateHealthScore } from '@/lib/audit/health'
import type { Audit, EvolutionResponse, EvolutionAudit } from '@/types'

interface Props {
  params: Promise<{ id: string }>
}

// Periodos suportados em dias
const ALLOWED_PERIODS = ['7d', '30d', '90d', '1y', 'all'] as const
type Period = typeof ALLOWED_PERIODS[number]

const PERIOD_DAYS: Record<Period, number | null> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '1y': 365,
  'all': null,
}

function isValidPeriod(value: string): value is Period {
  return ALLOWED_PERIODS.includes(value as Period)
}

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const periodParam = searchParams.get('period') || '30d'
    const period: Period = isValidPeriod(periodParam) ? periodParam : '30d'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    const supabase = await createClient()

    // Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
    }

    // Buscar projeto e verificar ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      console.error('[Project Evolution] Project not found:', { id, error: projectError })
      return NextResponse.json({ error: 'Projeto nao encontrado' }, { status: 404 })
    }

    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Construir query de auditorias
    let query = supabase
      .from('audits')
      .select('id, created_at, completed_at, summary, health_score, processed_pages, broken_pages_count, wcag_levels, include_emag')
      .eq('project_id', id)
      .eq('status', 'COMPLETED')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Aplicar filtro de periodo
    const periodDays = PERIOD_DAYS[period]
    if (periodDays !== null) {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)
      query = query.gte('created_at', startDate.toISOString())
    }

    const { data: auditsData, error: auditsError } = await query

    if (auditsError) {
      console.error('[Project Evolution] Error fetching audits:', auditsError)
      return NextResponse.json({ error: 'Erro ao buscar auditorias' }, { status: 500 })
    }

    const audits = (auditsData || []) as Array<{
      id: string
      created_at: string
      completed_at: string | null
      summary: Audit['summary']
      health_score: number | null
      processed_pages: number
      broken_pages_count: number
      wcag_levels: string[]
      include_emag: boolean
    }>

    // Transformar para o tipo de resposta
    // NOTA: Para auditorias antigas sem health_score, recalculamos usando a fórmula atual
    // Isso garante consistência no gráfico de evolução (mesma fórmula para todas as auditorias)
    const evolutionAudits: EvolutionAudit[] = audits.map((a) => ({
      id: a.id,
      createdAt: a.created_at,
      completedAt: a.completed_at,
      healthScore: a.health_score ?? (a.summary ? calculateHealthScore({ summary: a.summary } as Audit) : null),
      summary: a.summary,
      pagesAudited: a.processed_pages,
      brokenPagesCount: a.broken_pages_count,
      wcagLevels: a.wcag_levels,
      includeEmag: a.include_emag,
    }))

    // Calcular tendencias (precisa inverter para ordem cronologica)
    const chronologicalAudits = [...evolutionAudits].reverse()
    const trends = calculateEvolutionTrends(
      chronologicalAudits.map((a) => ({
        createdAt: a.createdAt,
        summary: a.summary,
        healthScore: a.healthScore,
      }))
    )

    // Gerar insights
    const insights = generateEvolutionInsights({
      audits: chronologicalAudits.map((a) => ({
        id: a.id,
        createdAt: a.createdAt,
        summary: a.summary,
        healthScore: a.healthScore,
      })),
      trends,
    })

    const response: EvolutionResponse = {
      audits: evolutionAudits,
      trends,
      insights,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[Project Evolution] Error:', error)
    return NextResponse.json({ error: 'Erro ao buscar evolucao' }, { status: 500 })
  }
}
