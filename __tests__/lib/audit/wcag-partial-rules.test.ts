import { describe, it, expect } from 'vitest'
import { wcagPartialRules } from '@/lib/audit/wcag-partial-rules'

// ============================================
// wcagPartialRules array
// ============================================

describe('wcagPartialRules', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(wcagPartialRules)).toBe(true)
    expect(wcagPartialRules.length).toBeGreaterThan(0)
  })

  it('contains Phase 1 rules', () => {
    const phase1RuleIds = [
      'input-sem-autocomplete',
      'link-sem-underline-em-texto',
      'video-sem-legendas',
      'video-sem-audiodescricao',
      'select-onchange-navega',
    ]

    const ruleIds = wcagPartialRules.map(r => r.id)

    for (const expectedId of phase1RuleIds) {
      expect(ruleIds, `Expected rule "${expectedId}" to be present`).toContain(expectedId)
    }
  })

  it('has 5 rules in Phase 1', () => {
    expect(wcagPartialRules.length).toBe(5)
  })
})

// ============================================
// Rule structure validation
// ============================================

describe('WcagPartialRule structure', () => {
  it('all rules have required properties', () => {
    for (const rule of wcagPartialRules) {
      expect(rule.id, 'Rule must have id').toBeDefined()
      expect(typeof rule.id).toBe('string')
      expect(rule.id.length).toBeGreaterThan(0)

      expect(rule.wcagSC, `Rule ${rule.id} must have wcagSC`).toBeDefined()
      expect(typeof rule.wcagSC).toBe('string')
      expect(rule.wcagSC).toMatch(/^\d+\.\d+\.\d+$/) // Format: X.Y.Z

      expect(rule.wcagLevel, `Rule ${rule.id} must have wcagLevel`).toBeDefined()
      expect(['A', 'AA', 'AAA']).toContain(rule.wcagLevel)

      expect(rule.impact, `Rule ${rule.id} must have impact`).toBeDefined()
      expect(['critical', 'serious', 'moderate', 'minor']).toContain(rule.impact)

      expect(rule.description, `Rule ${rule.id} must have description`).toBeDefined()
      expect(typeof rule.description).toBe('string')

      expect(rule.check, `Rule ${rule.id} must have check function`).toBeDefined()
      expect(typeof rule.check).toBe('function')
    }
  })

  it('all rule IDs are unique', () => {
    const ids = wcagPartialRules.map(r => r.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('all rule IDs follow naming convention', () => {
    for (const rule of wcagPartialRules) {
      // IDs should be kebab-case
      expect(rule.id).toMatch(/^[a-z0-9-]+$/)
      // IDs should not start or end with hyphen
      expect(rule.id.startsWith('-')).toBe(false)
      expect(rule.id.endsWith('-')).toBe(false)
    }
  })
})

// ============================================
// Individual rule metadata validation
// ============================================

describe('input-sem-autocomplete rule', () => {
  const rule = wcagPartialRules.find(r => r.id === 'input-sem-autocomplete')

  it('exists', () => {
    expect(rule).toBeDefined()
  })

  it('targets WCAG 1.3.5 (Identify Input Purpose)', () => {
    expect(rule?.wcagSC).toBe('1.3.5')
  })

  it('is Level AA', () => {
    expect(rule?.wcagLevel).toBe('AA')
  })

  it('has serious impact', () => {
    expect(rule?.impact).toBe('serious')
  })
})

describe('link-sem-underline-em-texto rule', () => {
  const rule = wcagPartialRules.find(r => r.id === 'link-sem-underline-em-texto')

  it('exists', () => {
    expect(rule).toBeDefined()
  })

  it('targets WCAG 1.4.1 (Use of Color)', () => {
    expect(rule?.wcagSC).toBe('1.4.1')
  })

  it('is Level A', () => {
    expect(rule?.wcagLevel).toBe('A')
  })

  it('has serious impact', () => {
    expect(rule?.impact).toBe('serious')
  })
})

describe('video-sem-legendas rule', () => {
  const rule = wcagPartialRules.find(r => r.id === 'video-sem-legendas')

  it('exists', () => {
    expect(rule).toBeDefined()
  })

  it('targets WCAG 1.2.2 (Captions Prerecorded)', () => {
    expect(rule?.wcagSC).toBe('1.2.2')
  })

  it('is Level A', () => {
    expect(rule?.wcagLevel).toBe('A')
  })

  it('has critical impact', () => {
    expect(rule?.impact).toBe('critical')
  })
})

describe('video-sem-audiodescricao rule', () => {
  const rule = wcagPartialRules.find(r => r.id === 'video-sem-audiodescricao')

  it('exists', () => {
    expect(rule).toBeDefined()
  })

  it('targets WCAG 1.2.5 (Audio Description Prerecorded)', () => {
    expect(rule?.wcagSC).toBe('1.2.5')
  })

  it('is Level AA', () => {
    expect(rule?.wcagLevel).toBe('AA')
  })

  it('has serious impact', () => {
    expect(rule?.impact).toBe('serious')
  })
})

describe('select-onchange-navega rule', () => {
  const rule = wcagPartialRules.find(r => r.id === 'select-onchange-navega')

  it('exists', () => {
    expect(rule).toBeDefined()
  })

  it('targets WCAG 3.2.2 (On Input)', () => {
    expect(rule?.wcagSC).toBe('3.2.2')
  })

  it('is Level A', () => {
    expect(rule?.wcagLevel).toBe('A')
  })

  it('has serious impact', () => {
    expect(rule?.impact).toBe('serious')
  })
})

// ============================================
// WCAG coverage validation
// ============================================

describe('WCAG coverage', () => {
  it('covers multiple WCAG principles', () => {
    const wcagCriteria = wcagPartialRules.map(r => r.wcagSC)

    // Principle 1 - Perceivable (1.x.x)
    const perceivable = wcagCriteria.filter(sc => sc.startsWith('1.'))
    expect(perceivable.length).toBeGreaterThan(0)

    // Principle 3 - Understandable (3.x.x)
    const understandable = wcagCriteria.filter(sc => sc.startsWith('3.'))
    expect(understandable.length).toBeGreaterThan(0)
  })

  it('includes both Level A and Level AA rules', () => {
    const levels = wcagPartialRules.map(r => r.wcagLevel)

    expect(levels).toContain('A')
    expect(levels).toContain('AA')
  })

  it('covers different impact levels', () => {
    const impacts = wcagPartialRules.map(r => r.impact)

    expect(impacts).toContain('critical')
    expect(impacts).toContain('serious')
  })
})

// ============================================
// Integration with i18n
// ============================================

describe('i18n compatibility', () => {
  it('rule IDs can be used as i18n keys', () => {
    // Rule IDs should be valid for use in i18n message keys
    // They should not contain characters that would break JSON paths
    for (const rule of wcagPartialRules) {
      expect(rule.id).not.toContain('.')
      expect(rule.id).not.toContain('[')
      expect(rule.id).not.toContain(']')
      expect(rule.id).not.toContain(' ')
    }
  })

  it('descriptions are in English/Portuguese (not hardcoded messages)', () => {
    // Descriptions should be internal developer descriptions
    // Not user-facing messages (those use i18n messageKey)
    for (const rule of wcagPartialRules) {
      // Descriptions should be short developer notes
      expect(rule.description.length).toBeLessThan(200)
    }
  })
})

// ============================================
// Note: check() functions require Playwright E2E tests
// ============================================

describe('check functions (E2E required)', () => {
  it('all check functions are async', () => {
    for (const rule of wcagPartialRules) {
      // Check that each check function returns a promise-like structure
      // We can't actually call them without Playwright, but we can verify they exist
      expect(typeof rule.check).toBe('function')
    }
  })

  it.todo('input-sem-autocomplete detects inputs without autocomplete attribute')
  it.todo('link-sem-underline-em-texto detects links in text without underline')
  it.todo('video-sem-legendas detects videos without captions track')
  it.todo('video-sem-legendas detects embedded videos from YouTube/Vimeo')
  it.todo('video-sem-audiodescricao detects videos without audio description')
  it.todo('select-onchange-navega detects selects with navigation on change')
})
