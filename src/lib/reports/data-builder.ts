/**
 * Construtor de dados para geracao de relatorios
 * Busca e formata todos os dados necessarios para os templates
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { getRuleLabel } from '@/lib/audit/rule-labels'
import { ABNT_MAP } from '@/lib/audit/abnt-map'
import type { Audit, Project, AggregatedViolation, ImpactLevel } from '@/types'
import type {
  ReportData,
  ReportType,
  ReportMetrics,
  ViolationForReport,
  ElementForReport,
  PrincipleViolations,
  AbntMapping,
  WCAG_PRINCIPLES,
  WCAG_LEVELS,
  IMPACT_LABELS,
} from './types'
import {
  WCAG_PRINCIPLES as PRINCIPLES,
  WCAG_LEVELS as LEVELS,
  IMPACT_LABELS as LABELS,
} from './types'

/**
 * Gera URL para documentacao WCAG de um criterio
 */
function getWcagDocUrl(criteria: string[]): string | null {
  if (!criteria || criteria.length === 0) return null
  // Usar o primeiro criterio - link para W3C Quick Reference
  const criterion = criteria[0]
  return `https://www.w3.org/WAI/WCAG22/quickref/#${criterion.replace(/\./g, '')}`
}

// Regras brasileiras customizadas
const BRAZILIAN_RULES: Record<string, { label: string; description: string }> = {
  'link-texto-generico': {
    label: 'Link com texto generico',
    description: 'Links com textos como "clique aqui", "saiba mais" nao fornecem contexto sobre o destino.',
  },
  'link-nova-aba-sem-aviso': {
    label: 'Link abre nova aba sem aviso',
    description: 'Links com target="_blank" devem avisar o usuario que abrirao em nova janela.',
  },
  'imagem-alt-nome-arquivo': {
    label: 'Alt text parece nome de arquivo',
    description: 'Textos alternativos nao devem ser nomes de arquivo como "IMG_001.jpg".',
  },
  'texto-justificado': {
    label: 'Texto justificado',
    description: 'Texto com alinhamento justificado dificulta a leitura para pessoas com dislexia.',
  },
  'texto-maiusculo-css': {
    label: 'Texto em maiusculas via CSS',
    description: 'Blocos de texto transformados em maiusculas via CSS dificultam a leitura.',
  },
  'br-excessivo-layout': {
    label: 'Multiplos <br> para espacamento',
    description: 'Usar multiplos <br> para espacamento indica uso incorreto de HTML semantico.',
  },
  'atributo-title-redundante': {
    label: 'Atributo title redundante',
    description: 'Atributo title que duplica o texto visivel ou alt nao agrega informacao.',
  },
  'rotulo-ambiguo': {
    label: 'Rotulo ambiguo',
    description: 'Botoes ou links com apenas 1-2 caracteres nao sao descritivos.',
  },
  'fonte-muito-pequena': {
    label: 'Fonte muito pequena',
    description: 'Fonte menor que 12px dificulta a leitura para muitos usuarios.',
  },
  'sem-plugin-libras': {
    label: 'Sem plugin de Libras',
    description: 'Sites brasileiros devem oferecer traducao para Libras (VLibras ou Hand Talk).',
  },
}

/**
 * Busca todos os dados necessarios para gerar um relatorio
 */
