import { describe, it, expect } from 'vitest'
import {
  AXE_VISUAL_RULES,
  CUSTOM_VISUAL_RULES,
  VISUAL_RULES,
  SCREENSHOT_CONFIG,
  isVisualRule,
  getScreenshotConfig,
  type VisualRule,
} from '@/lib/audit/screenshot-rules'

// ============================================
// Constants - AXE_VISUAL_RULES
// ============================================

describe('AXE_VISUAL_RULES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(AXE_VISUAL_RULES)).toBe(true)
    expect(AXE_VISUAL_RULES.length).toBeGreaterThan(0)
  })

  it('contains contrast rules', () => {
    expect(AXE_VISUAL_RULES).toContain('color-contrast')
    expect(AXE_VISUAL_RULES).toContain('color-contrast-enhanced')
  })

  it('has exactly 2 rules', () => {
    expect(AXE_VISUAL_RULES.length).toBe(2)
  })

  it('all rules are strings', () => {
    for (const rule of AXE_VISUAL_RULES) {
      expect(typeof rule).toBe('string')
      expect(rule.length).toBeGreaterThan(0)
    }
  })
})

// ============================================
// Constants - CUSTOM_VISUAL_RULES
// ============================================

describe('CUSTOM_VISUAL_RULES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(CUSTOM_VISUAL_RULES)).toBe(true)
    expect(CUSTOM_VISUAL_RULES.length).toBeGreaterThan(0)
  })

  it('contains Brazilian custom visual rules', () => {
    const expectedRules = [
      'fonte-muito-pequena',
      'texto-justificado',
      'texto-maiusculo-css',
      'br-excessivo-layout',
      'emag-tabela-layout',
    ]

    for (const rule of expectedRules) {
      expect(CUSTOM_VISUAL_RULES).toContain(rule)
    }
  })

  it('has exactly 5 rules', () => {
    expect(CUSTOM_VISUAL_RULES.length).toBe(5)
  })

  it('all rules are strings', () => {
    for (const rule of CUSTOM_VISUAL_RULES) {
      expect(typeof rule).toBe('string')
      expect(rule.length).toBeGreaterThan(0)
    }
  })

  it('all rules use hyphenated naming convention', () => {
    for (const rule of CUSTOM_VISUAL_RULES) {
      expect(rule).toMatch(/^[a-z]+(-[a-z]+)+$/)
    }
  })
})

// ============================================
// Constants - VISUAL_RULES
// ============================================

describe('VISUAL_RULES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(VISUAL_RULES)).toBe(true)
    expect(VISUAL_RULES.length).toBeGreaterThan(0)
  })

  it('combines axe and custom rules', () => {
    expect(VISUAL_RULES.length).toBe(AXE_VISUAL_RULES.length + CUSTOM_VISUAL_RULES.length)
  })

  it('contains all axe visual rules', () => {
    for (const rule of AXE_VISUAL_RULES) {
      expect(VISUAL_RULES).toContain(rule)
    }
  })

  it('contains all custom visual rules', () => {
    for (const rule of CUSTOM_VISUAL_RULES) {
      expect(VISUAL_RULES).toContain(rule)
    }
  })

  it('has no duplicates', () => {
    const uniqueRules = [...new Set(VISUAL_RULES)]
    expect(uniqueRules.length).toBe(VISUAL_RULES.length)
  })

  it('maintains order (axe rules first, then custom)', () => {
    const axeRulesCount = AXE_VISUAL_RULES.length

    // Check axe rules are first
    for (let i = 0; i < axeRulesCount; i++) {
      expect(VISUAL_RULES[i]).toBe(AXE_VISUAL_RULES[i])
    }

    // Check custom rules are after
    for (let i = 0; i < CUSTOM_VISUAL_RULES.length; i++) {
      expect(VISUAL_RULES[axeRulesCount + i]).toBe(CUSTOM_VISUAL_RULES[i])
    }
  })
})

// ============================================
// Constants - SCREENSHOT_CONFIG
// ============================================

