import { describe, it, expect } from 'vitest'
import { ABNT_MAP } from '@/lib/audit/abnt-map'

// ============================================
// ABNT_MAP structure and completeness
// ============================================

describe('ABNT_MAP', () => {
  it('is a non-empty object', () => {
    expect(typeof ABNT_MAP).toBe('object')
    expect(Object.keys(ABNT_MAP).length).toBeGreaterThan(0)
  })

  it('maps WCAG criteria to ABNT sections', () => {
    // All keys should be WCAG criteria format (X.X.X)
    for (const wcag of Object.keys(ABNT_MAP)) {
      expect(wcag).toMatch(/^\d+\.\d+\.\d+$/)
    }

    // All values should be ABNT format (ABNT X.X.X)
    for (const abnt of Object.values(ABNT_MAP)) {
      expect(abnt).toMatch(/^ABNT \d+\.\d+\.\d+$/)
    }
  })

  it('contains all WCAG 2.1 Level A criteria', () => {
    const levelACriteria = [
      '1.1.1', // Non-text Content
      '1.2.1', // Audio-only and Video-only (Prerecorded)
      '1.2.2', // Captions (Prerecorded)
      '1.2.3', // Audio Description or Media Alternative (Prerecorded)
      '1.3.1', // Info and Relationships
      '1.3.2', // Meaningful Sequence
      '1.3.3', // Sensory Characteristics
      '1.4.1', // Use of Color
      '1.4.2', // Audio Control
      '2.1.1', // Keyboard
      '2.1.2', // No Keyboard Trap
      '2.1.4', // Character Key Shortcuts
      '2.2.1', // Timing Adjustable
      '2.2.2', // Pause, Stop, Hide
      '2.3.1', // Three Flashes or Below Threshold
      '2.4.1', // Bypass Blocks
      '2.4.2', // Page Titled
      '2.4.3', // Focus Order
      '2.4.4', // Link Purpose (In Context)
      '2.5.1', // Pointer Gestures
      '2.5.2', // Pointer Cancellation
      '2.5.3', // Label in Name
      '2.5.4', // Motion Actuation
      '3.1.1', // Language of Page
      '3.2.1', // On Focus
      '3.2.2', // On Input
      '3.3.1', // Error Identification
      '3.3.2', // Labels or Instructions
      '4.1.1', // Parsing
      '4.1.2', // Name, Role, Value
    ]

    for (const criteria of levelACriteria) {
      expect(ABNT_MAP[criteria], `WCAG ${criteria} should be mapped`).toBeDefined()
    }
  })

  it('contains WCAG 2.1 Level AA criteria', () => {
    const levelAACriteria = [
      '1.2.4', // Captions (Live)
      '1.2.5', // Audio Description (Prerecorded)
      '1.3.4', // Orientation
      '1.3.5', // Identify Input Purpose
      '1.4.3', // Contrast (Minimum)
      '1.4.4', // Resize Text
      '1.4.5', // Images of Text
      '1.4.10', // Reflow
      '1.4.11', // Non-text Contrast
      '1.4.12', // Text Spacing
      '1.4.13', // Content on Hover or Focus
      '2.4.5', // Multiple Ways
      '2.4.6', // Headings and Labels
      '2.4.7', // Focus Visible
      '3.1.2', // Language of Parts
      '3.2.3', // Consistent Navigation
      '3.2.4', // Consistent Identification
      '3.3.3', // Error Suggestion
      '3.3.4', // Error Prevention (Legal, Financial, Data)
      '4.1.3', // Status Messages
    ]

    for (const criteria of levelAACriteria) {
      expect(ABNT_MAP[criteria], `WCAG ${criteria} should be mapped`).toBeDefined()
    }
  })

  it('contains WCAG 2.1 Level AAA criteria', () => {
    const levelAAACriteria = [
      '1.2.6', // Sign Language (Prerecorded)
      '1.2.7', // Extended Audio Description (Prerecorded)
      '1.2.8', // Media Alternative (Prerecorded)
      '1.2.9', // Audio-only (Live)
      '1.3.6', // Identify Purpose
      '1.4.6', // Contrast (Enhanced)
      '1.4.7', // Low or No Background Audio
      '1.4.8', // Visual Presentation
      '1.4.9', // Images of Text (No Exception)
      '2.1.3', // Keyboard (No Exception)
      '2.2.3', // No Timing
      '2.2.4', // Interruptions
      '2.2.5', // Re-authenticating
      '2.2.6', // Timeouts
      '2.3.2', // Three Flashes
      '2.3.3', // Animation from Interactions
      '2.4.8', // Location
      '2.4.9', // Link Purpose (Link Only)
      '2.4.10', // Section Headings
      '2.5.5', // Target Size
      '2.5.6', // Concurrent Input Mechanisms
      '3.1.3', // Unusual Words
      '3.1.4', // Abbreviations
      '3.1.5', // Reading Level
      '3.1.6', // Pronunciation
      '3.2.5', // Change on Request
      '3.3.5', // Help
      '3.3.6', // Error Prevention (All)
    ]

    for (const criteria of levelAAACriteria) {
      expect(ABNT_MAP[criteria], `WCAG ${criteria} should be mapped`).toBeDefined()
    }
  })

  it('contains WCAG 2.2 new criteria', () => {
    const wcag22Criteria = [
      '2.4.11', // Focus Appearance
      '2.4.12', // Focus Not Obscured (Minimum)
      '2.4.13', // Focus Not Obscured (Enhanced)
      '2.5.7', // Dragging Movements
      '2.5.8', // Target Size (Minimum)
      '3.2.6', // Consistent Help
      '3.3.7', // Redundant Entry
      '3.3.8', // Accessible Authentication
      '3.3.9', // Accessible Authentication (No Exception)
    ]

    for (const criteria of wcag22Criteria) {
      expect(ABNT_MAP[criteria], `WCAG 2.2 ${criteria} should be mapped`).toBeDefined()
    }
  })
})

