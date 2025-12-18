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
 * Converte dados de audit pages e broken pages em ScanLogEntries
 */
export function createScanLogEntries(
  auditDate: Date,
  auditedPages: Array<{ url: string; violation_count: number }>,
  brokenPages: BrokenPage[],
  baseScore: number
): ScanLogEntry[] {
  const entries: ScanLogEntry[] = []

  // Adicionar paginas auditadas com sucesso
  for (const page of auditedPages) {
    entries.push({
      id: `success-${page.url}`,
      date: auditDate,
      url: page.url,
      status: 'success',
      description: `Scan complete, ${page.violation_count} issues found`,
      issueCount: page.violation_count,
      score: baseScore,
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