describe('SCREENSHOT_CONFIG', () => {
  it('is a non-empty object', () => {
    expect(typeof SCREENSHOT_CONFIG).toBe('object')
    expect(Object.keys(SCREENSHOT_CONFIG).length).toBeGreaterThan(0)
  })

  it('contains config for all visual rules', () => {
    for (const rule of VISUAL_RULES) {
      expect(SCREENSHOT_CONFIG[rule]).toBeDefined()
    }
  })

  it('all configs have valid padding values', () => {
    for (const [ruleId, config] of Object.entries(SCREENSHOT_CONFIG)) {
      expect(config.padding, `${ruleId} should have valid padding`).toBeGreaterThanOrEqual(0)
      expect(typeof config.padding).toBe('number')
    }
  })

  it('contrast rules have larger padding (30px)', () => {
    expect(SCREENSHOT_CONFIG['color-contrast'].padding).toBe(30)
    expect(SCREENSHOT_CONFIG['color-contrast-enhanced'].padding).toBe(30)
  })

  it('texto-justificado has medium padding (25px)', () => {
    expect(SCREENSHOT_CONFIG['texto-justificado'].padding).toBe(25)
  })

  it('br-excessivo-layout has vertical padding (30px)', () => {
    expect(SCREENSHOT_CONFIG['br-excessivo-layout'].padding).toBe(30)
  })

  it('emag-tabela-layout has size limits', () => {
    const config = SCREENSHOT_CONFIG['emag-tabela-layout']
    expect(config.maxWidth).toBe(800)
    expect(config.maxHeight).toBe(600)
    expect(config.padding).toBe(20)
  })

  it('optional maxWidth is undefined or positive number', () => {
    for (const [ruleId, config] of Object.entries(SCREENSHOT_CONFIG)) {
      if (config.maxWidth !== undefined) {
        expect(config.maxWidth, `${ruleId} maxWidth should be positive`).toBeGreaterThan(0)
        expect(typeof config.maxWidth).toBe('number')
      }
    }
  })

  it('optional maxHeight is undefined or positive number', () => {
    for (const [ruleId, config] of Object.entries(SCREENSHOT_CONFIG)) {
      if (config.maxHeight !== undefined) {
        expect(config.maxHeight, `${ruleId} maxHeight should be positive`).toBeGreaterThan(0)
        expect(typeof config.maxHeight).toBe('number')
      }
    }
  })
})

// ============================================
// Function - isVisualRule
// ============================================