// ============================================
// ABNT NBR 17060 section organization
// ============================================

describe('ABNT section organization', () => {
  it('maps Principle 1 (Perceivable) to ABNT 5.x sections', () => {
    // Principle 1 criteria (1.x.x) should map to various ABNT 5.x sections
    const principle1Keys = Object.keys(ABNT_MAP).filter(k => k.startsWith('1.'))
    expect(principle1Keys.length).toBeGreaterThan(0)

    // All should map to ABNT 5.x
    for (const key of principle1Keys) {
      expect(ABNT_MAP[key]).toMatch(/^ABNT 5\./)
    }
  })

  it('maps Principle 2 (Operable) to ABNT 5.x sections', () => {
    const principle2Keys = Object.keys(ABNT_MAP).filter(k => k.startsWith('2.'))
    expect(principle2Keys.length).toBeGreaterThan(0)

    for (const key of principle2Keys) {
      expect(ABNT_MAP[key]).toMatch(/^ABNT 5\./)
    }
  })

  it('maps Principle 3 (Understandable) to ABNT 5.x sections', () => {
    const principle3Keys = Object.keys(ABNT_MAP).filter(k => k.startsWith('3.'))
    expect(principle3Keys.length).toBeGreaterThan(0)

    for (const key of principle3Keys) {
      expect(ABNT_MAP[key]).toMatch(/^ABNT 5\./)
    }
  })

  it('maps Principle 4 (Robust) to ABNT 5.x sections', () => {
    const principle4Keys = Object.keys(ABNT_MAP).filter(k => k.startsWith('4.'))
    expect(principle4Keys.length).toBeGreaterThan(0)

    for (const key of principle4Keys) {
      expect(ABNT_MAP[key]).toMatch(/^ABNT 5\./)
    }
  })

  it('has specific ABNT subsection mappings', () => {
    // Check specific expected mappings
    expect(ABNT_MAP['1.1.1']).toBe('ABNT 5.2.6') // Non-text content
    expect(ABNT_MAP['1.4.3']).toBe('ABNT 5.11.3') // Contrast (minimum)
    expect(ABNT_MAP['2.1.1']).toBe('ABNT 5.5.1') // Keyboard
    expect(ABNT_MAP['2.4.1']).toBe('ABNT 5.7.1') // Bypass Blocks
    expect(ABNT_MAP['3.1.1']).toBe('ABNT 5.13.2') // Language of Page
    expect(ABNT_MAP['4.1.2']).toBe('ABNT 5.13.13') // Name, Role, Value
  })
})