export async function buildReportData(
  auditId: string,
  reportType: ReportType
): Promise<ReportData> {
  const supabase = createAdminClient()

  // Buscar auditoria
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('*')
    .eq('id', auditId)
    .single()

  if (auditError || !audit) {
    throw new Error(`Auditoria nao encontrada: ${auditId}`)
  }

  const typedAudit = audit as Audit

  // Buscar projeto
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', typedAudit.project_id)
    .single()

  if (projectError || !project) {
    throw new Error(`Projeto nao encontrado: ${typedAudit.project_id}`)
  }

  const typedProject = project as Project

  // Buscar violacoes agregadas
  const { data: violations, error: violationsError } = await supabase
    .from('aggregated_violations')
    .select('*')
    .eq('audit_id', auditId)
    .order('priority', { ascending: false })

  if (violationsError) {
    throw new Error(`Erro ao buscar violacoes: ${violationsError.message}`)
  }

  const typedViolations = (violations || []) as AggregatedViolation[]

  // Contar paginas com violacoes
  const { count: pagesWithViolations } = await supabase
    .from('audit_pages')
    .select('*', { count: 'exact', head: true })
    .eq('audit_id', auditId)
    .gt('violation_count', 0)

  // Formatar violacoes
  const formattedViolations = formatViolations(typedViolations)

  // Calcular metricas
  const metrics = calculateMetrics(
    typedViolations,
    typedAudit.processed_pages,
    pagesWithViolations || 0,
    typedAudit.wcag_levels
  )

  // Organizar por principio WCAG
  const byPrinciple = organizeByPrinciple(formattedViolations)

  // Mapeamento ABNT
  const abntMappings = typedAudit.include_abnt
    ? buildAbntMappings(typedViolations, typedAudit.wcag_levels)
    : []

  // Regras brasileiras utilizadas
  const brazilianRules = extractBrazilianRules(typedViolations)

  return {
    generatedAt: new Date().toISOString(),
    reportType,
    projectName: typedProject.name,
    projectUrl: typedProject.base_url,
    auditId,
    auditDate: typedAudit.created_at,
    wcagLevels: typedAudit.wcag_levels,
    includeAbnt: typedAudit.include_abnt,
    summary: typedAudit.summary || { critical: 0, serious: 0, moderate: 0, minor: 0, total: 0 },
    metrics,
    violations: formattedViolations,
    byPrinciple,
    abntMappings,
    brazilianRules,
  }
}

/**
 * Formata violacoes agregadas para o relatorio
 */
function formatViolations(violations: AggregatedViolation[]): ViolationForReport[] {
  return violations.map((v) => ({
    id: v.id,
    ruleId: v.rule_id,
    ruleLabel: getRuleLabel(v.rule_id),
    isCustomRule: v.is_custom_rule,
    impact: v.impact,
    impactLabel: LABELS[v.impact],
    wcagLevel: v.wcag_level,
    wcagCriteria: v.wcag_criteria || [],
    abntSection: v.abnt_section,
    help: v.help,
    description: v.description,
    helpUrl: v.help_url,
    wcagDocUrl: getWcagDocUrl(v.wcag_criteria || []),
    occurrences: v.occurrences,
    pageCount: v.page_count,
    affectedPages: v.affected_pages || [],
    sampleHtml: v.sample_html,
    sampleSelector: v.sample_selector,
    aiSuggestion: v.ai_suggestion,
    aiSuggestedHtml: v.ai_suggested_html,
    priority: v.priority,
    // Todos os elementos unicos para CSV expandido
    uniqueElements: (v.unique_elements || []).map((el) => ({
      html: el.html,
      selector: el.selector,
      fullPath: el.fullPath,
      xpath: el.xpath,
      count: el.count,
      pages: el.pages || [],
    })),
  }))
}

/**
 * Calcula metricas para o relatorio
 */
function calculateMetrics(
  violations: AggregatedViolation[],
  pagesAudited: number,
  pagesWithViolations: number,
  wcagLevels: string[]
): ReportMetrics {
  // Total de ocorrencias (nao tipos unicos)
  const totalViolations = violations.reduce((sum, v) => sum + v.occurrences, 0)

  // Contagem por severidade
  const bySeverity = {
    critical: violations.filter((v) => v.impact === 'critical').reduce((sum, v) => sum + v.occurrences, 0),
    serious: violations.filter((v) => v.impact === 'serious').reduce((sum, v) => sum + v.occurrences, 0),
    moderate: violations.filter((v) => v.impact === 'moderate').reduce((sum, v) => sum + v.occurrences, 0),
    minor: violations.filter((v) => v.impact === 'minor').reduce((sum, v) => sum + v.occurrences, 0),
  }

  // Criterios testados baseados nos niveis selecionados
  const testedCriteria = wcagLevels.flatMap((level) => LEVELS[level] || [])

  // Criterios com falha
  const failedCriteria = new Set(violations.flatMap((v) => v.wcag_criteria || []))

  // Compliance: criterios passados / criterios testados
  const passedCriteria = testedCriteria.filter((c) => !failedCriteria.has(c))
  const wcagCompliancePercent =
    testedCriteria.length > 0 ? Math.round((passedCriteria.length / testedCriteria.length) * 100) : 100

  // Por principio WCAG
  const byPrinciple = PRINCIPLES.map((principle) => {
    const principleViolations = violations.filter((v) =>
      (v.wcag_criteria || []).some((c) => c.startsWith(principle.id + '.'))
    )
    return {
      principleId: principle.id,
      principleName: principle.name,
      violationCount: principleViolations.length,
      occurrenceCount: principleViolations.reduce((sum, v) => sum + v.occurrences, 0),
    }
  })

  // Top 5 violacoes por ocorrencias
  const topViolations = formatViolations(
    [...violations].sort((a, b) => b.occurrences - a.occurrences).slice(0, 5)
  )

  return {
    totalViolations,
    uniqueViolationTypes: violations.length,
    pagesAudited,
    pagesWithViolations,
    wcagCompliancePercent,
    bySeverity,
    byPrinciple,
    topViolations,
  }
}

