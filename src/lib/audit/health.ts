import type { Audit, AggregatedViolation, ImpactLevel } from '@/types'
import { calculateAccessibilityScore, calculateRulesFromAudit } from './score-calculator'

// ============================================
// CONSTANTES
// ============================================

/**
 * Pesos por severidade para calculo do health score
 * Baseado no padrao da industria (Lighthouse/axe-core/Cypress)
 */
export const SEVERITY_WEIGHTS = {
  critical: 10,
  serious: 7,
  moderate: 3,
  minor: 1,
} as const

/**
 * Fator de decaimento para formula exponencial
 * Quanto maior, mais "generoso" o score
 * Calibrado para: 50 penalty/page = ~88%, 200 = ~61%, 500 = ~29%
 */
export const DECAY_FACTOR = 400

/** Numero de criterios WCAG 2.2 automaticamente testaveis por nivel */
export const WCAG_CRITERIA_COUNTS: Record<string, number> = {
  A: 25,
  AA: 13,
  AAA: 10,
}

/** Niveis WCAG validos */
export const VALID_WCAG_LEVELS = ['A', 'AA', 'AAA'] as const

/** Total de recomendacoes do eMAG 3.1 */
export const EMAG_TOTAL_RECOMMENDATIONS = 45

// ============================================
// TIPOS
// ============================================

export type HealthLabel = 'Critico' | 'Regular' | 'Bom' | 'Excelente'
export type GuidancePriority = 'critical' | 'serious' | 'moderate' | 'minor' | 'success'

export interface GuidanceMessage {
  title: string
  message: string
  priority: GuidancePriority
}

export interface SeveritySummary {
  count: number
  uniqueTypes: number
}

export interface DashboardSummary {
  total: SeveritySummary
  critical: SeveritySummary
  serious: SeveritySummary
  moderate: SeveritySummary
  minor: SeveritySummary
}

export interface WcagPrincipleBreakdown {
  perceivable: number   // 1.x.x
  operable: number      // 2.x.x
  understandable: number // 3.x.x
  robust: number        // 4.x.x
}

// ============================================
// FUNCOES DE SAUDE
// ============================================

/**
 * Calcula a penalidade ponderada total
 */
export function calculateWeightedPenalty(summary: {
  critical: number
  serious: number
  moderate: number
  minor: number
}): number {
  return (
    summary.critical * SEVERITY_WEIGHTS.critical +
    summary.serious * SEVERITY_WEIGHTS.serious +
    summary.moderate * SEVERITY_WEIGHTS.moderate +
    summary.minor * SEVERITY_WEIGHTS.minor
  )
}

/**
 * Calcula o score de saude da acessibilidade (0-100)
 *
 * FORMULA V2: Baseada em densidade por pagina com decaimento exponencial
 *
 * 1. Calcula penalidade ponderada: critical*10 + serious*7 + moderate*3 + minor*1
 * 2. Calcula densidade: penalidade / paginas_auditadas
 * 3. Aplica decaimento exponencial: 100 * e^(-densidade/DECAY_FACTOR)
 *
 * Isso garante que:
 * - Sites maiores (mais paginas) nao sao penalizados injustamente
 * - Cada correcao melhora o score
 * - Score nunca e 100% (sempre ha espaco para melhorar)
 * - Violacoes criticas pesam muito mais
 */
export function calculateHealthScore(audit: Audit): number {
  if (!audit.summary) return 100

  const { total, critical, serious, moderate, minor, patterns } = audit.summary

  // Se nao ha violacoes, 100% saudavel
  if (total === 0) return 100

  // Usar fórmula BrowserStack: proporção de regras passed vs failed
  // IMPORTANTE: Usar PADRÕES ÚNICOS quando disponível, não ocorrências brutas
  // Isso reflete o "esforço real" de correção (1 fix no template corrige N ocorrências)
  // axe-core executa ~100 regras, usamos isso como base para estimar passed rules
  const TOTAL_RULES_ESTIMATE = 100
  const failedByPatterns = {
    critical: patterns?.critical ?? critical,
    serious: patterns?.serious ?? serious,
    moderate: patterns?.moderate ?? moderate,
    minor: patterns?.minor ?? minor,
  }
  const { passedRules, failedRules } = calculateRulesFromAudit(TOTAL_RULES_ESTIMATE, failedByPatterns)
  const scoreData = calculateAccessibilityScore(passedRules, failedRules)

  return scoreData.score
}

/**
 * @deprecated Use calculateHealthScore que agora usa a formula V2
 * Mantido para compatibilidade com dados antigos
 */
