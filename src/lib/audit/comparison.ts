import type {
  Audit,
  AggregatedViolation,
  AuditSummary,
  ComparisonDelta,
  ViolationChangeDetail,
  ComparisonViolations,
  ViolationChangeType,
  ImpactLevel,
} from '@/types'
import { calculateHealthScore } from './health'

// ============================================
// TIPOS INTERNOS
// ============================================

interface ViolationComparisonInput {
  currentViolations: AggregatedViolation[]
  previousViolations: AggregatedViolation[]
}

export interface ComparisonResult {
  delta: ComparisonDelta
  violations: ComparisonViolations
  counts: {
    new: number
    fixed: number
    persistent: number
    worsened: number
    improved: number
  }
}

// ============================================
// FUNCOES PRINCIPAIS
// ============================================

/**
 * Calcula a comparacao completa entre duas auditorias
 */
export function calculateComparison(
  currentAudit: Audit,
  currentViolations: AggregatedViolation[],
  previousAudit: Audit,
  previousViolations: AggregatedViolation[]
): ComparisonResult {
  // Calcular deltas de summary
  const delta = calculateDelta(currentAudit, previousAudit)

  // Calcular mudancas de violacoes
  const violationChanges = calculateViolationChanges({
    currentViolations,
    previousViolations,
  })

  return {
    delta,
    violations: violationChanges.violations,
    counts: violationChanges.counts,
  }
}

/**
 * Calcula os deltas entre duas auditorias
 */
export function calculateDelta(currentAudit: Audit, previousAudit: Audit): ComparisonDelta {
  const currentSummary = currentAudit.summary ?? {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    total: 0,
  }
  const previousSummary = previousAudit.summary ?? {
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    total: 0,
  }

  const currentHealthScore = currentAudit.health_score ?? calculateHealthScore(currentAudit)
  const previousHealthScore = previousAudit.health_score ?? calculateHealthScore(previousAudit)

  return {
    healthScore: currentHealthScore - previousHealthScore,
    critical: currentSummary.critical - previousSummary.critical,
    serious: currentSummary.serious - previousSummary.serious,
    moderate: currentSummary.moderate - previousSummary.moderate,
    minor: currentSummary.minor - previousSummary.minor,
    total: currentSummary.total - previousSummary.total,
    pagesAudited: currentAudit.processed_pages - previousAudit.processed_pages,
    brokenPages: currentAudit.broken_pages_count - previousAudit.broken_pages_count,
  }
}

/**
 * Calcula as mudancas de violacoes entre duas auditorias
 */
export function calculateViolationChanges(input: ViolationComparisonInput): {
  violations: ComparisonViolations
  counts: {
    new: number
    fixed: number
    persistent: number
    worsened: number
    improved: number
  }
} {
  const { currentViolations, previousViolations } = input

  // Criar maps por fingerprint para comparacao rapida
  const currentMap = new Map<string, AggregatedViolation>()
  for (const v of currentViolations) {
    currentMap.set(v.fingerprint, v)
  }

  const previousMap = new Map<string, AggregatedViolation>()
  for (const v of previousViolations) {
    previousMap.set(v.fingerprint, v)
  }

  const newViolations: ViolationChangeDetail[] = []
  const fixedViolations: ViolationChangeDetail[] = []
  const persistentViolations: ViolationChangeDetail[] = []
  const worsenedViolations: ViolationChangeDetail[] = []
  const improvedViolations: ViolationChangeDetail[] = []

  // Analisar violacoes atuais
  for (const [fingerprint, current] of currentMap) {
    const previous = previousMap.get(fingerprint)

    if (!previous) {
      // Nova violacao
      newViolations.push(createViolationChangeDetail('new', current, null))
    } else {
      // Violacao existente - verificar se piorou, melhorou ou continua igual
      const deltaOccurrences = current.occurrences - previous.occurrences
      const deltaPageCount = current.page_count - previous.page_count

      if (deltaOccurrences > 0 || deltaPageCount > 0) {
        // Piorou (mais ocorrencias ou mais paginas)
        worsenedViolations.push(createViolationChangeDetail('worsened', current, previous))
      } else if (deltaOccurrences < 0 || deltaPageCount < 0) {
        // Melhorou (menos ocorrencias ou menos paginas)
        improvedViolations.push(createViolationChangeDetail('improved', current, previous))
      } else {
        // Persistente (sem mudanca)
        persistentViolations.push(createViolationChangeDetail('persistent', current, previous))
      }
    }
  }

  // Violacoes corrigidas (existiam antes, nao existem mais)
  for (const [fingerprint, previous] of previousMap) {
    if (!currentMap.has(fingerprint)) {
      fixedViolations.push(createViolationChangeDetail('fixed', null, previous))
    }
  }

  // Ordenar por impacto (critical > serious > moderate > minor)
  const sortByImpact = (a: ViolationChangeDetail, b: ViolationChangeDetail) => {
    const impactOrder: Record<ImpactLevel, number> = {
      critical: 0,
      serious: 1,
      moderate: 2,
      minor: 3,
    }
    const impactA = a.current?.impact ?? a.previous?.impact ?? 'minor'
    const impactB = b.current?.impact ?? b.previous?.impact ?? 'minor'
    return impactOrder[impactA] - impactOrder[impactB]
  }

  newViolations.sort(sortByImpact)
  fixedViolations.sort(sortByImpact)
  persistentViolations.sort(sortByImpact)
  worsenedViolations.sort(sortByImpact)
  improvedViolations.sort(sortByImpact)

  return {
    violations: {
      new: newViolations,
      fixed: fixedViolations,
      persistent: persistentViolations,
      worsened: worsenedViolations,
      improved: improvedViolations,
    },
    counts: {
      new: newViolations.length,
      fixed: fixedViolations.length,
      persistent: persistentViolations.length,
      worsened: worsenedViolations.length,
      improved: improvedViolations.length,
    },
  }
}

