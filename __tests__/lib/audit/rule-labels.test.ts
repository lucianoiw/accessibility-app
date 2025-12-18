import { describe, it, expect } from 'vitest'
import { RULE_LABELS, getRuleLabel } from '@/lib/audit/rule-labels'

// ============================================
// RULE_LABELS constant
// ============================================

describe('RULE_LABELS', () => {
  it('is a non-empty object', () => {
    expect(typeof RULE_LABELS).toBe('object')
    expect(Object.keys(RULE_LABELS).length).toBeGreaterThan(0)
  })

  it('contains Brazilian custom rules', () => {
    const brazilianRules = [
      'link-texto-generico',
      'link-nova-aba-sem-aviso',
      'imagem-alt-nome-arquivo',
      'texto-justificado',
      'texto-maiusculo-css',
      'br-excessivo-layout',
      'fonte-muito-pequena',
      'conteudo-lorem-ipsum',
      'brasil-libras-plugin',
    ]

    for (const rule of brazilianRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
      expect(typeof RULE_LABELS[rule]).toBe('string')
      expect(RULE_LABELS[rule].length).toBeGreaterThan(0)
    }
  })

  it('contains eMAG specific rules', () => {
    const emagRules = [
      'emag-skip-links',
      'emag-atalhos-teclado',
      'emag-links-adjacentes',
      'emag-breadcrumb',
      'emag-tabela-layout',
      'emag-pdf-acessivel',
      'autoplay-video-audio',
      'carrossel-sem-controles',
      'refresh-automatico',
      'barra-acessibilidade-gov-br',
    ]

    for (const rule of emagRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
      expect(typeof RULE_LABELS[rule]).toBe('string')
    }
  })

  it('contains COGA (cognitive accessibility) rules', () => {
    const cogaRules = [
      'legibilidade-texto-complexo',
      'siglas-sem-expansao',
      'linguagem-inconsistente',
      'timeout-sem-aviso',
      'captcha-sem-alternativa',
      'animacao-sem-pause',
    ]

    for (const rule of cogaRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
      expect(typeof RULE_LABELS[rule]).toBe('string')
    }
  })

  it('contains axe-core image rules', () => {
    const imageRules = [
      'image-alt',
      'image-redundant-alt',
      'input-image-alt',
      'area-alt',
      'object-alt',
      'svg-img-alt',
      'role-img-alt',
    ]

    for (const rule of imageRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
    }
  })

  it('contains axe-core contrast rules', () => {
    expect(RULE_LABELS['color-contrast']).toBeDefined()
    expect(RULE_LABELS['color-contrast-enhanced']).toBeDefined()
    expect(RULE_LABELS['link-in-text-block']).toBeDefined()
  })

  it('contains axe-core form rules', () => {
    const formRules = [
      'label',
      'label-title-only',
      'input-button-name',
      'select-name',
      'autocomplete-valid',
      'form-field-multiple-labels',
    ]

    for (const rule of formRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
    }
  })

  it('contains axe-core structure rules', () => {
    const structureRules = [
      'region',
      'landmark-one-main',
      'landmark-no-duplicate-banner',
      'landmark-no-duplicate-contentinfo',
      'landmark-no-duplicate-main',
      'landmark-unique',
      'bypass',
    ]

    for (const rule of structureRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
    }
  })

  it('contains axe-core heading rules', () => {
    const headingRules = [
      'heading-order',
      'empty-heading',
      'page-has-heading-one',
      'duplicate-id-aria',
      'duplicate-id-active',
      'duplicate-id',
    ]

    for (const rule of headingRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
    }
  })

  it('contains axe-core ARIA rules', () => {
    const ariaRules = [
      'aria-allowed-attr',
      'aria-allowed-role',
      'aria-command-name',
      'aria-dialog-name',
      'aria-hidden-body',
      'aria-hidden-focus',
      'aria-input-field-name',
      'aria-required-attr',
      'aria-required-children',
      'aria-required-parent',
      'aria-roles',
      'aria-valid-attr-value',
      'aria-valid-attr',
    ]

    for (const rule of ariaRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
    }
  })

  it('contains axe-core keyboard rules', () => {
    const keyboardRules = [
      'tabindex',
      'focus-visible',
      'scrollable-region-focusable',
      'nested-interactive',
    ]

    for (const rule of keyboardRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
    }
  })

  it('contains axe-core language rules', () => {
    const langRules = [
      'html-has-lang',
      'html-lang-valid',
      'html-xml-lang-mismatch',
      'valid-lang',
    ]

    for (const rule of langRules) {
      expect(RULE_LABELS[rule]).toBeDefined()
    }
  })

  it('all labels are in Portuguese', () => {
    // Check some labels contain Portuguese characters/words
    expect(RULE_LABELS['link-texto-generico']).toContain('genérico')
    expect(RULE_LABELS['imagem-alt-nome-arquivo']).toContain('arquivo')
    expect(RULE_LABELS['texto-justificado']).toContain('justificado')
    expect(RULE_LABELS['label']).toContain('label')
    expect(RULE_LABELS['heading-order']).toContain('Hierarquia')
  })

  it('has no empty labels', () => {
    for (const [ruleId, label] of Object.entries(RULE_LABELS)) {
      expect(label.trim().length, `Label for ${ruleId} should not be empty`).toBeGreaterThan(0)
    }
  })
})