export function calculateHealthScoreLegacy(audit: Audit): number {
  if (!audit.summary) return 100

  const { total, critical, serious, moderate, minor } = audit.summary

  if (total === 0) return 100

  const maxPenalty = total * SEVERITY_WEIGHTS.critical
  if (maxPenalty === 0) return 100

  const penalty =
    critical * SEVERITY_WEIGHTS.critical +
    serious * SEVERITY_WEIGHTS.serious +
    moderate * SEVERITY_WEIGHTS.moderate +
    minor * SEVERITY_WEIGHTS.minor

  const health = Math.max(0, 100 - (penalty / maxPenalty) * 100)
  return Math.round(health)
}

/**
 * Retorna o label de saude baseado no score
 */
export function getHealthLabel(score: number): HealthLabel {
  if (score >= 90) return 'Excelente'
  if (score >= 70) return 'Bom'
  if (score >= 50) return 'Regular'
  return 'Critico'
}

/**
 * Retorna a cor CSS baseada no score de saude
 */
export function getHealthColor(score: number): string {
  if (score >= 90) return 'text-green-500'
  if (score >= 70) return 'text-yellow-500'
  if (score >= 50) return 'text-orange-500'
  return 'text-red-500'
}

/**
 * Retorna a mensagem de orientacao baseada no estado da auditoria
 */
export function getGuidanceMessage(audit: Audit): GuidanceMessage {
  if (!audit.summary) {
    return {
      title: 'Parabens!',
      message: 'Nenhum problema de acessibilidade detectado.',
      priority: 'success',
    }
  }

  const { critical, serious, moderate, minor, total } = audit.summary

  if (total === 0) {
    return {
      title: 'Parabens!',
      message: 'Nenhum problema de acessibilidade detectado.',
      priority: 'success',
    }
  }

  if (critical > 0) {
    return {
      title: 'Prioridade: Problemas Criticos',
      message: `Corrija os ${critical} problemas criticos primeiro. Eles impedem completamente o acesso de pessoas com deficiencia ao seu site.`,
      priority: 'critical',
    }
  }

  if (serious > 0) {
    return {
      title: 'Prioridade: Problemas Serios',
      message: `Foque nos ${serious} problemas serios. Eles dificultam significativamente a navegacao para pessoas com deficiencia.`,
      priority: 'serious',
    }
  }

  if (moderate > 0) {
    return {
      title: 'Quase la!',
      message: `Corrija os ${moderate} problemas moderados para melhorar ainda mais a experiencia de todos os usuarios.`,
      priority: 'moderate',
    }
  }

  return {
    title: 'Ultimos ajustes',
    message: `Restam apenas ${minor} problemas menores. Seu site ja esta bastante acessivel!`,
    priority: 'minor',
  }
}

/**
 * Retorna a cor de fundo para a prioridade
 */
export function getPriorityBgColor(priority: GuidancePriority): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900'
    case 'serious':
      return 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900'
    case 'moderate':
      return 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900'
    case 'minor':
      return 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900'
    case 'success':
      return 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900'
    default:
      return 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
  }
}

/**
 * Retorna a cor do texto para a prioridade
 */
export function getPriorityTextColor(priority: GuidancePriority): string {
  switch (priority) {
    case 'critical':
      return 'text-red-700 dark:text-red-400'
    case 'serious':
      return 'text-orange-700 dark:text-orange-400'
    case 'moderate':
      return 'text-yellow-700 dark:text-yellow-400'
    case 'minor':
      return 'text-blue-700 dark:text-blue-400'
    case 'success':
      return 'text-green-700 dark:text-green-400'
    default:
      return 'text-gray-700 dark:text-gray-400'
  }
}

/**
 * Retorna classe CSS para cor de progresso baseada na porcentagem
 */
export function getProgressColorClass(percent: number): string {
  if (percent >= 90) return '[&>[data-slot=progress-indicator]]:bg-green-500'
  if (percent >= 70) return '[&>[data-slot=progress-indicator]]:bg-yellow-500'
  return '[&>[data-slot=progress-indicator]]:bg-red-500'
}

// ============================================
// FUNCOES DE RESUMO
// ============================================

/**
 * Calcula o resumo com tipos unicos por severidade
 */
export function calculateDashboardSummary(
  audit: Audit,
  violations: AggregatedViolation[]
): DashboardSummary {
  const countByImpact = (impact: ImpactLevel) =>
    violations.filter((v) => v.impact === impact).length

  const summary = audit.summary ?? { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 }

  return {
    total: {
      count: summary.total,
      uniqueTypes: violations.length,
    },
    critical: {
      count: summary.critical,
      uniqueTypes: countByImpact('critical'),
    },
    serious: {
      count: summary.serious,
      uniqueTypes: countByImpact('serious'),
    },
    moderate: {
      count: summary.moderate,
      uniqueTypes: countByImpact('moderate'),
    },
    minor: {
      count: summary.minor,
      uniqueTypes: countByImpact('minor'),
    },
  }
}

