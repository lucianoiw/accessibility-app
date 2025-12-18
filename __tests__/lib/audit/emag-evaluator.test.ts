import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase admin client before importing
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
    })),
  })),
}))

import { evaluateEmagCompliance, getEmagQuickStats, type EmagComplianceReport } from '@/lib/audit/emag-evaluator'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AggregatedViolation } from '@/types'

const mockedCreateAdminClient = vi.mocked(createAdminClient)

// Helper to create mock violations
function createMockViolation(overrides: Partial<AggregatedViolation> = {}): AggregatedViolation {
  return {
    id: 'vio-1',
    audit_id: 'audit-1',
    rule_id: 'image-alt',
    impact: 'serious',
    description: 'Test violation',
    help: 'Add alt text',
    help_url: 'https://example.com/help',
    occurrences: 5,
    page_count: 2,
    wcag_criteria: ['1.1.1'],
    wcag_level: 'A',
    unique_elements: [],
    affected_pages: ['https://example.com/page1', 'https://example.com/page2'],
    created_at: new Date().toISOString(),
    status: 'open',
    ...overrides,
  }
}

describe('evaluateEmagCompliance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws error when audit is not found', async () => {
    // Mock audit not found
    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null }),
          })),
        })),
      })),
    } as ReturnType<typeof createAdminClient>)

    await expect(evaluateEmagCompliance('nonexistent-audit')).rejects.toThrow(
      'Auditoria nao encontrada'
    )
  })

  it('returns compliance report for audit with no violations', async () => {
    // Mock audit found, no violations
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test Project', base_url: 'https://example.com' },
    }

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report = await evaluateEmagCompliance('audit-1')

    expect(report.auditId).toBe('audit-1')
    expect(report.projectName).toBe('Test Project')
    expect(report.projectUrl).toBe('https://example.com')
    expect(report.summary.totalRecommendations).toBeGreaterThan(0)
    expect(report.sections.length).toBe(6) // 6 eMAG sections
  })

  it('returns compliance report with violations mapped', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test Project', base_url: 'https://example.com' },
    }

    const mockViolations: AggregatedViolation[] = [
      createMockViolation({
        rule_id: 'image-alt', // Maps to eMAG 3.6 (Conteudo)
        impact: 'critical',
        occurrences: 10,
        page_count: 5,
      }),
      createMockViolation({
        rule_id: 'color-contrast', // Maps to eMAG 4.1 (Apresentacao)
        impact: 'serious',
        occurrences: 15,
        page_count: 3,
      }),
    ]

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: mockViolations }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report = await evaluateEmagCompliance('audit-1')

    // Should have some failed recommendations due to violations
    expect(report.summary.failed).toBeGreaterThan(0)
    expect(report.violationsByRecommendation).toBeDefined()
  })

  it('calculates compliance percentage correctly', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test', base_url: 'https://example.com' },
    }

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report = await evaluateEmagCompliance('audit-1')

    // With no violations, passed + not_tested should equal total
    const { passed, failed, warnings, notTested, notApplicable, totalRecommendations } =
      report.summary

    expect(passed + failed + warnings + notTested + notApplicable).toBe(totalRecommendations)

    // Compliance percent should be calculated correctly
    if (passed + failed > 0) {
      const expectedPercent = Math.round((passed / (passed + failed)) * 100)
      expect(report.summary.compliancePercent).toBe(expectedPercent)
    }
  })

  it('groups evaluations by section correctly', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test', base_url: 'https://example.com' },
    }

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report = await evaluateEmagCompliance('audit-1')

    // Check all 6 sections are present
    const sectionNames = report.sections.map((s) => s.section)
    expect(sectionNames).toContain('marcacao')
    expect(sectionNames).toContain('comportamento')
    expect(sectionNames).toContain('conteudo')
    expect(sectionNames).toContain('apresentacao')
    expect(sectionNames).toContain('multimidia')
    expect(sectionNames).toContain('formulario')

    // Each section should have label and description
    for (const section of report.sections) {
      expect(section.label).toBeTruthy()
      expect(section.description).toBeTruthy()
      expect(section.evaluations.length).toBeGreaterThan(0)
    }
  })

  it('handles project without name gracefully', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: null,
    }

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report = await evaluateEmagCompliance('audit-1')

    expect(report.projectName).toBe('Projeto')
    expect(report.projectUrl).toBe('')
  })

  it('marks manual checks as not_tested', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test', base_url: 'https://example.com' },
    }

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report = await evaluateEmagCompliance('audit-1')

    // Manual recommendations should be marked as not_tested
    const manualEvaluations = report.sections
      .flatMap((s) => s.evaluations)
      .filter((e) => e.recommendation.checkType === 'manual')

    for (const evaluation of manualEvaluations) {
      expect(evaluation.status).toBe('not_tested')
      expect(evaluation.details).toContain('manual')
    }
  })

  it('distinguishes between fail and warning based on impact', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test', base_url: 'https://example.com' },
    }

    // Create violations with different impacts
    const mockViolations: AggregatedViolation[] = [
      createMockViolation({
        rule_id: 'image-alt',
        impact: 'critical',
        occurrences: 1,
      }),
    ]

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: mockViolations }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report = await evaluateEmagCompliance('audit-1')

    // Should have at least one failed (critical impact)
    expect(report.summary.failed).toBeGreaterThanOrEqual(1)
  })
})

describe('getEmagQuickStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns quick statistics', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test', base_url: 'https://example.com' },
    }

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const stats = await getEmagQuickStats('audit-1')

    expect(stats).toHaveProperty('compliancePercent')
    expect(stats).toHaveProperty('passed')
    expect(stats).toHaveProperty('failed')
    expect(stats).toHaveProperty('total')

    expect(typeof stats.compliancePercent).toBe('number')
    expect(stats.compliancePercent).toBeGreaterThanOrEqual(0)
    expect(stats.compliancePercent).toBeLessThanOrEqual(100)

    expect(stats.total).toBeGreaterThan(0)
    expect(stats.passed + stats.failed).toBeLessThanOrEqual(stats.total)
  })
})

describe('EmagComplianceReport structure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('has all required fields', async () => {
    const mockAudit = {
      created_at: '2024-01-01T00:00:00Z',
      projects: { name: 'Test', base_url: 'https://example.com' },
    }

    mockedCreateAdminClient.mockReturnValue({
      from: vi.fn((table: string) => {
        if (table === 'audits') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({ data: mockAudit }),
              })),
            })),
          }
        }
        if (table === 'aggregated_violations') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [] }),
            })),
          }
        }
        return {}
      }),
    } as ReturnType<typeof createAdminClient>)

    const report: EmagComplianceReport = await evaluateEmagCompliance('audit-1')

    // Top level fields
    expect(report.auditId).toBe('audit-1')
    expect(report.projectName).toBeTruthy()
    expect(report.projectUrl).toBeDefined()
    expect(report.auditDate).toBeTruthy()
    expect(report.generatedAt).toBeTruthy()

    // Summary fields
    expect(report.summary.totalRecommendations).toBeGreaterThan(0)
    expect(typeof report.summary.passed).toBe('number')
    expect(typeof report.summary.failed).toBe('number')
    expect(typeof report.summary.warnings).toBe('number')
    expect(typeof report.summary.notTested).toBe('number')
    expect(typeof report.summary.notApplicable).toBe('number')
    expect(typeof report.summary.compliancePercent).toBe('number')

    // Sections
    expect(Array.isArray(report.sections)).toBe(true)
    expect(report.sections.length).toBe(6)

    // Violations by recommendation
    expect(typeof report.violationsByRecommendation).toBe('object')
  })
})
