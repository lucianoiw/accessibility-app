/**
 * Avaliador de Conformidade eMAG 3.1
 *
 * Avalia uma auditoria contra as 45 recomendacoes do eMAG,
 * mapeando violacoes detectadas pelo axe-core e regras customizadas.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import type { AggregatedViolation } from '@/types'
import { getRuleLabel } from './rule-labels'
import {
  EMAG_RECOMMENDATIONS,
  EMAG_BY_SECTION,
  EMAG_SECTION_LABELS,
  EMAG_SECTION_DESCRIPTIONS,
  AXE_TO_EMAG,
  CUSTOM_TO_EMAG,
  type EmagRecommendation,
  type EmagSection,
  type EmagStatus,
  type EmagEvaluation,
} from './emag-map'

export interface EmagComplianceReport {
  auditId: string
  projectName: string
  projectUrl: string
  auditDate: string
  generatedAt: string

  // Sumario geral
  summary: {
    totalRecommendations: number
    passed: number
    failed: number
    warnings: number
    notTested: number
    notApplicable: number
    compliancePercent: number
  }

  // Por secao
  sections: {
    section: EmagSection
    label: string
    description: string
    passed: number
    failed: number
    total: number
    evaluations: EmagEvaluation[]
  }[]

  // Detalhes das violacoes por recomendacao
  violationsByRecommendation: Record<
    string,
    {
      recommendation: EmagRecommendation
      violations: {
        ruleId: string
        ruleLabel: string
        occurrences: number
        pages: number
        impact: string
      }[]
    }
  >
}

/**
 * Avalia conformidade eMAG de uma auditoria
 */
export async function evaluateEmagCompliance(
  auditId: string
): Promise<EmagComplianceReport> {
  const supabase = createAdminClient()

  // Buscar dados da auditoria
  const { data: audit } = (await supabase
    .from('audits')
    .select('*, projects(*)')
    .eq('id', auditId)
    .single()) as {
    data: {
      created_at: string
      projects: { name: string; base_url: string } | null
    } | null
  }

  if (!audit) {
    throw new Error('Auditoria nao encontrada')
  }

  // Buscar violacoes agregadas
  const { data: violations } = await supabase
    .from('aggregated_violations')
    .select('*')
    .eq('audit_id', auditId)

  const allViolations = (violations || []) as AggregatedViolation[]

  // Mapear violacoes para recomendacoes eMAG
  const violationsByEmag = mapViolationsToEmag(allViolations)

  // Avaliar cada recomendacao
  const evaluations = EMAG_RECOMMENDATIONS.map((rec) =>
    evaluateRecommendation(rec, violationsByEmag[rec.id] || [])
  )

  // Agrupar por secao
  const sections = Object.entries(EMAG_BY_SECTION).map(([sectionKey, recs]) => {
    const section = sectionKey as EmagSection
    const sectionEvaluations = evaluations.filter(
      (e) => e.recommendation.section === section
    )

    return {
      section,
      label: EMAG_SECTION_LABELS[section],
      description: EMAG_SECTION_DESCRIPTIONS[section],
      passed: sectionEvaluations.filter((e) => e.status === 'pass').length,
      failed: sectionEvaluations.filter((e) => e.status === 'fail').length,
      total: recs.length,
      evaluations: sectionEvaluations,
    }
  })

  // Calcular sumario
  const passed = evaluations.filter((e) => e.status === 'pass').length
  const failed = evaluations.filter((e) => e.status === 'fail').length
  const warnings = evaluations.filter((e) => e.status === 'warning').length
  const notTested = evaluations.filter((e) => e.status === 'not_tested').length
  const notApplicable = evaluations.filter((e) => e.status === 'not_applicable')
    .length

  // Conformidade = passed / (passed + failed) * 100
  const testedCount = passed + failed
  const compliancePercent =
    testedCount > 0 ? Math.round((passed / testedCount) * 100) : 0

  // Preparar detalhes de violacoes por recomendacao
  const violationsByRecommendation: EmagComplianceReport['violationsByRecommendation'] =
    {}

  for (const [emagId, vios] of Object.entries(violationsByEmag)) {
    const rec = EMAG_RECOMMENDATIONS.find((r) => r.id === emagId)
    if (rec && vios.length > 0) {
      violationsByRecommendation[emagId] = {
        recommendation: rec,
        violations: vios.map((v) => ({
          ruleId: v.rule_id,
          ruleLabel: getRuleLabel(v.rule_id),
          occurrences: v.occurrences,
          pages: v.page_count,
          impact: v.impact,
        })),
      }
    }
  }

  return {
    auditId,
    projectName: audit.projects?.name || 'Projeto',
    projectUrl: audit.projects?.base_url || '',
    auditDate: audit.created_at,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRecommendations: EMAG_RECOMMENDATIONS.length,
      passed,
      failed,
      warnings,
      notTested,
      notApplicable,
      compliancePercent,
    },
    sections,
    violationsByRecommendation,
  }
}

