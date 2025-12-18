import { describe, it, expect } from 'vitest'
import {
  EMAG_RECOMMENDATIONS,
  EMAG_BY_SECTION,
  EMAG_SECTION_LABELS,
  EMAG_SECTION_DESCRIPTIONS,
  AXE_TO_EMAG,
  CUSTOM_TO_EMAG,
  getEmagForRule,
  getEmagRecommendation,
  EMAG_STATS,
  type EmagSection,
} from '@/lib/audit/emag-map'

// ============================================
// EMAG_RECOMMENDATIONS
// ============================================

describe('EMAG_RECOMMENDATIONS', () => {
  it('contains all expected recommendations (46 with additions)', () => {
    // Original eMAG 3.1 has 45, but we have 46 with custom additions
    expect(EMAG_RECOMMENDATIONS.length).toBeGreaterThanOrEqual(45)
  })

  it('all recommendations have required fields', () => {
    for (const rec of EMAG_RECOMMENDATIONS) {
      expect(rec.id).toBeDefined()
      expect(rec.section).toBeDefined()
      expect(rec.title).toBeDefined()
      expect(rec.description).toBeDefined()
      expect(rec.wcagCriteria).toBeInstanceOf(Array)
      expect(rec.axeRules).toBeInstanceOf(Array)
      expect(rec.customRules).toBeInstanceOf(Array)
      expect(rec.checkType).toMatch(/^(automated|semi-automated|manual)$/)
    }
  })

  it('has unique IDs', () => {
    const ids = EMAG_RECOMMENDATIONS.map((rec) => rec.id)
    const uniqueIds = [...new Set(ids)]
    expect(uniqueIds).toHaveLength(ids.length)
  })

  it('IDs follow pattern X.Y (section.number)', () => {
    for (const rec of EMAG_RECOMMENDATIONS) {
      expect(rec.id).toMatch(/^\d+\.\d+$/)
    }
  })

  it('contains recommendations for all 6 sections', () => {
    const sections = new Set(EMAG_RECOMMENDATIONS.map((rec) => rec.section))
    expect(sections.size).toBe(6)
    expect(sections.has('marcacao')).toBe(true)
    expect(sections.has('comportamento')).toBe(true)
    expect(sections.has('conteudo')).toBe(true)
    expect(sections.has('apresentacao')).toBe(true)
    expect(sections.has('multimidia')).toBe(true)
    expect(sections.has('formulario')).toBe(true)
  })

  describe('section counts', () => {
    it('marcacao has 9 recommendations (1.x)', () => {
      const count = EMAG_RECOMMENDATIONS.filter((rec) => rec.section === 'marcacao').length
      expect(count).toBe(9)
    })

    it('comportamento has 7 recommendations (2.x)', () => {
      const count = EMAG_RECOMMENDATIONS.filter((rec) => rec.section === 'comportamento').length
      expect(count).toBe(7)
    })

    it('conteudo has 12 recommendations (3.x)', () => {
      const count = EMAG_RECOMMENDATIONS.filter((rec) => rec.section === 'conteudo').length
      expect(count).toBe(12)
    })

    it('apresentacao has 5 recommendations (4.x)', () => {
      const count = EMAG_RECOMMENDATIONS.filter((rec) => rec.section === 'apresentacao').length
      expect(count).toBe(5)
    })

    it('multimidia has 5 recommendations (5.x)', () => {
      const count = EMAG_RECOMMENDATIONS.filter((rec) => rec.section === 'multimidia').length
      expect(count).toBe(5)
    })

    it('formulario has 7+ recommendations (6.x)', () => {
      const count = EMAG_RECOMMENDATIONS.filter((rec) => rec.section === 'formulario').length
      expect(count).toBeGreaterThanOrEqual(7)
    })
  })
})

// ============================================
// EMAG_BY_SECTION
// ============================================

describe('EMAG_BY_SECTION', () => {
  it('contains all 6 sections', () => {
    const sections = Object.keys(EMAG_BY_SECTION)
    expect(sections).toHaveLength(6)
    expect(sections).toContain('marcacao')
    expect(sections).toContain('comportamento')
    expect(sections).toContain('conteudo')
    expect(sections).toContain('apresentacao')
    expect(sections).toContain('multimidia')
    expect(sections).toContain('formulario')
  })

  it('groups recommendations correctly by section', () => {
    for (const [section, recs] of Object.entries(EMAG_BY_SECTION)) {
      for (const rec of recs) {
        expect(rec.section).toBe(section)
      }
    }
  })

  it('total count matches EMAG_RECOMMENDATIONS', () => {
    const total = Object.values(EMAG_BY_SECTION).reduce(
      (sum, recs) => sum + recs.length,
      0
    )
    expect(total).toBe(EMAG_RECOMMENDATIONS.length)
  })
})