/**
 * Organiza violacoes por principio WCAG
 */
function organizeByPrinciple(violations: ViolationForReport[]): PrincipleViolations[] {
  return PRINCIPLES.map((principle) => {
    const principleViolations = violations.filter((v) =>
      v.wcagCriteria.some((c) => c.startsWith(principle.id + '.'))
    )

    return {
      principle,
      violations: principleViolations,
      totalOccurrences: principleViolations.reduce((sum, v) => sum + v.occurrences, 0),
      uniqueViolations: principleViolations.length,
    }
  })
}

/**
 * Constroi mapeamento WCAG -> ABNT NBR 17060
 */
function buildAbntMappings(
  violations: AggregatedViolation[],
  wcagLevels: string[]
): AbntMapping[] {
  // Todos os criterios testados
  const testedCriteria = wcagLevels.flatMap((level) => LEVELS[level] || [])

  // Criterios com falha e contagem
  const failedCriteria = new Map<string, number>()
  for (const v of violations) {
    for (const criterion of v.wcag_criteria || []) {
      failedCriteria.set(criterion, (failedCriteria.get(criterion) || 0) + v.occurrences)
    }
  }

  // Construir mapeamento
  const mappings: AbntMapping[] = []

  for (const [wcag, abnt] of Object.entries(ABNT_MAP)) {
    const isTested = testedCriteria.includes(wcag)
    const violationCount = failedCriteria.get(wcag) || 0

    mappings.push({
      wcagCriterion: wcag,
      abntSection: abnt,
      status: !isTested ? 'not_tested' : violationCount > 0 ? 'fail' : 'pass',
      violationCount,
    })
  }

  // Ordenar por secao ABNT
  return mappings.sort((a, b) => a.abntSection.localeCompare(b.abntSection))
}

/**
 * Extrai regras brasileiras customizadas utilizadas
 */
function extractBrazilianRules(
  violations: AggregatedViolation[]
): { ruleId: string; label: string; description: string; occurrences: number }[] {
  const customViolations = violations.filter((v) => v.is_custom_rule)

  return customViolations.map((v) => ({
    ruleId: v.rule_id,
    label: BRAZILIAN_RULES[v.rule_id]?.label || getRuleLabel(v.rule_id),
    description: BRAZILIAN_RULES[v.rule_id]?.description || v.description,
    occurrences: v.occurrences,
  }))
}

/**
 * Gera nome do arquivo de relatorio
 */
export function generateReportFileName(
  projectName: string,
  reportType: ReportType,
  date: Date = new Date()
): string {
  const sanitizedName = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const dateStr = date.toISOString().split('T')[0]

  const typeLabels: Record<ReportType, string> = {
    executive_pdf: 'executivo',
    technical_pdf: 'tecnico',
    csv: 'dados',
    json: 'dados',
  }

  const extensions: Record<ReportType, string> = {
    executive_pdf: 'pdf',
    technical_pdf: 'pdf',
    csv: 'csv',
    json: 'json',
  }

  return `relatorio-${typeLabels[reportType]}-${sanitizedName}-${dateStr}.${extensions[reportType]}`
}