// ============================================
// getRuleLabel function
// ============================================

describe('getRuleLabel', () => {
  it('returns mapped label for known rules', () => {
    expect(getRuleLabel('link-texto-generico')).toBe('Link com texto genérico')
    expect(getRuleLabel('image-alt')).toBe('Imagem sem texto alternativo')
    expect(getRuleLabel('color-contrast')).toBe('Contraste de cores insuficiente')
    expect(getRuleLabel('heading-order')).toBe('Hierarquia de headings incorreta')
  })

  it('returns formatted ID for unknown rules', () => {
    // Unknown rules should be formatted nicely
    const result = getRuleLabel('some-unknown-rule')
    expect(result).toBe('Some Unknown Rule')
  })

  it('handles camelCase formatting in fallback', () => {
    const result = getRuleLabel('someUnknownCamelCase')
    expect(result).toBe('Some Unknown Camel Case')
  })

  it('handles mixed formatting in fallback', () => {
    const result = getRuleLabel('some-mixedCase-rule')
    expect(result).toBe('Some Mixed Case Rule')
  })

  it('handles single word rules', () => {
    const result = getRuleLabel('bypass')
    expect(result).toBe('Sem mecanismo de skip')
  })

  it('handles empty string', () => {
    const result = getRuleLabel('')
    expect(result).toBe('')
  })

  it('returns consistent results for all mapped rules', () => {
    for (const ruleId of Object.keys(RULE_LABELS)) {
      const result = getRuleLabel(ruleId)
      expect(result).toBe(RULE_LABELS[ruleId])
    }
  })
})

// ============================================
// formatRuleId function (tested via getRuleLabel)
// ============================================

describe('formatRuleId fallback behavior', () => {
  it('capitalizes first letter of each word', () => {
    expect(getRuleLabel('test-rule')).toBe('Test Rule')
  })

  it('handles underscores', () => {
    // Note: The function replaces hyphens, not underscores
    // This tests the actual behavior
    expect(getRuleLabel('test_rule')).toBe('Test_rule')
  })

  it('handles numbers', () => {
    expect(getRuleLabel('test-rule-123')).toBe('Test Rule 123')
  })

  it('handles multiple hyphens', () => {
    expect(getRuleLabel('a-b-c-d-e')).toBe('A B C D E')
  })

  it('preserves uppercase in camelCase', () => {
    // camelCase should be split
    expect(getRuleLabel('testRuleName')).toBe('Test Rule Name')
  })
})
