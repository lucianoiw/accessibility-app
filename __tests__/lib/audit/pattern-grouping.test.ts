import { describe, it, expect } from 'vitest'
import {
  normalizeSelector,
  normalizeXPath,
  groupByPattern,
  countUniquePatterns,
  getPatternGroups,
  calculatePatternStats,
  calculateSeverityPatternSummary,
} from '@/lib/audit/pattern-grouping'

describe('pattern-grouping', () => {
  describe('normalizeSelector', () => {
    it('should remove :nth-child indices', () => {
      expect(normalizeSelector('.card:nth-child(1) > img')).toBe('.card > img')
      expect(normalizeSelector('.card:nth-child(23) > img')).toBe('.card > img')
      expect(normalizeSelector('ul > li:nth-child(5) > a')).toBe('ul > li > a')
    })

    it('should remove :nth-of-type indices', () => {
      expect(normalizeSelector('div:nth-of-type(3)')).toBe('div')
      expect(normalizeSelector('p:nth-of-type(1) > span')).toBe('p > span')
    })

    it('should remove :first-child and :last-child', () => {
      expect(normalizeSelector('li:first-child')).toBe('li')
      expect(normalizeSelector('li:last-child > a')).toBe('li > a')
    })

    it('should normalize IDs with numbers', () => {
      expect(normalizeSelector('#item-123')).toBe('#item-*')
      expect(normalizeSelector('#product_456')).toBe('#product_*')
      expect(normalizeSelector('#789')).toBe('#*')
    })

    it('should normalize classes with numbers', () => {
      expect(normalizeSelector('.item-3')).toBe('.item-*')
      expect(normalizeSelector('.product_12')).toBe('.product_*')
      expect(normalizeSelector('.col-md-6')).toBe('.col-md-*')
    })

    it('should normalize classes with hash suffixes', () => {
      expect(normalizeSelector('.Component-abc123')).toBe('.Component-*')
      expect(normalizeSelector('.styled-a1b2c3d4')).toBe('.styled-*')
    })

    it('should handle complex selectors', () => {
      const input = '.card:nth-child(3) > .card-body > img#image-123.thumbnail-5'
      const expected = '.card > .card-body > img#image-*.thumbnail-*'
      expect(normalizeSelector(input)).toBe(expected)
    })

    it('should handle empty or null input', () => {
      expect(normalizeSelector('')).toBe('')
      expect(normalizeSelector(null as any)).toBe('')
      expect(normalizeSelector(undefined as any)).toBe('')
    })

    it('should preserve non-dynamic parts', () => {
      expect(normalizeSelector('.header > nav > ul > li > a')).toBe('.header > nav > ul > li > a')
      expect(normalizeSelector('#main-content')).toBe('#main-content')
    })
  })

  describe('normalizeXPath', () => {
    it('should remove positional indices', () => {
      expect(normalizeXPath('//div[1]/p[3]')).toBe('//div/p')
      expect(normalizeXPath('//ul/li[5]/a')).toBe('//ul/li/a')
    })

    it('should normalize predicates with numbers', () => {
      expect(normalizeXPath("//*[@data-index='3']")).toBe("//*[@data-index]")
    })

    it('should handle empty input', () => {
      expect(normalizeXPath('')).toBe('')
      expect(normalizeXPath(null as any)).toBe('')
    })
  })

  describe('groupByPattern', () => {
    it('should group similar selectors together', () => {
      const elements = [
        { fullPath: '.card:nth-child(1) > img' },
        { fullPath: '.card:nth-child(2) > img' },
        { fullPath: '.card:nth-child(3) > img' },
        { fullPath: 'header > img.logo' },
      ]

      const groups = groupByPattern(elements)

      expect(groups.size).toBe(2)
      expect(groups.get('.card > img')?.length).toBe(3)
      expect(groups.get('header > img.logo')?.length).toBe(1)
    })

    it('should work with XPath when specified', () => {
      const elements = [
        { xPath: '//div[1]/img' },
        { xPath: '//div[2]/img' },
        { xPath: '//header/img' },
      ]

      const groups = groupByPattern(elements, true)

      expect(groups.size).toBe(2)
      expect(groups.get('//div/img')?.length).toBe(2)
      expect(groups.get('//header/img')?.length).toBe(1)
    })

    it('should handle empty elements', () => {
      const groups = groupByPattern([])
      expect(groups.size).toBe(0)
    })

    it('should skip elements without the specified path type', () => {
      const elements = [
        { fullPath: '.card > img' },
        { xPath: '//div' },  // No fullPath
        { fullPath: '.footer > p' },
      ]

      const groups = groupByPattern(elements, false)

      expect(groups.size).toBe(2)
      expect(groups.has('.card > img')).toBe(true)
      expect(groups.has('.footer > p')).toBe(true)
    })
  })

  describe('countUniquePatterns', () => {
    it('should return correct count', () => {
      const elements = [
        { fullPath: '.item-1 > img' },
        { fullPath: '.item-2 > img' },
        { fullPath: '.item-3 > img' },
        { fullPath: '.header > img' },
        { fullPath: '.footer > img' },
      ]

      // .item-* > img (3), .header > img (1), .footer > img (1) = 3 patterns
      expect(countUniquePatterns(elements)).toBe(3)
    })

    it('should return 0 for empty array', () => {
      expect(countUniquePatterns([])).toBe(0)
    })
  })

  describe('getPatternGroups', () => {
    it('should return sorted groups with examples', () => {
      const elements = [
        { fullPath: '.card:nth-child(1) > img' },
        { fullPath: '.card:nth-child(2) > img' },
        { fullPath: '.card:nth-child(3) > img' },
        { fullPath: 'header > img' },
      ]

      const groups = getPatternGroups(elements)

      expect(groups).toHaveLength(2)

      // Most occurrences first
      expect(groups[0].pattern).toBe('.card > img')
      expect(groups[0].occurrences).toBe(3)
      expect(groups[0].examples).toHaveLength(3)

      expect(groups[1].pattern).toBe('header > img')
      expect(groups[1].occurrences).toBe(1)
    })

    it('should limit examples to 3', () => {
      const elements = Array.from({ length: 10 }, (_, i) => ({
        fullPath: `.item:nth-child(${i + 1}) > img`,
      }))

      const groups = getPatternGroups(elements)

      expect(groups[0].occurrences).toBe(10)
      expect(groups[0].examples).toHaveLength(3)
    })
  })

  describe('calculatePatternStats', () => {
    it('should calculate correct statistics', () => {
      const elements = [
        { fullPath: '.card:nth-child(1) > img' },
        { fullPath: '.card:nth-child(2) > img' },
        { fullPath: '.card:nth-child(3) > img' },
        { fullPath: '.card:nth-child(4) > img' },
        { fullPath: 'header > img' },  // unique
      ]

      const stats = calculatePatternStats(elements)

      expect(stats.totalOccurrences).toBe(5)
      expect(stats.uniquePatterns).toBe(2)

      // 4 out of 5 are from templates (patterns with >1 occurrence)
      expect(stats.templateRatio).toBe(0.8)
    })

    it('should handle all unique elements', () => {
      const elements = [
        { fullPath: '.a > img' },
        { fullPath: '.b > img' },
        { fullPath: '.c > img' },
      ]

      const stats = calculatePatternStats(elements)

      expect(stats.totalOccurrences).toBe(3)
      expect(stats.uniquePatterns).toBe(3)
      expect(stats.templateRatio).toBe(0)  // No templates
    })

    it('should handle empty input', () => {
      const stats = calculatePatternStats([])

      expect(stats.totalOccurrences).toBe(0)
      expect(stats.uniquePatterns).toBe(0)
      expect(stats.templateRatio).toBe(0)
    })
  })

  describe('calculateSeverityPatternSummary', () => {
    it('should calculate patterns by severity', () => {
      const violations = [
        {
          impact: 'critical' as const,
          unique_elements: [
            { fullPath: '.btn:nth-child(1)' },
            { fullPath: '.btn:nth-child(2)' },
          ],
        },
        {
          impact: 'serious' as const,
          unique_elements: [
            { fullPath: '.card:nth-child(1) > img' },
            { fullPath: '.card:nth-child(2) > img' },
            { fullPath: '.card:nth-child(3) > img' },
            { fullPath: 'header > img' },
          ],
        },
        {
          impact: 'moderate' as const,
          unique_elements: [
            { fullPath: '.link-1' },
            { fullPath: '.link-2' },
          ],
        },
        {
          impact: 'minor' as const,
          unique_elements: [
            { fullPath: '.footer > p' },
          ],
        },
      ]

      const summary = calculateSeverityPatternSummary(violations)

      // Critical: 2 occurrences, 1 pattern (.btn)
      expect(summary.critical.occurrences).toBe(2)
      expect(summary.critical.patterns).toBe(1)

      // Serious: 4 occurrences, 2 patterns (.card > img, header > img)
      expect(summary.serious.occurrences).toBe(4)
      expect(summary.serious.patterns).toBe(2)

      // Moderate: 2 occurrences, 1 pattern (.link-*)
      expect(summary.moderate.occurrences).toBe(2)
      expect(summary.moderate.patterns).toBe(1)

      // Minor: 1 occurrence, 1 pattern
      expect(summary.minor.occurrences).toBe(1)
      expect(summary.minor.patterns).toBe(1)

      // Totals
      expect(summary.total.occurrences).toBe(9)
      expect(summary.total.patterns).toBe(5)
    })

    it('should handle empty violations', () => {
      const summary = calculateSeverityPatternSummary([])

      expect(summary.total.occurrences).toBe(0)
      expect(summary.total.patterns).toBe(0)
    })

    it('should handle violations without unique_elements', () => {
      const violations = [
        {
          impact: 'critical' as const,
          unique_elements: [],
        },
      ]

      const summary = calculateSeverityPatternSummary(violations)

      expect(summary.critical.occurrences).toBe(0)
      expect(summary.critical.patterns).toBe(0)
    })
  })
})
