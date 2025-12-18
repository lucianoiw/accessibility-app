/**
 * Score Calculator - Formula baseada no BrowserStack
 *
 * A formula usa contagem de regras (passed/failed) por severidade,
 * com pesos diferentes para passed e failed.
 */

export interface SeverityBreakdown {
  critical: number
  serious: number
  moderate: number
  minor: number
}

export interface ScoreData {
  score: number
  passedRules: SeverityBreakdown
  failedRules: SeverityBreakdown
  scoreImpact: SeverityBreakdown
  weightedPassed: number
  weightedFailed: number
}

/** Pesos para regras que passaram */
export const PASS_WEIGHTS = {
  critical: 10,
  serious: 7,
  moderate: 3,
  minor: 1,
} as const

/** Pesos para regras que falharam (mais pesadas) */
export const FAIL_WEIGHTS = {
  critical: 20,
  serious: 14,
  moderate: 6,
  minor: 2,
} as const

/**
 * Calcula o score de acessibilidade usando a formula do BrowserStack
 *
 * Score = (Weighted sum of passed rules / Weighted sum of passed & failed rules) × 100
 *
 * @param passedRules - Contagem de regras que passaram por severidade
 * @param failedRules - Contagem de regras que falharam por severidade
 */
export function calculateAccessibilityScore(
  passedRules: SeverityBreakdown,
  failedRules: SeverityBreakdown
): ScoreData {
  // Calcular soma ponderada de passed
  const weightedPassed =
    passedRules.critical * PASS_WEIGHTS.critical +
    passedRules.serious * PASS_WEIGHTS.serious +
    passedRules.moderate * PASS_WEIGHTS.moderate +
    passedRules.minor * PASS_WEIGHTS.minor

  // Calcular soma ponderada de failed
  const weightedFailed =
    failedRules.critical * FAIL_WEIGHTS.critical +
    failedRules.serious * FAIL_WEIGHTS.serious +
    failedRules.moderate * FAIL_WEIGHTS.moderate +
    failedRules.minor * FAIL_WEIGHTS.minor

  // Calcular impacto no score por severidade
  const scoreImpact: SeverityBreakdown = {
    critical: failedRules.critical > 0 ? -(failedRules.critical * FAIL_WEIGHTS.critical) : 0,
    serious: failedRules.serious > 0 ? -(failedRules.serious * FAIL_WEIGHTS.serious) : 0,
    moderate: failedRules.moderate > 0 ? -(failedRules.moderate * FAIL_WEIGHTS.moderate) : 0,
    minor: failedRules.minor > 0 ? -(failedRules.minor * FAIL_WEIGHTS.minor) : 0,
  }

  // Calcular score final
  const total = weightedPassed + weightedFailed
  const score = total > 0 ? Math.round((weightedPassed / total) * 100) : 100

  return {
    score,
    passedRules,
    failedRules,
    scoreImpact,
    weightedPassed,
    weightedFailed,
  }
}

/**
 * Calcula passedRules e failedRules a partir de dados de auditoria
 *
 * Como axe-core retorna apenas violacoes, estimamos passed rules
 * baseado no numero total de regras executadas.
 */
export function calculateRulesFromAudit(
  totalRulesRun: number,
  failedByImpact: SeverityBreakdown
): { passedRules: SeverityBreakdown; failedRules: SeverityBreakdown } {
  const totalFailed =
    failedByImpact.critical +
    failedByImpact.serious +
    failedByImpact.moderate +
    failedByImpact.minor

  const totalPassed = Math.max(0, totalRulesRun - totalFailed)

  // Distribuir passed rules proporcionalmente (estimativa)
  // Na pratica, a maioria das regras passam como serious/moderate
  const passedRules: SeverityBreakdown = {
    critical: Math.round(totalPassed * 0.3), // 30% critical rules passed
    serious: Math.round(totalPassed * 0.4),  // 40% serious rules passed
    moderate: Math.round(totalPassed * 0.2), // 20% moderate rules passed
    minor: Math.max(0, totalPassed - Math.round(totalPassed * 0.9)), // resto para minor
  }

  return {
    passedRules,
    failedRules: failedByImpact,
  }
}

/**
 * Obtem o label de status do score
 */
export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excelente'
  if (score >= 70) return 'Bom'
  if (score >= 50) return 'Regular'
  return 'Critico'
}

/**
 * Obtem a cor CSS do score
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500'
  if (score >= 70) return 'text-blue-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}
