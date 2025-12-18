/**
 * Tipos para o sistema de geracao de relatorios
 */

import type { AggregatedViolation, AuditSummary, ImpactLevel } from '@/types'

// Tipos de relatorio disponiveis
export type ReportType = 'executive_pdf' | 'technical_pdf' | 'csv' | 'json'

// Status do relatorio
export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed'

// Relatorio no banco de dados
export interface Report {
  id: string
  audit_id: string
  type: ReportType
  status: ReportStatus
  file_url: string | null
  file_name: string | null
  file_size: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

// Principios WCAG para organizacao
export interface WcagPrinciple {
  id: string
  name: string
  nameEn: string
  criteria: string[]
}

export const WCAG_PRINCIPLES: WcagPrinciple[] = [
  {
    id: '1',
    name: 'Perceptivel',
    nameEn: 'Perceivable',
    criteria: [
      '1.1.1', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.2.6', '1.2.7', '1.2.8', '1.2.9',
      '1.3.1', '1.3.2', '1.3.3', '1.3.4', '1.3.5', '1.3.6',
      '1.4.1', '1.4.2', '1.4.3', '1.4.4', '1.4.5', '1.4.6', '1.4.7', '1.4.8', '1.4.9', '1.4.10', '1.4.11', '1.4.12', '1.4.13'
    ]
  },
  {
    id: '2',
    name: 'Operavel',
    nameEn: 'Operable',
    criteria: [
      '2.1.1', '2.1.2', '2.1.3', '2.1.4',
      '2.2.1', '2.2.2', '2.2.3', '2.2.4', '2.2.5', '2.2.6',
      '2.3.1', '2.3.2', '2.3.3',
      '2.4.1', '2.4.2', '2.4.3', '2.4.4', '2.4.5', '2.4.6', '2.4.7', '2.4.8', '2.4.9', '2.4.10', '2.4.11', '2.4.12', '2.4.13',
      '2.5.1', '2.5.2', '2.5.3', '2.5.4', '2.5.5', '2.5.6', '2.5.7', '2.5.8'
    ]
  },
  {
    id: '3',
    name: 'Compreensivel',
    nameEn: 'Understandable',
    criteria: [
      '3.1.1', '3.1.2', '3.1.3', '3.1.4', '3.1.5', '3.1.6',
      '3.2.1', '3.2.2', '3.2.3', '3.2.4', '3.2.5', '3.2.6',
      '3.3.1', '3.3.2', '3.3.3', '3.3.4', '3.3.5', '3.3.6', '3.3.7', '3.3.8', '3.3.9'
    ]
  },
  {
    id: '4',
    name: 'Robusto',
    nameEn: 'Robust',
    criteria: ['4.1.1', '4.1.2', '4.1.3']
  }
]

// Criterios por nivel WCAG
export const WCAG_LEVELS: Record<string, string[]> = {
  A: [
    '1.1.1', '1.2.1', '1.2.2', '1.2.3', '1.3.1', '1.3.2', '1.3.3', '1.4.1', '1.4.2',
    '2.1.1', '2.1.2', '2.1.4', '2.2.1', '2.2.2', '2.3.1', '2.4.1', '2.4.2', '2.4.3', '2.4.4',
    '2.5.1', '2.5.2', '2.5.3', '2.5.4',
    '3.1.1', '3.2.1', '3.2.2', '3.3.1', '3.3.2',
    '4.1.1', '4.1.2'
  ],
  AA: [
    '1.2.4', '1.2.5', '1.3.4', '1.3.5', '1.4.3', '1.4.4', '1.4.5', '1.4.10', '1.4.11', '1.4.12', '1.4.13',
    '2.4.5', '2.4.6', '2.4.7', '2.4.11', '2.5.7', '2.5.8',
    '3.1.2', '3.2.3', '3.2.4', '3.3.3', '3.3.4', '3.3.7', '3.3.8',
    '4.1.3'
  ],
  AAA: [
    '1.2.6', '1.2.7', '1.2.8', '1.2.9', '1.3.6', '1.4.6', '1.4.7', '1.4.8', '1.4.9',
    '2.1.3', '2.2.3', '2.2.4', '2.2.5', '2.2.6', '2.3.2', '2.3.3',
    '2.4.8', '2.4.9', '2.4.10', '2.4.12', '2.4.13', '2.5.5', '2.5.6',
    '3.1.3', '3.1.4', '3.1.5', '3.1.6', '3.2.5', '3.3.5', '3.3.6', '3.3.9'
  ]
}

// Elemento unico para CSV expandido
export interface ElementForReport {
  html: string
  selector: string
  fullPath: string | null
  xpath: string | null
  count: number
  pages: string[]
}

// Violacao formatada para relatorio
export interface ViolationForReport {
  id: string
  ruleId: string
  ruleLabel: string
  isCustomRule: boolean
  impact: ImpactLevel
  impactLabel: string
  wcagLevel: string | null
  wcagCriteria: string[]
  abntSection: string | null
  help: string
  description: string
  helpUrl: string | null
  wcagDocUrl: string | null  // Link para documentacao WCAG
  occurrences: number
  pageCount: number
  affectedPages: string[]
  sampleHtml: string
  sampleSelector: string
  aiSuggestion: string | null
  aiSuggestedHtml: string | null
  priority: number
  // Todos os elementos unicos (para CSV expandido)
  uniqueElements: ElementForReport[]
}

// Dados de violacoes por principio WCAG
export interface PrincipleViolations {
  principle: WcagPrinciple
  violations: ViolationForReport[]
  totalOccurrences: number
  uniqueViolations: number
}

// Metricas calculadas para o relatorio
export interface ReportMetrics {
  totalViolations: number
  uniqueViolationTypes: number
  pagesAudited: number
  pagesWithViolations: number
  wcagCompliancePercent: number
  bySeverity: {
    critical: number
    serious: number
    moderate: number
    minor: number
  }
  byPrinciple: {
    principleId: string
    principleName: string
    violationCount: number
    occurrenceCount: number
  }[]
  topViolations: ViolationForReport[]
}

// Mapeamento ABNT para relatorio
export interface AbntMapping {
  wcagCriterion: string
  abntSection: string
  status: 'pass' | 'fail' | 'not_tested'
  violationCount: number
}

// Dados completos para geracao do relatorio
export interface ReportData {
  // Metadata
  generatedAt: string
  reportType: ReportType

