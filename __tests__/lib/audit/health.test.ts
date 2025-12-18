import { describe, it, expect } from 'vitest'
import {
  calculateHealthScore,
  getHealthLabel,
  getHealthColor,
  getGuidanceMessage,
  getPriorityBgColor,
  getPriorityTextColor,
  getProgressColorClass,
  calculateDashboardSummary,
  calculateWcagPrincipleBreakdown,
  calculateWcagConformance,
  calculateEmagConformance,
  SEVERITY_WEIGHTS,
  WCAG_CRITERIA_COUNTS,
  EMAG_TOTAL_RECOMMENDATIONS,
} from '@/lib/audit/health'
import type { Audit, AggregatedViolation } from '@/types'

// ============================================
// TEST FACTORIES
// ============================================

function createAudit(overrides: Partial<Audit> = {}): Audit {
  return {
    id: 'audit-123',
    project_id: 'project-123',
    status: 'COMPLETED',
    max_pages: 50,
    wcag_levels: ['A', 'AA'],
    include_abnt: true,
    include_emag: true,
    include_coga: false,
    total_pages: 10,
    processed_pages: 10,
    failed_pages: 0,
    broken_pages_count: 0,
    crawl_iterations: 2,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    summary: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function createViolation(overrides: Partial<AggregatedViolation> = {}): AggregatedViolation {
  return {
    id: 'violation-1',
    audit_id: 'audit-123',
    rule_id: 'color-contrast',
    is_custom_rule: false,
    fingerprint: 'fp-123',
    impact: 'serious',
    wcag_level: 'AA',
    wcag_version: '2.2',
    wcag_criteria: ['1.4.3'],
    abnt_section: null,
    emag_recommendations: ['3.3'],
    help: 'Elements must have sufficient color contrast',
    description: 'Ensures the contrast between foreground and background colors...',
    help_url: 'https://dequeuniversity.com/rules/axe/4.0/color-contrast',
    occurrences: 5,
    page_count: 3,
    affected_pages: ['https://example.com/page1', 'https://example.com/page2'],
    sample_selector: '.text-gray',
    sample_html: '<p class="text-gray">Low contrast text</p>',
    sample_parent_html: null,
    sample_page_url: 'https://example.com/page1',
    ai_suggestion: null,
    ai_suggested_html: null,
    ai_generated_at: null,
    priority: 80,
    unique_elements: [],
    status: 'open',
    last_verified_at: null,
    verification_result: null,
    resolution_notes: null,
    resolved_by: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================
// CONSTANTS TESTS
// ============================================

describe('Constants', () => {
  it('has correct severity weights', () => {
    expect(SEVERITY_WEIGHTS).toEqual({
      critical: 10,
      serious: 5,
      moderate: 2,
      minor: 1,
    })
  })

  it('has correct WCAG criteria counts', () => {
    expect(WCAG_CRITERIA_COUNTS).toEqual({
      A: 25,
      AA: 13,
      AAA: 10,
    })
  })

  it('has correct eMAG total recommendations', () => {
    expect(EMAG_TOTAL_RECOMMENDATIONS).toBe(45)
  })
})

// ============================================
// calculateHealthScore
// ============================================

describe('calculateHealthScore', () => {
  it('returns 100 when summary is null', () => {
    const audit = createAudit({ summary: null })
    expect(calculateHealthScore(audit)).toBe(100)
  })

  it('returns 100 when total violations is 0', () => {
    const audit = createAudit({
      summary: { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
    })
    expect(calculateHealthScore(audit)).toBe(100)
  })

  it('returns 0 when all violations are critical', () => {
    const audit = createAudit({
      summary: { total: 10, critical: 10, serious: 0, moderate: 0, minor: 0 },
    })
    expect(calculateHealthScore(audit)).toBe(0)
  })

  it('returns 90 when all violations are minor', () => {
    // 10 minor violations: penalty = 10 * 1 = 10
    // maxPenalty = 10 * 10 = 100
    // health = 100 - (10/100 * 100) = 90
    const audit = createAudit({
      summary: { total: 10, critical: 0, serious: 0, moderate: 0, minor: 10 },
    })
    expect(calculateHealthScore(audit)).toBe(90)
  })

  it('calculates correct score for mixed severities', () => {
    // 2 critical + 3 serious + 3 moderate + 2 minor = 10 total
    // penalty = 2*10 + 3*5 + 3*2 + 2*1 = 20 + 15 + 6 + 2 = 43
    // maxPenalty = 10 * 10 = 100
    // health = 100 - (43/100 * 100) = 57
    const audit = createAudit({
      summary: { total: 10, critical: 2, serious: 3, moderate: 3, minor: 2 },
    })
    expect(calculateHealthScore(audit)).toBe(57)
  })

  it('penalizes critical violations more than others', () => {
    const auditCritical = createAudit({
      summary: { total: 1, critical: 1, serious: 0, moderate: 0, minor: 0 },
    })
    const auditSerious = createAudit({
      summary: { total: 1, critical: 0, serious: 1, moderate: 0, minor: 0 },
    })
    const auditMinor = createAudit({
      summary: { total: 1, critical: 0, serious: 0, moderate: 0, minor: 1 },
    })

    const scoreCritical = calculateHealthScore(auditCritical)
    const scoreSerious = calculateHealthScore(auditSerious)
    const scoreMinor = calculateHealthScore(auditMinor)

    expect(scoreCritical).toBeLessThan(scoreSerious)
    expect(scoreSerious).toBeLessThan(scoreMinor)
  })

  it('handles edge case with very large numbers', () => {
    const audit = createAudit({
      summary: { total: 1000, critical: 500, serious: 300, moderate: 150, minor: 50 },
    })
    const score = calculateHealthScore(audit)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

// ============================================
// getHealthLabel
// ============================================

describe('getHealthLabel', () => {
  it('returns Excelente for scores >= 90', () => {
    expect(getHealthLabel(90)).toBe('Excelente')
    expect(getHealthLabel(95)).toBe('Excelente')
    expect(getHealthLabel(100)).toBe('Excelente')
  })

  it('returns Bom for scores 70-89', () => {
    expect(getHealthLabel(70)).toBe('Bom')
    expect(getHealthLabel(80)).toBe('Bom')
    expect(getHealthLabel(89)).toBe('Bom')
  })

  it('returns Regular for scores 50-69', () => {
    expect(getHealthLabel(50)).toBe('Regular')
    expect(getHealthLabel(60)).toBe('Regular')
    expect(getHealthLabel(69)).toBe('Regular')
  })

  it('returns Critico for scores < 50', () => {
    expect(getHealthLabel(0)).toBe('Critico')
    expect(getHealthLabel(25)).toBe('Critico')
    expect(getHealthLabel(49)).toBe('Critico')
  })

  it('handles boundary values correctly', () => {
    expect(getHealthLabel(89.9)).toBe('Bom')
    expect(getHealthLabel(69.9)).toBe('Regular')
    expect(getHealthLabel(49.9)).toBe('Critico')
  })
})

// ============================================
// getHealthColor
// ============================================

describe('getHealthColor', () => {
  it('returns green for scores >= 90', () => {
    expect(getHealthColor(90)).toBe('text-green-500')
    expect(getHealthColor(100)).toBe('text-green-500')
  })

  it('returns yellow for scores 70-89', () => {
    expect(getHealthColor(70)).toBe('text-yellow-500')
    expect(getHealthColor(89)).toBe('text-yellow-500')
  })

  it('returns orange for scores 50-69', () => {
    expect(getHealthColor(50)).toBe('text-orange-500')
    expect(getHealthColor(69)).toBe('text-orange-500')
  })

  it('returns red for scores < 50', () => {
    expect(getHealthColor(0)).toBe('text-red-500')
    expect(getHealthColor(49)).toBe('text-red-500')
  })
})

// ============================================
// getGuidanceMessage
// ============================================

describe('getGuidanceMessage', () => {
  it('returns success message when summary is null', () => {
    const audit = createAudit({ summary: null })
    const message = getGuidanceMessage(audit)

    expect(message.title).toBe('Parabens!')
    expect(message.priority).toBe('success')
  })

  it('returns success message when total is 0', () => {
    const audit = createAudit({
      summary: { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
    })
    const message = getGuidanceMessage(audit)

    expect(message.title).toBe('Parabens!')
    expect(message.priority).toBe('success')
  })

  it('prioritizes critical violations', () => {
    const audit = createAudit({
      summary: { total: 10, critical: 2, serious: 3, moderate: 3, minor: 2 },
    })
    const message = getGuidanceMessage(audit)

    expect(message.priority).toBe('critical')
    expect(message.title).toContain('Criticos')
    expect(message.message).toContain('2')
  })

  it('prioritizes serious when no critical', () => {
    const audit = createAudit({
      summary: { total: 8, critical: 0, serious: 3, moderate: 3, minor: 2 },
    })
    const message = getGuidanceMessage(audit)

    expect(message.priority).toBe('serious')
    expect(message.title).toContain('Serios')
    expect(message.message).toContain('3')
  })

  it('prioritizes moderate when no critical/serious', () => {
    const audit = createAudit({
      summary: { total: 5, critical: 0, serious: 0, moderate: 3, minor: 2 },
    })
    const message = getGuidanceMessage(audit)

    expect(message.priority).toBe('moderate')
    expect(message.title).toContain('Quase la!')
    expect(message.message).toContain('3')
  })

  it('returns minor message when only minor issues', () => {
    const audit = createAudit({
      summary: { total: 2, critical: 0, serious: 0, moderate: 0, minor: 2 },
    })
    const message = getGuidanceMessage(audit)

    expect(message.priority).toBe('minor')
    expect(message.title).toContain('Ultimos ajustes')
    expect(message.message).toContain('2')
  })
})

// ============================================
// getPriorityBgColor
// ============================================

describe('getPriorityBgColor', () => {
  it('returns correct colors for all priorities', () => {
    expect(getPriorityBgColor('critical')).toContain('bg-red')
    expect(getPriorityBgColor('serious')).toContain('bg-orange')
    expect(getPriorityBgColor('moderate')).toContain('bg-yellow')
    expect(getPriorityBgColor('minor')).toContain('bg-blue')
    expect(getPriorityBgColor('success')).toContain('bg-green')
  })

  it('returns gray for unknown priority', () => {
    // @ts-expect-error Testing invalid input
    expect(getPriorityBgColor('unknown')).toContain('bg-gray')
  })
})

// ============================================
// getPriorityTextColor
// ============================================

describe('getPriorityTextColor', () => {
  it('returns correct text colors for all priorities', () => {
    expect(getPriorityTextColor('critical')).toContain('text-red')
    expect(getPriorityTextColor('serious')).toContain('text-orange')
    expect(getPriorityTextColor('moderate')).toContain('text-yellow')
    expect(getPriorityTextColor('minor')).toContain('text-blue')
    expect(getPriorityTextColor('success')).toContain('text-green')
  })

  it('returns gray for unknown priority', () => {
    // @ts-expect-error Testing invalid input
    expect(getPriorityTextColor('unknown')).toContain('text-gray')
  })
})

// ============================================
// getProgressColorClass
// ============================================

describe('getProgressColorClass', () => {
  it('returns green for progress >= 90%', () => {
    expect(getProgressColorClass(90)).toContain('bg-green')
    expect(getProgressColorClass(100)).toContain('bg-green')
  })

  it('returns yellow for progress 70-89%', () => {
    expect(getProgressColorClass(70)).toContain('bg-yellow')
    expect(getProgressColorClass(89)).toContain('bg-yellow')
  })

  it('returns red for progress < 70%', () => {
    expect(getProgressColorClass(0)).toContain('bg-red')
    expect(getProgressColorClass(69)).toContain('bg-red')
  })
})

// ============================================
// calculateDashboardSummary
// ============================================

describe('calculateDashboardSummary', () => {
  it('returns correct summary with violations', () => {
    const audit = createAudit({
      summary: { total: 20, critical: 5, serious: 8, moderate: 4, minor: 3 },
    })
    const violations: AggregatedViolation[] = [
      createViolation({ id: 'v1', impact: 'critical' }),
      createViolation({ id: 'v2', impact: 'critical' }),
      createViolation({ id: 'v3', impact: 'serious' }),
      createViolation({ id: 'v4', impact: 'serious' }),
      createViolation({ id: 'v5', impact: 'serious' }),
      createViolation({ id: 'v6', impact: 'moderate' }),
      createViolation({ id: 'v7', impact: 'minor' }),
    ]

    const summary = calculateDashboardSummary(audit, violations)

    expect(summary.total.count).toBe(20)
    expect(summary.total.uniqueTypes).toBe(7)
    expect(summary.critical.count).toBe(5)
    expect(summary.critical.uniqueTypes).toBe(2)
    expect(summary.serious.count).toBe(8)
    expect(summary.serious.uniqueTypes).toBe(3)
    expect(summary.moderate.count).toBe(4)
    expect(summary.moderate.uniqueTypes).toBe(1)
    expect(summary.minor.count).toBe(3)
    expect(summary.minor.uniqueTypes).toBe(1)
  })

  it('handles null summary', () => {
    const audit = createAudit({ summary: null })
    const summary = calculateDashboardSummary(audit, [])

    expect(summary.total.count).toBe(0)
    expect(summary.total.uniqueTypes).toBe(0)
  })

  it('handles empty violations array', () => {
    const audit = createAudit({
      summary: { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
    })
    const summary = calculateDashboardSummary(audit, [])

    expect(summary.total.uniqueTypes).toBe(0)
    expect(summary.critical.uniqueTypes).toBe(0)
  })
})

// ============================================
// calculateWcagPrincipleBreakdown
// ============================================

describe('calculateWcagPrincipleBreakdown', () => {
  it('correctly categorizes WCAG criteria by principle', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ wcag_criteria: ['1.1.1', '1.4.3'] }), // Perceivable
      createViolation({ wcag_criteria: ['2.1.1', '2.4.4'] }), // Operable
      createViolation({ wcag_criteria: ['3.1.1'] }), // Understandable
      createViolation({ wcag_criteria: ['4.1.1', '4.1.2'] }), // Robust
    ]

    const breakdown = calculateWcagPrincipleBreakdown(violations)

    expect(breakdown.perceivable).toBe(2)
    expect(breakdown.operable).toBe(2)
    expect(breakdown.understandable).toBe(1)
    expect(breakdown.robust).toBe(2)
  })

  it('deduplicates repeated criteria', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ wcag_criteria: ['1.1.1'] }),
      createViolation({ wcag_criteria: ['1.1.1'] }), // Same criteria
      createViolation({ wcag_criteria: ['1.1.1', '1.4.3'] }),
    ]

    const breakdown = calculateWcagPrincipleBreakdown(violations)

    expect(breakdown.perceivable).toBe(2) // 1.1.1 and 1.4.3
  })

  it('handles empty array', () => {
    const breakdown = calculateWcagPrincipleBreakdown([])

    expect(breakdown.perceivable).toBe(0)
    expect(breakdown.operable).toBe(0)
    expect(breakdown.understandable).toBe(0)
    expect(breakdown.robust).toBe(0)
  })

  it('handles violations with null/undefined wcag_criteria', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ wcag_criteria: null as unknown as string[] }),
      createViolation({ wcag_criteria: undefined as unknown as string[] }),
      createViolation({ wcag_criteria: ['1.1.1'] }),
    ]

    const breakdown = calculateWcagPrincipleBreakdown(violations)

    expect(breakdown.perceivable).toBe(1)
  })

  it('handles invalid criteria format', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ wcag_criteria: ['invalid', 'not-a-criteria'] }),
      createViolation({ wcag_criteria: ['1.1.1'] }),
    ]

    const breakdown = calculateWcagPrincipleBreakdown(violations)

    expect(breakdown.perceivable).toBe(1)
  })
})