/**
 * Cria um objeto ViolationChangeDetail a partir de violacoes
 */
function createViolationChangeDetail(
  type: ViolationChangeType,
  current: AggregatedViolation | null,
  previous: AggregatedViolation | null
): ViolationChangeDetail {
  const source = current ?? previous

  if (!source) {
    throw new Error('At least one of current or previous must be provided')
  }

  const currentData = current
    ? {
        occurrences: current.occurrences,
        pageCount: current.page_count,
        impact: current.impact,
      }
    : null

  const previousData = previous
    ? {
        occurrences: previous.occurrences,
        pageCount: previous.page_count,
        impact: previous.impact,
      }
    : null

  const deltaOccurrences = (current?.occurrences ?? 0) - (previous?.occurrences ?? 0)
  const deltaPageCount = (current?.page_count ?? 0) - (previous?.page_count ?? 0)

  return {
    type,
    ruleId: source.rule_id,
    fingerprint: source.fingerprint,
    help: source.help,
    description: source.description,
    current: currentData,
    previous: previousData,
    delta: {
      occurrences: deltaOccurrences,
      pageCount: deltaPageCount,
    },
  }
}

// ============================================
// FUNCOES AUXILIARES
// ============================================

/**
 * Verifica se houve melhoria geral entre duas auditorias
 */
export function hasOverallImprovement(delta: ComparisonDelta): boolean {
  // Considera melhoria se:
  // - Score de saude aumentou OU
  // - Total de violacoes diminuiu E nao aumentou criticas
  return delta.healthScore > 0 || (delta.total < 0 && delta.critical <= 0)
}

/**
 * Verifica se houve piora geral entre duas auditorias
 */
export function hasOverallRegression(delta: ComparisonDelta): boolean {
  // Considera piora se:
  // - Score de saude diminuiu mais que 5% OU
  // - Aumentou violacoes criticas OU
  // - Total de violacoes aumentou significativamente
  return delta.healthScore < -5 || delta.critical > 0 || delta.total > 10
}

/**
 * Calcula a tendencia geral
 */
export function calculateTrendDirection(
  delta: ComparisonDelta
): 'improving' | 'worsening' | 'stable' {
  if (hasOverallImprovement(delta)) {
    return 'improving'
  }
  if (hasOverallRegression(delta)) {
    return 'worsening'
  }
  return 'stable'
}

/**
 * Formata o delta para exibicao
 */
export function formatDelta(value: number, type: 'violations' | 'score' | 'pages'): string {
  if (value === 0) return '0'

  const prefix = value > 0 ? '+' : ''
  const suffix = type === 'score' ? '%' : ''

  return `${prefix}${value}${suffix}`
}

/**
 * Retorna a cor para o delta
 * Para violacoes: verde = menos (bom), vermelho = mais (ruim)
 * Para score: verde = mais (bom), vermelho = menos (ruim)
 */
export function getDeltaColor(
  value: number,
  type: 'violations' | 'score' | 'pages'
): 'positive' | 'negative' | 'neutral' {
  if (value === 0) return 'neutral'

  if (type === 'violations') {
    // Menos violacoes = bom
    return value < 0 ? 'positive' : 'negative'
  }

  if (type === 'score') {
    // Mais score = bom
    return value > 0 ? 'positive' : 'negative'
  }

  // Paginas: neutro
  return 'neutral'
}

/**
 * Retorna a classe CSS para a cor do delta
 */
export function getDeltaColorClass(color: 'positive' | 'negative' | 'neutral'): string {
  switch (color) {
    case 'positive':
      return 'text-green-600 dark:text-green-400'
    case 'negative':
      return 'text-red-600 dark:text-red-400'
    case 'neutral':
      return 'text-gray-600 dark:text-gray-400'
  }
}

/**
 * Retorna a classe CSS de background para a cor do delta
 */
export function getDeltaBgClass(color: 'positive' | 'negative' | 'neutral'): string {
  switch (color) {
    case 'positive':
      return 'bg-green-100 dark:bg-green-900/30'
    case 'negative':
      return 'bg-red-100 dark:bg-red-900/30'
    case 'neutral':
      return 'bg-gray-100 dark:bg-gray-800'
  }
}