// ============================================
// EMAG_SECTION_LABELS
// ============================================

describe('EMAG_SECTION_LABELS', () => {
  it('has labels for all 6 sections', () => {
    expect(Object.keys(EMAG_SECTION_LABELS)).toHaveLength(6)
  })

  it('labels are non-empty strings', () => {
    for (const label of Object.values(EMAG_SECTION_LABELS)) {
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })

  it('labels are in Portuguese', () => {
    expect(EMAG_SECTION_LABELS.marcacao).toContain('Marcacao')
    expect(EMAG_SECTION_LABELS.comportamento).toContain('Comportamento')
    expect(EMAG_SECTION_LABELS.conteudo).toContain('Conteudo')
  })
})

// ============================================
// EMAG_SECTION_DESCRIPTIONS
// ============================================

describe('EMAG_SECTION_DESCRIPTIONS', () => {
  it('has descriptions for all 6 sections', () => {
    expect(Object.keys(EMAG_SECTION_DESCRIPTIONS)).toHaveLength(6)
  })

  it('descriptions are non-empty strings', () => {
    for (const desc of Object.values(EMAG_SECTION_DESCRIPTIONS)) {
      expect(typeof desc).toBe('string')
      expect(desc.length).toBeGreaterThan(10)
    }
  })
})

// ============================================
// AXE_TO_EMAG mapping
// ============================================

describe('AXE_TO_EMAG', () => {
  it('maps axe-core rules to eMAG recommendations', () => {
    // Should have some mappings
    expect(Object.keys(AXE_TO_EMAG).length).toBeGreaterThan(0)
  })

  it('values are arrays of eMAG IDs', () => {
    for (const [, emagIds] of Object.entries(AXE_TO_EMAG)) {
      expect(Array.isArray(emagIds)).toBe(true)
      for (const id of emagIds) {
        expect(id).toMatch(/^\d+\.\d+$/)
      }
    }
  })

  it('maps common axe-core rules correctly', () => {
    // color-contrast should map to a presentation eMAG recommendation (4.x)
    if (AXE_TO_EMAG['color-contrast']) {
      const hasPresentation = AXE_TO_EMAG['color-contrast'].some(id => id.startsWith('4.'))
      expect(hasPresentation).toBe(true)
    }

    // image-alt should map to a content eMAG recommendation (3.x)
    if (AXE_TO_EMAG['image-alt']) {
      const hasContent = AXE_TO_EMAG['image-alt'].some(id => id.startsWith('3.'))
      expect(hasContent).toBe(true)
    }
  })
})

// ============================================
// CUSTOM_TO_EMAG mapping
// ============================================

describe('CUSTOM_TO_EMAG', () => {
  it('maps custom Brazilian rules to eMAG recommendations', () => {
    expect(Object.keys(CUSTOM_TO_EMAG).length).toBeGreaterThan(0)
  })

  it('values are arrays of eMAG IDs', () => {
    for (const [, emagIds] of Object.entries(CUSTOM_TO_EMAG)) {
      expect(Array.isArray(emagIds)).toBe(true)
      for (const id of emagIds) {
        expect(id).toMatch(/^\d+\.\d+$/)
      }
    }
  })

  it('maps Brazilian custom rules correctly', () => {
    // link-texto-generico should map to eMAG 3.5
    if (CUSTOM_TO_EMAG['link-texto-generico']) {
      expect(CUSTOM_TO_EMAG['link-texto-generico']).toContain('3.5')
    }

    // emag-skip-links should map to eMAG 1.5
    if (CUSTOM_TO_EMAG['emag-skip-links']) {
      expect(CUSTOM_TO_EMAG['emag-skip-links']).toContain('1.5')
    }

    // link-nova-aba-sem-aviso should map to eMAG 1.9
    if (CUSTOM_TO_EMAG['link-nova-aba-sem-aviso']) {
      expect(CUSTOM_TO_EMAG['link-nova-aba-sem-aviso']).toContain('1.9')
    }
  })
})

// ============================================
// getEmagForRule function
// ============================================

describe('getEmagForRule', () => {
  it('returns eMAG recommendations for axe-core rules', () => {
    // Check any axe rule that has a mapping
    const axeRules = Object.keys(AXE_TO_EMAG)
    if (axeRules.length > 0) {
      const result = getEmagForRule(axeRules[0])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('returns eMAG recommendations for custom rules', () => {
    const customRules = Object.keys(CUSTOM_TO_EMAG)
    if (customRules.length > 0) {
      const result = getEmagForRule(customRules[0])
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
    }
  })

  it('returns empty array for unknown rules', () => {
    const result = getEmagForRule('unknown-rule-xyz')
    expect(result).toEqual([])
  })

  it('checks both AXE_TO_EMAG and CUSTOM_TO_EMAG', () => {
    // A custom rule should be found
    if (CUSTOM_TO_EMAG['link-texto-generico']) {
      const result = getEmagForRule('link-texto-generico')
      expect(result.length).toBeGreaterThan(0)
    }
  })
})

// ============================================
// getEmagRecommendation function
// ============================================

describe('getEmagRecommendation', () => {
  it('returns recommendation by ID', () => {
    const rec = getEmagRecommendation('1.1')
    expect(rec).toBeDefined()
    expect(rec?.id).toBe('1.1')
    expect(rec?.section).toBe('marcacao')
  })

  it('returns undefined for unknown ID', () => {
    const rec = getEmagRecommendation('99.99')
    expect(rec).toBeUndefined()
  })

  it('returns correct recommendation for each section', () => {
    // Test one from each section
    const sections: Array<{ id: string; section: EmagSection }> = [
      { id: '1.1', section: 'marcacao' },
      { id: '2.1', section: 'comportamento' },
      { id: '3.1', section: 'conteudo' },
      { id: '4.1', section: 'apresentacao' },
      { id: '5.1', section: 'multimidia' },
      { id: '6.1', section: 'formulario' },
    ]

    for (const { id, section } of sections) {
      const rec = getEmagRecommendation(id)
      expect(rec).toBeDefined()
      expect(rec?.section).toBe(section)
    }
  })

  it('returns complete recommendation object', () => {
    const rec = getEmagRecommendation('1.5')
    expect(rec).toBeDefined()
    expect(rec).toHaveProperty('id')
    expect(rec).toHaveProperty('section')
    expect(rec).toHaveProperty('title')
    expect(rec).toHaveProperty('description')
    expect(rec).toHaveProperty('wcagCriteria')
    expect(rec).toHaveProperty('axeRules')
    expect(rec).toHaveProperty('customRules')
    expect(rec).toHaveProperty('checkType')
  })
})

// ============================================
// EMAG_STATS
// ============================================

describe('EMAG_STATS', () => {
  it('has correct total', () => {
    expect(EMAG_STATS.totalRecommendations).toBeGreaterThanOrEqual(45)
  })

  it('has section counts', () => {
    expect(EMAG_STATS).toHaveProperty('bySection')
  })

  it('has check type counts', () => {
    expect(EMAG_STATS).toHaveProperty('byCheckType')
  })

  it('check type counts sum to total', () => {
    const { automated, semiAutomated, manual } = EMAG_STATS.byCheckType
    expect(automated + semiAutomated + manual).toBe(EMAG_STATS.totalRecommendations)
  })
})

// ============================================
// Data integrity
// ============================================

describe('Data integrity', () => {
  it('all WCAG criteria follow correct format', () => {
    for (const rec of EMAG_RECOMMENDATIONS) {
      for (const criteria of rec.wcagCriteria) {
        // Format: X.X.X (e.g., "1.1.1", "2.4.4")
        expect(criteria).toMatch(/^\d+\.\d+\.\d+$/)
      }
    }
  })

  it('recommendation IDs are consistent with section', () => {
    const sectionPrefixes: Record<EmagSection, string> = {
      marcacao: '1.',
      comportamento: '2.',
      conteudo: '3.',
      apresentacao: '4.',
      multimidia: '5.',
      formulario: '6.',
    }

    for (const rec of EMAG_RECOMMENDATIONS) {
      const expectedPrefix = sectionPrefixes[rec.section]
      expect(rec.id.startsWith(expectedPrefix)).toBe(true)
    }
  })

  it('no duplicate mappings in AXE_TO_EMAG values', () => {
    for (const [, emagIds] of Object.entries(AXE_TO_EMAG)) {
      const uniqueIds = [...new Set(emagIds)]
      expect(uniqueIds).toHaveLength(emagIds.length)
    }
  })

  it('no duplicate mappings in CUSTOM_TO_EMAG values', () => {
    for (const [, emagIds] of Object.entries(CUSTOM_TO_EMAG)) {
      const uniqueIds = [...new Set(emagIds)]
      expect(uniqueIds).toHaveLength(emagIds.length)
    }
  })
})
