import type {
  Audit,
  Insight,
  InsightType,
  ComparisonDelta,
  ComparisonViolations,
  TrendData,
  TrendDirection,
  EvolutionTrends,
  AuditSummary,
} from '@/types'
import { calculateHealthScore } from './health'

// ============================================
// TIPOS INTERNOS
// ============================================

interface ComparisonInsightsInput {
  delta: ComparisonDelta
  violations: ComparisonViolations
  currentSummary: AuditSummary | null
}

interface EvolutionInsightsInput {
  audits: Array<{
    id: string
    createdAt: string
    summary: AuditSummary | null
    healthScore: number | null
  }>
  trends: EvolutionTrends
}

// ============================================
// CONSTANTES
// ============================================

const INSIGHT_KEYS = {
  // Comparacao
  criticalFixed: 'criticalFixed',
  seriousFixed: 'seriousFixed',
  newCritical: 'newCritical',
  newSerious: 'newSerious',
  scoreImproved: 'scoreImproved',
  scoreDecreased: 'scoreDecreased',
  focusOn: 'focusOn',
  greatProgress: 'greatProgress',
  significantRegression: 'significantRegression',
  noViolations: 'noViolations',
  firstAudit: 'firstAudit',
  allFixed: 'allFixed',
  manyFixed: 'manyFixed',
  manyNew: 'manyNew',
  stable: 'stable',

  // Evolucao
  consistentImprovement: 'consistentImprovement',
  consistentWorsening: 'consistentWorsening',
  recentSpike: 'recentSpike',
  recentDrop: 'recentDrop',
  healthScoreTrend: 'healthScoreTrend',
  criticalTrend: 'criticalTrend',
} as const

// ============================================
// GERACAO DE INSIGHTS - COMPARACAO
// ============================================

/**
 * Gera insights para comparacao entre duas auditorias
 */
export function generateComparisonInsights(input: ComparisonInsightsInput): Insight[] {
  const { delta, violations, currentSummary } = input
  const insights: Insight[] = []

  // Sem summary atual = primeira auditoria ou algo errado
  if (!currentSummary) {
    return insights
  }

  // Criticos corrigidos (muito positivo)
  const criticalFixed = violations.fixed.filter((v) => v.previous?.impact === 'critical').length
  if (criticalFixed > 0) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.criticalFixed,
      params: { count: criticalFixed },
    })
  }

  // Serios corrigidos (positivo)
  const seriousFixed = violations.fixed.filter((v) => v.previous?.impact === 'serious').length
  if (seriousFixed > 0 && criticalFixed === 0) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.seriousFixed,
      params: { count: seriousFixed },
    })
  }

  // Novos criticos (muito negativo)
  const newCritical = violations.new.filter((v) => v.current?.impact === 'critical').length
  if (newCritical > 0) {
    insights.push({
      type: 'negative',
      key: INSIGHT_KEYS.newCritical,
      params: { count: newCritical },
    })
  }

  // Novos serios (negativo)
  const newSerious = violations.new.filter((v) => v.current?.impact === 'serious').length
  if (newSerious > 0 && newCritical === 0) {
    insights.push({
      type: 'negative',
      key: INSIGHT_KEYS.newSerious,
      params: { count: newSerious },
    })
  }

  // Score melhorou significativamente
  if (delta.healthScore >= 5) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.scoreImproved,
      params: { percent: Math.round(delta.healthScore) },
    })
  }

  // Score piorou significativamente
  if (delta.healthScore <= -5) {
    insights.push({
      type: 'negative',
      key: INSIGHT_KEYS.scoreDecreased,
      params: { percent: Math.abs(Math.round(delta.healthScore)) },
    })
  }

  // Muitas violacoes corrigidas (geral)
  if (violations.fixed.length >= 5 && criticalFixed === 0 && seriousFixed === 0) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.manyFixed,
      params: { count: violations.fixed.length },
    })
  }

  // Muitas novas violacoes (geral)
  if (violations.new.length >= 5 && newCritical === 0 && newSerious === 0) {
    insights.push({
      type: 'warning',
      key: INSIGHT_KEYS.manyNew,
      params: { count: violations.new.length },
    })
  }

  // Foco em criticos restantes (quando poucos restam)
  const criticalRemaining = currentSummary.critical
  if (criticalRemaining > 0 && criticalRemaining <= 5 && delta.critical <= 0) {
    insights.push({
      type: 'warning',
      key: INSIGHT_KEYS.focusOn,
      params: { count: criticalRemaining },
    })
  }

  // Excelente progresso geral
  if (delta.total <= -10 && delta.healthScore > 0 && newCritical === 0) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.greatProgress,
      params: {},
    })
  }

  // Regressao significativa
  if (delta.total >= 10 && delta.healthScore < -5) {
    insights.push({
      type: 'negative',
      key: INSIGHT_KEYS.significantRegression,
      params: { count: delta.total },
    })
  }

  // Sem violacoes!
  if (currentSummary.total === 0) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.noViolations,
      params: {},
    })
  }

  // Estavel (nenhuma mudanca significativa)
  if (
    insights.length === 0 &&
    Math.abs(delta.total) < 3 &&
    Math.abs(delta.healthScore) < 3
  ) {
    insights.push({
      type: 'neutral',
      key: INSIGHT_KEYS.stable,
      params: {},
    })
  }

  // Limitar a 4 insights mais relevantes
  return insights.slice(0, 4)
}