// ============================================
// Data integrity
// ============================================

describe('Data integrity', () => {
  it('has no duplicate ABNT mappings', () => {
    const abntValues = Object.values(ABNT_MAP)
    const uniqueValues = [...new Set(abntValues)]
    expect(uniqueValues.length).toBe(abntValues.length)
  })

  it('has no duplicate WCAG keys', () => {
    const wcagKeys = Object.keys(ABNT_MAP)
    const uniqueKeys = [...new Set(wcagKeys)]
    expect(uniqueKeys.length).toBe(wcagKeys.length)
  })

  it('WCAG criteria follow numbering convention', () => {
    for (const wcag of Object.keys(ABNT_MAP)) {
      const parts = wcag.split('.')
      expect(parts.length).toBe(3)

      // First part should be 1-4 (principles)
      const principle = parseInt(parts[0], 10)
      expect(principle).toBeGreaterThanOrEqual(1)
      expect(principle).toBeLessThanOrEqual(4)

      // All parts should be positive integers
      for (const part of parts) {
        const num = parseInt(part, 10)
        expect(num).toBeGreaterThanOrEqual(1)
        expect(num).toBeLessThanOrEqual(20) // Reasonable upper bound
      }
    }
  })

  it('ABNT sections follow numbering convention', () => {
    for (const abnt of Object.values(ABNT_MAP)) {
      // Should match "ABNT X.X.X" format
      expect(abnt).toMatch(/^ABNT \d+\.\d+\.\d+$/)

      // Extract section numbers
      const match = abnt.match(/^ABNT (\d+)\.(\d+)\.(\d+)$/)
      expect(match).not.toBeNull()

      if (match) {
        const major = parseInt(match[1], 10)
        const minor = parseInt(match[2], 10)
        const patch = parseInt(match[3], 10)

        // Major should be 5 (all accessibility requirements are in section 5)
        expect(major).toBe(5)

        // Minor should be reasonable subsection
        expect(minor).toBeGreaterThanOrEqual(1)
        expect(minor).toBeLessThanOrEqual(20)

        // Patch should be reasonable
        expect(patch).toBeGreaterThanOrEqual(1)
        expect(patch).toBeLessThanOrEqual(20)
      }
    }
  })
})

// ============================================
// Coverage statistics
// ============================================

describe('Coverage statistics', () => {
  it('covers minimum expected WCAG criteria', () => {
    // WCAG 2.1 has 78 success criteria, WCAG 2.2 adds 9 more (87 total)
    // We should have mappings for most of them
    expect(Object.keys(ABNT_MAP).length).toBeGreaterThanOrEqual(70)
  })

  it('covers all four WCAG principles', () => {
    const hasPrinciple1 = Object.keys(ABNT_MAP).some(k => k.startsWith('1.'))
    const hasPrinciple2 = Object.keys(ABNT_MAP).some(k => k.startsWith('2.'))
    const hasPrinciple3 = Object.keys(ABNT_MAP).some(k => k.startsWith('3.'))
    const hasPrinciple4 = Object.keys(ABNT_MAP).some(k => k.startsWith('4.'))

    expect(hasPrinciple1).toBe(true)
    expect(hasPrinciple2).toBe(true)
    expect(hasPrinciple3).toBe(true)
    expect(hasPrinciple4).toBe(true)
  })

  it('has balanced coverage across principles', () => {
    const principle1Count = Object.keys(ABNT_MAP).filter(k => k.startsWith('1.')).length
    const principle2Count = Object.keys(ABNT_MAP).filter(k => k.startsWith('2.')).length
    const principle3Count = Object.keys(ABNT_MAP).filter(k => k.startsWith('3.')).length
    const principle4Count = Object.keys(ABNT_MAP).filter(k => k.startsWith('4.')).length

    // Principle 1 (Perceivable) has many criteria
    expect(principle1Count).toBeGreaterThanOrEqual(20)

    // Principle 2 (Operable) has many criteria
    expect(principle2Count).toBeGreaterThanOrEqual(20)

    // Principle 3 (Understandable) has moderate criteria
    expect(principle3Count).toBeGreaterThanOrEqual(15)

    // Principle 4 (Robust) has few criteria
    expect(principle4Count).toBeGreaterThanOrEqual(3)
  })
})