// ============================================
// calculateWcagConformance
// ============================================

describe('calculateWcagConformance', () => {
  it('returns 100% conformance with no violations', () => {
    const result = calculateWcagConformance([], ['A', 'AA'])

    expect(result.conformancePercent).toBe(100)
    expect(result.affectedCriteria).toBe(0)
    expect(result.totalCriteria).toBe(38) // 25 + 13
  })

  it('calculates correct conformance with violations', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ wcag_criteria: ['1.1.1'] }),
      createViolation({ wcag_criteria: ['1.4.3'] }),
      createViolation({ wcag_criteria: ['2.1.1'] }),
    ]

    const result = calculateWcagConformance(violations, ['A', 'AA'])

    expect(result.affectedCriteria).toBe(3)
    expect(result.totalCriteria).toBe(38)
    // (38 - 3) / 38 * 100 = 92.1% -> 92
    expect(result.conformancePercent).toBe(92)
  })

  it('includes AAA criteria when specified', () => {
    const result = calculateWcagConformance([], ['A', 'AA', 'AAA'])

    expect(result.totalCriteria).toBe(48) // 25 + 13 + 10
  })

  it('handles invalid WCAG levels', () => {
    const result = calculateWcagConformance([], ['INVALID', 'AAAA'])

    expect(result.conformancePercent).toBe(100)
    expect(result.totalCriteria).toBe(0)
  })

  it('normalizes level case', () => {
    const result = calculateWcagConformance([], ['a', 'aa'])

    expect(result.totalCriteria).toBe(38) // Works with lowercase
  })

  it('deduplicates affected criteria', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ wcag_criteria: ['1.1.1'] }),
      createViolation({ wcag_criteria: ['1.1.1', '1.4.3'] }), // 1.1.1 duplicated
    ]

    const result = calculateWcagConformance(violations, ['A', 'AA'])

    expect(result.affectedCriteria).toBe(2) // Only 1.1.1 and 1.4.3
  })

  it('includes byPrinciple breakdown', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ wcag_criteria: ['1.1.1'] }),
      createViolation({ wcag_criteria: ['2.1.1'] }),
    ]

    const result = calculateWcagConformance(violations, ['A', 'AA'])

    expect(result.byPrinciple).toBeDefined()
    expect(result.byPrinciple.perceivable).toBe(1)
    expect(result.byPrinciple.operable).toBe(1)
  })
})

