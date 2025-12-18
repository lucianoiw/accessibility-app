import { describe, it, expect } from 'vitest'
import {
  COLORS,
  BASE_STYLES,
  getImpactBadgeClass,
  getViolationCardClass,
  getStatusBadgeClass,
} from '@/lib/reports/templates/styles'

describe('Report styles', () => {
  describe('COLORS', () => {
    it('has severity colors', () => {
      expect(COLORS.critical).toBeDefined()
      expect(COLORS.serious).toBeDefined()
      expect(COLORS.moderate).toBeDefined()
      expect(COLORS.minor).toBeDefined()
    })

    it('each severity has bg, text, and border', () => {
      const severities = ['critical', 'serious', 'moderate', 'minor'] as const
      severities.forEach((severity) => {
        expect(COLORS[severity].bg).toBeDefined()
        expect(COLORS[severity].text).toBeDefined()
        expect(COLORS[severity].border).toBeDefined()
      })
    })

    it('has status colors', () => {
      expect(COLORS.pass).toBeDefined()
      expect(COLORS.fail).toBeDefined()
      expect(COLORS.notTested).toBeDefined()
    })

    it('has branding colors', () => {
      expect(COLORS.primary).toBe('#2563EB')
      expect(COLORS.primaryDark).toBe('#1D4ED8')
      expect(COLORS.secondary).toBe('#64748B')
    })

    it('has neutral colors', () => {
      expect(COLORS.white).toBe('#FFFFFF')
      expect(COLORS.gray50).toBe('#F9FAFB')
      expect(COLORS.gray100).toBe('#F3F4F6')
      expect(COLORS.gray200).toBe('#E5E7EB')
      expect(COLORS.gray300).toBe('#D1D5DB')
      expect(COLORS.gray500).toBe('#6B7280')
      expect(COLORS.gray700).toBe('#374151')
      expect(COLORS.gray900).toBe('#111827')
    })

    it('critical has red tones', () => {
      expect(COLORS.critical.border).toBe('#EF4444')
    })

    it('serious has orange tones', () => {
      expect(COLORS.serious.border).toBe('#F97316')
    })

    it('moderate has amber tones', () => {
      expect(COLORS.moderate.border).toBe('#F59E0B')
    })

    it('minor has blue tones', () => {
      expect(COLORS.minor.border).toBe('#3B82F6')
    })

    it('pass has green tones', () => {
      expect(COLORS.pass.border).toBe('#10B981')
    })

    it('fail has red tones', () => {
      expect(COLORS.fail.border).toBe('#EF4444')
    })

    it('notTested has gray tones', () => {
      expect(COLORS.notTested.border).toBe('#9CA3AF')
    })
  })

  describe('BASE_STYLES', () => {
    it('is a non-empty string', () => {
      expect(typeof BASE_STYLES).toBe('string')
      expect(BASE_STYLES.length).toBeGreaterThan(0)
    })

    it('contains CSS reset rules', () => {
      expect(BASE_STYLES).toContain('margin: 0')
      expect(BASE_STYLES).toContain('padding: 0')
      expect(BASE_STYLES).toContain('box-sizing: border-box')
    })

    it('contains font-family definitions', () => {
      expect(BASE_STYLES).toContain('font-family')
      expect(BASE_STYLES).toContain('Inter')
    })

    it('contains heading styles', () => {
      expect(BASE_STYLES).toContain('h1')
      expect(BASE_STYLES).toContain('h2')
      expect(BASE_STYLES).toContain('h3')
    })

    it('contains badge styles', () => {
      expect(BASE_STYLES).toContain('.badge')
      expect(BASE_STYLES).toContain('.badge-critical')
      expect(BASE_STYLES).toContain('.badge-serious')
      expect(BASE_STYLES).toContain('.badge-moderate')
      expect(BASE_STYLES).toContain('.badge-minor')
    })

    it('contains page layout styles for PDF', () => {
      expect(BASE_STYLES).toContain('.page')
      expect(BASE_STYLES).toContain('210mm') // A4 width
      expect(BASE_STYLES).toContain('297mm') // A4 height
      expect(BASE_STYLES).toContain('page-break-after')
    })

    it('contains violation card styles', () => {
      expect(BASE_STYLES).toContain('.violation-card')
      expect(BASE_STYLES).toContain('.violation-critical')
      expect(BASE_STYLES).toContain('.violation-serious')
      expect(BASE_STYLES).toContain('.violation-moderate')
      expect(BASE_STYLES).toContain('.violation-minor')
    })

    it('contains stats grid styles', () => {
      expect(BASE_STYLES).toContain('.stats-grid')
      expect(BASE_STYLES).toContain('.stat-card')
      expect(BASE_STYLES).toContain('.stat-value')
      expect(BASE_STYLES).toContain('.stat-label')
    })

    it('contains progress bar styles', () => {
      expect(BASE_STYLES).toContain('.progress-bar')
      expect(BASE_STYLES).toContain('.progress-fill')
    })

    it('contains print media query', () => {
      expect(BASE_STYLES).toContain('@media print')
    })

    it('uses COLORS variables', () => {
      // Check that styles reference color values
      expect(BASE_STYLES).toContain(COLORS.gray900)
      expect(BASE_STYLES).toContain(COLORS.primary)
      expect(BASE_STYLES).toContain(COLORS.gray100)
    })
  })

  describe('getImpactBadgeClass', () => {
    it('returns badge class for critical', () => {
      expect(getImpactBadgeClass('critical')).toBe('badge badge-critical')
    })

    it('returns badge class for serious', () => {
      expect(getImpactBadgeClass('serious')).toBe('badge badge-serious')
    })

    it('returns badge class for moderate', () => {
      expect(getImpactBadgeClass('moderate')).toBe('badge badge-moderate')
    })

    it('returns badge class for minor', () => {
      expect(getImpactBadgeClass('minor')).toBe('badge badge-minor')
    })

    it('handles unknown impact gracefully', () => {
      expect(getImpactBadgeClass('unknown')).toBe('badge badge-unknown')
    })
  })

  describe('getViolationCardClass', () => {
    it('returns violation card class for critical', () => {
      expect(getViolationCardClass('critical')).toBe('violation-card violation-critical')
    })

    it('returns violation card class for serious', () => {
      expect(getViolationCardClass('serious')).toBe('violation-card violation-serious')
    })

    it('returns violation card class for moderate', () => {
      expect(getViolationCardClass('moderate')).toBe('violation-card violation-moderate')
    })

    it('returns violation card class for minor', () => {
      expect(getViolationCardClass('minor')).toBe('violation-card violation-minor')
    })
  })

  describe('getStatusBadgeClass', () => {
    it('returns pass badge class', () => {
      expect(getStatusBadgeClass('pass')).toBe('badge badge-pass')
    })

    it('returns fail badge class', () => {
      expect(getStatusBadgeClass('fail')).toBe('badge badge-fail')
    })

    it('returns not_tested badge class', () => {
      expect(getStatusBadgeClass('not_tested')).toBe('badge badge-not-tested')
    })
  })
})