// ============================================
// FUNCOES WCAG
// ============================================

/**
 * Mapeia criterio WCAG para principio POUR
 * Ex: "1.1.1" -> "perceivable", "2.4.4" -> "operable"
 */
function wcagCriteriaToPrinciple(criteria: string): keyof WcagPrincipleBreakdown | null {
  const match = criteria.match(/^(\d)\./)
  if (!match) return null

  switch (match[1]) {
    case '1':
      return 'perceivable'
    case '2':
      return 'operable'
    case '3':
      return 'understandable'
    case '4':
      return 'robust'
    default:
      return null
  }
}

/**
 * Calcula breakdown de problemas por principio WCAG (POUR)
 */
export function calculateWcagPrincipleBreakdown(
  violations: AggregatedViolation[]
): WcagPrincipleBreakdown {
  const breakdown: WcagPrincipleBreakdown = {
    perceivable: 0,
    operable: 0,
    understandable: 0,
    robust: 0,
  }

  // Usar Set para nao contar o mesmo criterio multiplas vezes
  const countedCriteria = new Set<string>()

  for (const violation of violations) {
    // Check defensivo: garantir que wcag_criteria e um array valido
    if (!violation.wcag_criteria || !Array.isArray(violation.wcag_criteria)) continue

    for (const criteria of violation.wcag_criteria) {
      if (countedCriteria.has(criteria)) continue
      countedCriteria.add(criteria)

      const principle = wcagCriteriaToPrinciple(criteria)
      if (principle) {
        breakdown[principle]++
      }
    }
  }

  return breakdown
}

/**
 * Calcula dados de conformidade WCAG
 */
export function calculateWcagConformance(
  violations: AggregatedViolation[],
  wcagLevels: string[]
): {
  conformancePercent: number
  affectedCriteria: number
  totalCriteria: number
  byPrinciple: WcagPrincipleBreakdown
} {
  // Validar e normalizar niveis WCAG
  const validLevels = wcagLevels
    .map((l) => l.toUpperCase())
    .filter((l): l is (typeof VALID_WCAG_LEVELS)[number] =>
      VALID_WCAG_LEVELS.includes(l as (typeof VALID_WCAG_LEVELS)[number])
    )

  // Se nenhum nivel valido, retornar valores padrao
  if (validLevels.length === 0) {
    return {
      conformancePercent: 100,
      affectedCriteria: 0,
      totalCriteria: 0,
      byPrinciple: calculateWcagPrincipleBreakdown(violations),
    }
  }

  // Contar criterios afetados
  const affectedCriteria = new Set<string>()
  for (const violation of violations) {
    // Check defensivo: garantir que wcag_criteria e um array valido
    if (!violation.wcag_criteria || !Array.isArray(violation.wcag_criteria)) continue

    for (const criteria of violation.wcag_criteria) {
      affectedCriteria.add(criteria)
    }
  }

  // Total de criterios WCAG 2.2 automaticamente testaveis por nivel
  const totalCriteria = validLevels.reduce(
    (sum, level) => sum + (WCAG_CRITERIA_COUNTS[level] || 0),
    0
  )

  const affectedCount = affectedCriteria.size
  const conformancePercent =
    totalCriteria > 0
      ? Math.round(((totalCriteria - affectedCount) / totalCriteria) * 100)
      : 100

  return {
    conformancePercent,
    affectedCriteria: affectedCount,
    totalCriteria,
    byPrinciple: calculateWcagPrincipleBreakdown(violations),
  }
}

// ============================================
// FUNCOES eMAG
// ============================================

/**
 * Calcula dados de conformidade eMAG
 */
export function calculateEmagConformance(violations: AggregatedViolation[]): {
  conformancePercent: number
  affectedRecommendations: number
  totalRecommendations: number
} {
  const affectedRecommendations = new Set<string>()

  for (const violation of violations) {
    // Check defensivo: garantir que emag_recommendations e um array valido
    if (!violation.emag_recommendations || !Array.isArray(violation.emag_recommendations)) continue

    for (const rec of violation.emag_recommendations) {
      affectedRecommendations.add(rec)
    }
  }

  const affectedCount = affectedRecommendations.size
  const conformancePercent = Math.round(
    ((EMAG_TOTAL_RECOMMENDATIONS - affectedCount) / EMAG_TOTAL_RECOMMENDATIONS) * 100
  )

  return {
    conformancePercent,
    affectedRecommendations: affectedCount,
    totalRecommendations: EMAG_TOTAL_RECOMMENDATIONS,
  }
}