// ============================================
// calculateEmagConformance
// ============================================

describe('calculateEmagConformance', () => {
  it('returns 100% conformance with no violations', () => {
    const result = calculateEmagConformance([])

    expect(result.conformancePercent).toBe(100)
    expect(result.affectedRecommendations).toBe(0)
    expect(result.totalRecommendations).toBe(45)
  })

  it('calculates correct conformance with violations', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ emag_recommendations: ['1.1', '1.2'] }),
      createViolation({ emag_recommendations: ['2.1'] }),
      createViolation({ emag_recommendations: ['3.1', '3.2', '3.3'] }),
    ]

    const result = calculateEmagConformance(violations)

    expect(result.affectedRecommendations).toBe(6)
    // (45 - 6) / 45 * 100 = 86.67% -> 87
    expect(result.conformancePercent).toBe(87)
  })

  it('deduplicates affected recommendations', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ emag_recommendations: ['1.1', '1.2'] }),
      createViolation({ emag_recommendations: ['1.1', '2.1'] }), // 1.1 duplicated
    ]

    const result = calculateEmagConformance(violations)

    expect(result.affectedRecommendations).toBe(3) // 1.1, 1.2, 2.1
  })

  it('handles violations with null/undefined emag_recommendations', () => {
    const violations: AggregatedViolation[] = [
      createViolation({ emag_recommendations: null as unknown as string[] }),
      createViolation({ emag_recommendations: undefined as unknown as string[] }),
      createViolation({ emag_recommendations: ['1.1'] }),
    ]

    const result = calculateEmagConformance(violations)

    expect(result.affectedRecommendations).toBe(1)
  })

  it('handles all recommendations affected', () => {
    const allRecs = Array.from({ length: 45 }, (_, i) => `${i + 1}.1`)
    const violations: AggregatedViolation[] = [
      createViolation({ emag_recommendations: allRecs }),
    ]

    const result = calculateEmagConformance(violations)

    expect(result.affectedRecommendations).toBe(45)
    expect(result.conformancePercent).toBe(0)
  })
})
