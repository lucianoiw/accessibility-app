import { describe, it, expect } from 'vitest'
import {
  WCAG_PRINCIPLES,
  WCAG_LEVELS,
  IMPACT_LABELS,
  IMPACT_COLORS,
} from '@/lib/reports/types'

describe('Report types and constants', () => {
  describe('WCAG_PRINCIPLES', () => {
    it('has 4 principles', () => {
      expect(WCAG_PRINCIPLES).toHaveLength(4)
    })

    it('includes Perceivable principle', () => {
      const perceivable = WCAG_PRINCIPLES.find(p => p.id === '1')
      expect(perceivable).toBeDefined()
      expect(perceivable?.name).toBe('Perceptivel')
      expect(perceivable?.nameEn).toBe('Perceivable')
      expect(perceivable?.criteria).toContain('1.1.1')
      expect(perceivable?.criteria).toContain('1.4.3')
    })

    it('includes Operable principle', () => {
      const operable = WCAG_PRINCIPLES.find(p => p.id === '2')
      expect(operable).toBeDefined()
      expect(operable?.name).toBe('Operavel')
      expect(operable?.nameEn).toBe('Operable')
      expect(operable?.criteria).toContain('2.1.1')
      expect(operable?.criteria).toContain('2.4.4')
    })

    it('includes Understandable principle', () => {
      const understandable = WCAG_PRINCIPLES.find(p => p.id === '3')
      expect(understandable).toBeDefined()
      expect(understandable?.name).toBe('Compreensivel')
      expect(understandable?.nameEn).toBe('Understandable')
      expect(understandable?.criteria).toContain('3.1.1')
      expect(understandable?.criteria).toContain('3.3.2')
    })

    it('includes Robust principle', () => {
      const robust = WCAG_PRINCIPLES.find(p => p.id === '4')
      expect(robust).toBeDefined()
      expect(robust?.name).toBe('Robusto')
      expect(robust?.nameEn).toBe('Robust')
      expect(robust?.criteria).toContain('4.1.1')
      expect(robust?.criteria).toContain('4.1.2')
    })

    it('each principle has non-empty criteria array', () => {
      WCAG_PRINCIPLES.forEach(principle => {
        expect(principle.criteria.length).toBeGreaterThan(0)
      })
    })
  })

  describe('WCAG_LEVELS', () => {
    it('has 3 levels (A, AA, AAA)', () => {
      expect(Object.keys(WCAG_LEVELS)).toEqual(['A', 'AA', 'AAA'])
    })

    it('Level A has core criteria', () => {
      expect(WCAG_LEVELS.A).toContain('1.1.1') // Non-text content
      expect(WCAG_LEVELS.A).toContain('2.1.1') // Keyboard
      expect(WCAG_LEVELS.A).toContain('4.1.1') // Parsing
      expect(WCAG_LEVELS.A).toContain('4.1.2') // Name, Role, Value
    })

    it('Level AA has intermediate criteria', () => {
      expect(WCAG_LEVELS.AA).toContain('1.4.3') // Contrast (minimum)
      expect(WCAG_LEVELS.AA).toContain('1.4.4') // Resize text
      expect(WCAG_LEVELS.AA).toContain('2.4.7') // Focus visible
      expect(WCAG_LEVELS.AA).toContain('4.1.3') // Status messages
    })

    it('Level AAA has enhanced criteria', () => {
      expect(WCAG_LEVELS.AAA).toContain('1.4.6') // Contrast (enhanced)
      expect(WCAG_LEVELS.AAA).toContain('1.4.8') // Visual presentation
      expect(WCAG_LEVELS.AAA).toContain('2.4.8') // Location
      expect(WCAG_LEVELS.AAA).toContain('3.1.5') // Reading level
    })

    it('criteria are properly formatted (X.Y.Z)', () => {
      const allCriteria = [...WCAG_LEVELS.A, ...WCAG_LEVELS.AA, ...WCAG_LEVELS.AAA]
      const criteriaRegex = /^[1-4]\.\d+\.\d+$/

      allCriteria.forEach(criterion => {
        expect(criterion).toMatch(criteriaRegex)
      })
    })

    it('no duplicate criteria across levels', () => {
      const allCriteria = [...WCAG_LEVELS.A, ...WCAG_LEVELS.AA, ...WCAG_LEVELS.AAA]
      const uniqueCriteria = new Set(allCriteria)
      expect(uniqueCriteria.size).toBe(allCriteria.length)
    })
  })

  describe('IMPACT_LABELS', () => {
    it('has all 4 impact levels', () => {
      expect(Object.keys(IMPACT_LABELS)).toEqual(['critical', 'serious', 'moderate', 'minor'])
    })

    it('labels are in Portuguese', () => {
      expect(IMPACT_LABELS.critical).toBe('Critico')
      expect(IMPACT_LABELS.serious).toBe('Serio')
      expect(IMPACT_LABELS.moderate).toBe('Moderado')
      expect(IMPACT_LABELS.minor).toBe('Menor')
    })
  })

  describe('IMPACT_COLORS', () => {
    it('has all 4 impact levels', () => {
      expect(Object.keys(IMPACT_COLORS)).toEqual(['critical', 'serious', 'moderate', 'minor'])
    })

    it('each level has bg, text, and border colors', () => {
      Object.values(IMPACT_COLORS).forEach(colors => {
        expect(colors).toHaveProperty('bg')
        expect(colors).toHaveProperty('text')
        expect(colors).toHaveProperty('border')
      })
    })

    it('colors are valid hex codes', () => {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/

      Object.values(IMPACT_COLORS).forEach(colors => {
        expect(colors.bg).toMatch(hexRegex)
        expect(colors.text).toMatch(hexRegex)
        expect(colors.border).toMatch(hexRegex)
      })
    })

    it('critical has red tones', () => {
      expect(IMPACT_COLORS.critical.border).toBe('#EF4444')
    })

    it('serious has orange tones', () => {
      expect(IMPACT_COLORS.serious.border).toBe('#F97316')
    })

    it('moderate has yellow/amber tones', () => {
      expect(IMPACT_COLORS.moderate.border).toBe('#F59E0B')
    })

    it('minor has blue tones', () => {
      expect(IMPACT_COLORS.minor.border).toBe('#3B82F6')
    })
  })
})