/**
 * Gera insight para primeira auditoria (sem comparacao)
 */
export function generateFirstAuditInsight(): Insight {
  return {
    type: 'neutral',
    key: INSIGHT_KEYS.firstAudit,
    params: {},
  }
}

// ============================================
// GERACAO DE INSIGHTS - EVOLUCAO
// ============================================

/**
 * Gera insights para evolucao ao longo do tempo
 */
export function generateEvolutionInsights(input: EvolutionInsightsInput): Insight[] {
  const { audits, trends } = input
  const insights: Insight[] = []

  // Precisa de pelo menos 2 auditorias para insights de evolucao
  if (audits.length < 2) {
    insights.push(generateFirstAuditInsight())
    return insights
  }

  // Tendencia do score de saude
  if (trends.healthScore.direction === 'up' && trends.healthScore.changePercent >= 10) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.consistentImprovement,
      params: { percent: Math.round(trends.healthScore.changePercent) },
    })
  } else if (trends.healthScore.direction === 'down' && trends.healthScore.changePercent <= -10) {
    insights.push({
      type: 'negative',
      key: INSIGHT_KEYS.consistentWorsening,
      params: { percent: Math.abs(Math.round(trends.healthScore.changePercent)) },
    })
  }

  // Tendencia de criticos
  if (trends.critical.direction === 'up' && trends.critical.changeAbsolute > 0) {
    insights.push({
      type: 'negative',
      key: INSIGHT_KEYS.criticalTrend,
      params: { count: trends.critical.changeAbsolute, direction: 'up' },
    })
  } else if (trends.critical.direction === 'down' && trends.critical.changeAbsolute < 0) {
    insights.push({
      type: 'positive',
      key: INSIGHT_KEYS.criticalTrend,
      params: { count: Math.abs(trends.critical.changeAbsolute), direction: 'down' },
    })
  }

  // Verificar spikes recentes (ultima auditoria muito diferente da anterior)
  if (audits.length >= 2) {
    const latest = audits[0]
    const previous = audits[1]

    if (latest.summary && previous.summary) {
      const latestTotal = latest.summary.total
      const previousTotal = previous.summary.total
      const diff = latestTotal - previousTotal

      if (diff > 10) {
        insights.push({
          type: 'warning',
          key: INSIGHT_KEYS.recentSpike,
          params: { count: diff },
        })
      } else if (diff < -10) {
        insights.push({
          type: 'positive',
          key: INSIGHT_KEYS.recentDrop,
          params: { count: Math.abs(diff) },
        })
      }
    }
  }

  // Limitar a 3 insights
  return insights.slice(0, 3)
}