/**
 * Mapeia violacoes detectadas para recomendacoes eMAG
 */
function mapViolationsToEmag(
  violations: AggregatedViolation[]
): Record<string, AggregatedViolation[]> {
  const result: Record<string, AggregatedViolation[]> = {}

  for (const v of violations) {
    // Verificar mapeamento axe-core -> eMAG
    const emagFromAxe = AXE_TO_EMAG[v.rule_id] || []

    // Verificar mapeamento regras customizadas -> eMAG
    const emagFromCustom = CUSTOM_TO_EMAG[v.rule_id] || []

    // Combinar mapeamentos
    const emagIds = [...new Set([...emagFromAxe, ...emagFromCustom])]

    for (const emagId of emagIds) {
      if (!result[emagId]) {
        result[emagId] = []
      }
      result[emagId].push(v)
    }
  }

  return result
}

/**
 * Avalia uma recomendacao eMAG individual
 */
function evaluateRecommendation(
  rec: EmagRecommendation,
  violations: AggregatedViolation[]
): EmagEvaluation {
  // Contar violacoes e paginas afetadas
  const totalViolations = violations.reduce((sum, v) => sum + v.occurrences, 0)
  const totalPages = new Set(violations.flatMap((v) => v.affected_pages || []))
    .size

  // Determinar status
  let status: EmagStatus
  let details: string | undefined

  if (rec.checkType === 'manual') {
    // Verificacoes manuais sao marcadas como nao testadas
    status = 'not_tested'
    details = 'Requer verificacao manual'
  } else if (violations.length === 0) {
    // Sem violacoes detectadas
    if (rec.axeRules.length > 0 || rec.customRules.length > 0) {
      // Temos regras automatizadas que podem detectar
      status = 'pass'
      details = 'Nenhuma violacao detectada'
    } else {
      // Nao temos como verificar automaticamente
      status = 'not_tested'
      details = 'Verificacao automatizada nao disponivel'
    }
  } else {
    // Temos violacoes
    const hasCritical = violations.some((v) => v.impact === 'critical')
    const hasSerious = violations.some((v) => v.impact === 'serious')

    if (hasCritical || hasSerious) {
      status = 'fail'
    } else {
      status = 'warning'
    }

    details = `${totalViolations} ocorrencias em ${totalPages} paginas`
  }

  return {
    recommendation: rec,
    status,
    violations: totalViolations,
    pages: totalPages,
    details,
  }
}

/**
 * Gera estatisticas rapidas de conformidade eMAG
 */
export async function getEmagQuickStats(auditId: string): Promise<{
  compliancePercent: number
  passed: number
  failed: number
  total: number
}> {
  const report = await evaluateEmagCompliance(auditId)

  return {
    compliancePercent: report.summary.compliancePercent,
    passed: report.summary.passed,
    failed: report.summary.failed,
    total: report.summary.totalRecommendations,
  }
}