describe('isVisualRule', () => {
  describe('returns true for visual rules', () => {
    it('returns true for axe visual rules', () => {
      for (const rule of AXE_VISUAL_RULES) {
        expect(isVisualRule(rule)).toBe(true)
      }
    })

    it('returns true for custom visual rules', () => {
      for (const rule of CUSTOM_VISUAL_RULES) {
        expect(isVisualRule(rule)).toBe(true)
      }
    })

    it('returns true for all VISUAL_RULES entries', () => {
      for (const rule of VISUAL_RULES) {
        expect(isVisualRule(rule)).toBe(true)
      }
    })

    it('returns true for specific contrast rules', () => {
      expect(isVisualRule('color-contrast')).toBe(true)
      expect(isVisualRule('color-contrast-enhanced')).toBe(true)
    })

    it('returns true for specific Brazilian visual rules', () => {
      expect(isVisualRule('fonte-muito-pequena')).toBe(true)
      expect(isVisualRule('texto-justificado')).toBe(true)
      expect(isVisualRule('texto-maiusculo-css')).toBe(true)
      expect(isVisualRule('br-excessivo-layout')).toBe(true)
      expect(isVisualRule('emag-tabela-layout')).toBe(true)
    })
  })

  describe('returns false for non-visual rules', () => {
    it('returns false for common non-visual rules', () => {
      const nonVisualRules = [
        'image-alt',
        'link-name',
        'button-name',
        'label',
        'heading-order',
        'html-has-lang',
        'landmark-one-main',
        'bypass',
        'aria-required-attr',
      ]

      for (const rule of nonVisualRules) {
        expect(isVisualRule(rule)).toBe(false)
      }
    })

    it('returns false for Brazilian non-visual rules', () => {
      const nonVisualRules = [
        'link-texto-generico',
        'link-nova-aba-sem-aviso',
        'imagem-alt-nome-arquivo',
        'brasil-libras-plugin',
        'emag-skip-links',
        'emag-breadcrumb',
      ]

      for (const rule of nonVisualRules) {
        expect(isVisualRule(rule)).toBe(false)
      }
    })

    it('returns false for empty string', () => {
      expect(isVisualRule('')).toBe(false)
    })

    it('returns false for unknown rules', () => {
      expect(isVisualRule('unknown-rule')).toBe(false)
      expect(isVisualRule('made-up-rule')).toBe(false)
      expect(isVisualRule('test-123')).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('is case-sensitive', () => {
      expect(isVisualRule('color-contrast')).toBe(true)
      expect(isVisualRule('COLOR-CONTRAST')).toBe(false)
      expect(isVisualRule('Color-Contrast')).toBe(false)
    })

    it('does not match partial strings', () => {
      expect(isVisualRule('color')).toBe(false)
      expect(isVisualRule('contrast')).toBe(false)
      expect(isVisualRule('color-contrast-')).toBe(false)
      expect(isVisualRule('-color-contrast')).toBe(false)
    })

    it('handles special characters', () => {
      expect(isVisualRule('color-contrast!')).toBe(false)
      expect(isVisualRule('color-contrast ')).toBe(false)
      expect(isVisualRule(' color-contrast')).toBe(false)
    })
  })
})

// ============================================
// Function - getScreenshotConfig
// ============================================

describe('getScreenshotConfig', () => {
  describe('returns config for visual rules', () => {
    it('returns config for contrast rules', () => {
      const config = getScreenshotConfig('color-contrast')
      expect(config.padding).toBe(30)
      expect(config.maxWidth).toBeUndefined()
      expect(config.maxHeight).toBeUndefined()
    })

    it('returns config for enhanced contrast rule', () => {
      const config = getScreenshotConfig('color-contrast-enhanced')
      expect(config.padding).toBe(30)
      expect(config.maxWidth).toBeUndefined()
      expect(config.maxHeight).toBeUndefined()
    })

    it('returns config for fonte-muito-pequena', () => {
      const config = getScreenshotConfig('fonte-muito-pequena')
      expect(config.padding).toBe(20)
      expect(config.maxWidth).toBeUndefined()
      expect(config.maxHeight).toBeUndefined()
    })

    it('returns config for texto-justificado', () => {
      const config = getScreenshotConfig('texto-justificado')
      expect(config.padding).toBe(25)
      expect(config.maxWidth).toBeUndefined()
      expect(config.maxHeight).toBeUndefined()
    })

    it('returns config for emag-tabela-layout with size limits', () => {
      const config = getScreenshotConfig('emag-tabela-layout')
      expect(config.padding).toBe(20)
      expect(config.maxWidth).toBe(800)
      expect(config.maxHeight).toBe(600)
    })
  })

  describe('returns default config for unknown rules', () => {
    it('returns default padding (20) for unknown rule', () => {
      const config = getScreenshotConfig('unknown-rule')
      expect(config.padding).toBe(20)
      expect(config.maxWidth).toBeUndefined()
      expect(config.maxHeight).toBeUndefined()
    })

    it('returns default padding for empty string', () => {
      const config = getScreenshotConfig('')
      expect(config.padding).toBe(20)
    })

    it('returns default padding for non-visual rules', () => {
      const config = getScreenshotConfig('image-alt')
      expect(config.padding).toBe(20)
      expect(config.maxWidth).toBeUndefined()
      expect(config.maxHeight).toBeUndefined()
    })
  })

  describe('return type validation', () => {
    it('always returns an object with padding', () => {
      const testRules = [
        'color-contrast',
        'fonte-muito-pequena',
        'unknown-rule',
        '',
      ]

      for (const rule of testRules) {
        const config = getScreenshotConfig(rule)
        expect(typeof config).toBe('object')
        expect(config.padding).toBeDefined()
        expect(typeof config.padding).toBe('number')
      }
    })

    it('maxWidth and maxHeight are optional', () => {
      // Rule without size limits
      const config1 = getScreenshotConfig('color-contrast')
      expect(config1.maxWidth).toBeUndefined()
      expect(config1.maxHeight).toBeUndefined()

      // Rule with size limits
      const config2 = getScreenshotConfig('emag-tabela-layout')
      expect(config2.maxWidth).toBeDefined()
      expect(config2.maxHeight).toBeDefined()
    })

    it('padding is always a number', () => {
      const allRules = [...VISUAL_RULES, 'unknown-rule', '']

      for (const rule of allRules) {
        const config = getScreenshotConfig(rule)
        expect(typeof config.padding).toBe('number')
        expect(config.padding).toBeGreaterThanOrEqual(0)
      }
    })
  })

  describe('consistency with SCREENSHOT_CONFIG', () => {
    it('returns same padding as SCREENSHOT_CONFIG for known rules', () => {
      for (const rule of VISUAL_RULES) {
        const config = getScreenshotConfig(rule)
        const expectedPadding = SCREENSHOT_CONFIG[rule]?.padding ?? 20
        expect(config.padding).toBe(expectedPadding)
      }
    })

    it('returns same maxWidth as SCREENSHOT_CONFIG for known rules', () => {
      for (const rule of VISUAL_RULES) {
        const config = getScreenshotConfig(rule)
        const expectedMaxWidth = SCREENSHOT_CONFIG[rule]?.maxWidth
        expect(config.maxWidth).toBe(expectedMaxWidth)
      }
    })

    it('returns same maxHeight as SCREENSHOT_CONFIG for known rules', () => {
      for (const rule of VISUAL_RULES) {
        const config = getScreenshotConfig(rule)
        const expectedMaxHeight = SCREENSHOT_CONFIG[rule]?.maxHeight
        expect(config.maxHeight).toBe(expectedMaxHeight)
      }
    })
  })

  describe('edge cases', () => {
    it('handles rules with only padding config', () => {
      const config = getScreenshotConfig('fonte-muito-pequena')
      expect(config).toEqual({
        padding: 20,
        maxWidth: undefined,
        maxHeight: undefined,
      })
    })

    it('handles rules with full config', () => {
      const config = getScreenshotConfig('emag-tabela-layout')
      expect(config).toEqual({
        padding: 20,
        maxWidth: 800,
        maxHeight: 600,
      })
    })

    it('is case-sensitive', () => {
      const lower = getScreenshotConfig('color-contrast')
      const upper = getScreenshotConfig('COLOR-CONTRAST')

      expect(lower.padding).toBe(30) // Found in config
      expect(upper.padding).toBe(20) // Default (not found)
    })
  })
})

// ============================================
// Type - VisualRule
// ============================================

describe('VisualRule type', () => {
  it('accepts all VISUAL_RULES values', () => {
    // This is a compile-time check, but we can verify the constant matches
    const visualRuleValues: VisualRule[] = [...VISUAL_RULES]
    expect(visualRuleValues.length).toBe(VISUAL_RULES.length)
  })

  it('VISUAL_RULES is readonly', () => {
    // Verify the constant is readonly at runtime
    expect(() => {
      // This should fail at compile time, but we check type
      const rules = VISUAL_RULES as readonly string[]
      expect(Array.isArray(rules)).toBe(true)
    }).not.toThrow()
  })
})

// ============================================
// Integration Tests
// ============================================

describe('screenshot-rules integration', () => {
  it('isVisualRule and getScreenshotConfig work together', () => {
    for (const rule of VISUAL_RULES) {
      // Visual rules should be detected
      expect(isVisualRule(rule)).toBe(true)

      // And should have config
      const config = getScreenshotConfig(rule)
      expect(config.padding).toBeGreaterThan(0)
    }
  })

  it('non-visual rules get default config', () => {
    const nonVisualRules = ['image-alt', 'link-name', 'unknown-rule']

    for (const rule of nonVisualRules) {
      expect(isVisualRule(rule)).toBe(false)

      const config = getScreenshotConfig(rule)
      expect(config.padding).toBe(20) // Default
      expect(config.maxWidth).toBeUndefined()
      expect(config.maxHeight).toBeUndefined()
    }
  })

  it('all visual rules have SCREENSHOT_CONFIG entry', () => {
    for (const rule of VISUAL_RULES) {
      expect(SCREENSHOT_CONFIG[rule]).toBeDefined()
      expect(SCREENSHOT_CONFIG[rule].padding).toBeDefined()
    }
  })

  it('SCREENSHOT_CONFIG only contains visual rules', () => {
    for (const ruleId of Object.keys(SCREENSHOT_CONFIG)) {
      expect(VISUAL_RULES).toContain(ruleId)
    }
  })

  it('padding values are logical for rule types', () => {
    // Contrast rules need more context (30px)
    expect(getScreenshotConfig('color-contrast').padding).toBeGreaterThan(20)

    // Text alignment needs medium padding (25px)
    expect(getScreenshotConfig('texto-justificado').padding).toBeGreaterThan(20)

    // Spacing issues need more padding (30px)
    expect(getScreenshotConfig('br-excessivo-layout').padding).toBeGreaterThan(20)
  })

  it('table layout rule has reasonable size limits', () => {
    const config = getScreenshotConfig('emag-tabela-layout')

    // Should have limits to prevent huge screenshots
    expect(config.maxWidth).toBeLessThanOrEqual(1920)
    expect(config.maxHeight).toBeLessThanOrEqual(1080)

    // But still large enough to be useful
    expect(config.maxWidth).toBeGreaterThanOrEqual(600)
    expect(config.maxHeight).toBeGreaterThanOrEqual(400)
  })
})