// ============================================
// CALCULO DE TENDENCIAS
// ============================================

/**
 * Calcula tendencia para uma serie de valores
 */
export function calculateTrend(values: number[]): TrendData {
  if (values.length === 0) {
    return {
      direction: 'stable',
      changePercent: 0,
      changeAbsolute: 0,
      values: [],
    }
  }

  if (values.length === 1) {
    return {
      direction: 'stable',
      changePercent: 0,
      changeAbsolute: 0,
      values: [{ date: '', value: values[0] }],
    }
  }

  const first = values[0]
  const last = values[values.length - 1]

  const changeAbsolute = last - first
  const changePercent = first !== 0 ? ((last - first) / first) * 100 : last !== 0 ? 100 : 0

  let direction: TrendDirection = 'stable'
  if (changePercent > 5) {
    direction = 'up'
  } else if (changePercent < -5) {
    direction = 'down'
  }

  return {
    direction,
    changePercent,
    changeAbsolute,
    values: [], // Sera preenchido pelo caller com datas
  }
}

/**
 * Calcula todas as tendencias para um conjunto de auditorias
 */
export function calculateEvolutionTrends(
  audits: Array<{
    createdAt: string
    summary: AuditSummary | null
    healthScore: number | null
  }>
): EvolutionTrends {
  // Ordenar por data (mais antigo primeiro para calculo de tendencia)
  const sorted = [...audits].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )

  const healthScores = sorted.map((a) => a.healthScore ?? 0)
  const criticals = sorted.map((a) => a.summary?.critical ?? 0)
  const serious = sorted.map((a) => a.summary?.serious ?? 0)
  const moderates = sorted.map((a) => a.summary?.moderate ?? 0)
  const minors = sorted.map((a) => a.summary?.minor ?? 0)
  const totals = sorted.map((a) => a.summary?.total ?? 0)

  const createTrendWithValues = (
    values: number[],
    dates: string[]
  ): TrendData => {
    const trend = calculateTrend(values)
    return {
      ...trend,
      values: values.map((value, index) => ({
        date: dates[index] ?? '',
        value,
      })),
    }
  }

  const dates = sorted.map((a) => a.createdAt)

  return {
    healthScore: createTrendWithValues(healthScores, dates),
    critical: createTrendWithValues(criticals, dates),
    serious: createTrendWithValues(serious, dates),
    moderate: createTrendWithValues(moderates, dates),
    minor: createTrendWithValues(minors, dates),
    total: createTrendWithValues(totals, dates),
  }
}

// ============================================
// FUNCOES AUXILIARES
// ============================================

/**
 * Retorna a cor/icone para um tipo de insight
 */
export function getInsightIcon(type: InsightType): string {
  switch (type) {
    case 'positive':
      return '✅'
    case 'negative':
      return '⚠️'
    case 'warning':
      return '🔔'
    case 'neutral':
      return 'ℹ️'
  }
}

/**
 * Retorna a classe CSS para a cor do insight
 */
export function getInsightColorClass(type: InsightType): string {
  switch (type) {
    case 'positive':
      return 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    case 'negative':
      return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    case 'warning':
      return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    case 'neutral':
      return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  }
}

/**
 * Retorna o icone de seta para tendencia
 */
export function getTrendArrow(direction: TrendDirection): string {
  switch (direction) {
    case 'up':
      return '↑'
    case 'down':
      return '↓'
    case 'stable':
      return '→'
  }
}

/**
 * Retorna a classe CSS para a cor da tendencia
 * Para score: up = bom, down = ruim
 * Para violacoes: up = ruim, down = bom
 */
export function getTrendColorClass(
  direction: TrendDirection,
  type: 'score' | 'violations'
): string {
  if (direction === 'stable') {
    return 'text-gray-600 dark:text-gray-400'
  }

  const isPositive =
    (type === 'score' && direction === 'up') ||
    (type === 'violations' && direction === 'down')

  return isPositive
    ? 'text-green-600 dark:text-green-400'
    : 'text-red-600 dark:text-red-400'
}
