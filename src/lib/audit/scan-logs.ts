/**
 * Scan Logs Utilities
 *
 * Funcoes para criar entradas de log de scan a partir de dados de auditoria.
 */

import type { BrokenPage } from '@/types'

export interface ScanLogEntry {
  id: string
  date: Date
  url: string
  status: 'success' | 'failure' | 'redirect'
  description: string
  issueCount?: number
  score?: number
  errorType?: string
  errorDetails?: string
}

/**
 * Calcula score individual por página baseado na proporção de violações
 * Páginas com 0 violações = 100 (perfeito)
 * Páginas com mais violações = score proporcional entre baseScore e 100
 */
function calculatePageScore(
  violationCount: number,
  maxViolations: number,
  baseScore: number
): number {
  if (violationCount === 0) return 100
  if (maxViolations === 0) return baseScore

  // Interpolar entre 100 (sem violações) e baseScore (máximo de violações)
  const ratio = violationCount / maxViolations
  return Math.round(100 - (100 - baseScore) * ratio)
}

/**
 * Converte dados de audit pages e broken pages em ScanLogEntries
 */
export function createScanLogEntries(
  auditDate: Date,
  auditedPages: Array<{ url: string; violation_count: number }>,
  brokenPages: BrokenPage[],
  baseScore: number
): ScanLogEntry[] {
  const entries: ScanLogEntry[] = []

  // Calcular máximo de violações para normalização do score por página
  const maxViolations = auditedPages.reduce(
    (max, page) => Math.max(max, page.violation_count),
    0
  )

  // Adicionar paginas auditadas com sucesso
  for (const page of auditedPages) {
    entries.push({
      id: `success-${page.url}`,
      date: auditDate,
      url: page.url,
      status: 'success',
      description: `Scan complete, ${page.violation_count} issues found`,
      issueCount: page.violation_count,
      score: calculatePageScore(page.violation_count, maxViolations, baseScore),
    })
  }

  // Adicionar paginas quebradas
  for (const bp of brokenPages) {
    entries.push({
      id: `failure-${bp.url}`,
      date: auditDate,
      url: bp.url,
      status: 'failure',
      description: bp.error_message || `${bp.error_type} error`,
      errorType: bp.error_type,
      errorDetails: bp.error_message ?? undefined,
    })
  }

  // Ordenar por data (mais recente primeiro)
  return entries.sort((a, b) => b.date.getTime() - a.date.getTime())
}