  // Projeto e Auditoria
  projectName: string
  projectUrl: string
  auditId: string
  auditDate: string
  wcagLevels: string[]
  includeAbnt: boolean

  // Summary original da auditoria
  summary: AuditSummary

  // Metricas calculadas
  metrics: ReportMetrics

  // Violacoes formatadas
  violations: ViolationForReport[]

  // Organizacao por principio WCAG
  byPrinciple: PrincipleViolations[]

  // Mapeamento ABNT (se includeAbnt)
  abntMappings: AbntMapping[]

  // Regras brasileiras customizadas usadas
  brazilianRules: {
    ruleId: string
    label: string
    description: string
    occurrences: number
  }[]
}

// Payload para iniciar geracao de relatorio
export interface GenerateReportPayload {
  auditId: string
  type: ReportType
}

// Resposta da API de geracao
export interface GenerateReportResponse {
  reportId: string
  status: ReportStatus
}

// Labels de impacto em portugues
export const IMPACT_LABELS: Record<ImpactLevel, string> = {
  critical: 'Critico',
  serious: 'Serio',
  moderate: 'Moderado',
  minor: 'Menor'
}

// Cores de impacto para PDF
export const IMPACT_COLORS: Record<ImpactLevel, { bg: string; text: string; border: string }> = {
  critical: { bg: '#FEE2E2', text: '#991B1B', border: '#EF4444' },
  serious: { bg: '#FFEDD5', text: '#9A3412', border: '#F97316' },
  moderate: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  minor: { bg: '#DBEAFE', text: '#1E40AF', border: '#3B82F6' }
}
