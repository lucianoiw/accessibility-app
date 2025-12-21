import { describe, it, expect } from 'vitest'
import {
  getRuleKnowledge,
  hasRuleKnowledge,
  getRulesWithKnowledge,
  type RuleKnowledge,
} from '@/lib/audit/rule-knowledge'

describe('getRuleKnowledge', () => {
  describe('Brazilian custom rules', () => {
    it('returns knowledge for link-texto-generico', () => {
      const knowledge = getRuleKnowledge('link-texto-generico')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('Links com texto genérico')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.affectedUsers).toContain('cognitive')
      expect(knowledge?.fixSteps).toHaveLength(4)
      expect(knowledge?.codeExamples).toHaveLength(2)
      expect(knowledge?.emagRecommendation).toBe('3.5')
    })

    it('returns knowledge for link-nova-aba-sem-aviso', () => {
      const knowledge = getRuleKnowledge('link-nova-aba-sem-aviso')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('nova aba/janela')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.affectedUsers).toContain('cognitive')
      expect(knowledge?.affectedUsers).toContain('motor')
      expect(knowledge?.fixSteps.length).toBeGreaterThan(0)
      expect(knowledge?.emagRecommendation).toBe('1.9')
    })

    it('returns knowledge for imagem-alt-nome-arquivo', () => {
      const knowledge = getRuleKnowledge('imagem-alt-nome-arquivo')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('nomes de arquivo')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.affectedUsers).toContain('lowVision')
      expect(knowledge?.codeExamples?.length).toBeGreaterThan(0)
    })

    it('returns knowledge for texto-justificado', () => {
      const knowledge = getRuleKnowledge('texto-justificado')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('justificado')
      expect(knowledge?.affectedUsers).toContain('cognitive')
      expect(knowledge?.affectedUsers).toContain('lowVision')
      expect(knowledge?.falsePositiveGuidance).toBeDefined()
    })

    it('returns knowledge for texto-maiusculo-css', () => {
      const knowledge = getRuleKnowledge('texto-maiusculo-css')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('maiúsculas')
      expect(knowledge?.evaluationQuestions).toBeDefined()
      expect(knowledge?.evaluationQuestions?.length).toBeGreaterThan(0)
    })

    it('returns knowledge for br-excessivo-layout', () => {
      const knowledge = getRuleKnowledge('br-excessivo-layout')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('<br>')
      expect(knowledge?.emagRecommendation).toBe('1.6')
    })

    it('returns knowledge for brasil-libras-plugin', () => {
      const knowledge = getRuleKnowledge('brasil-libras-plugin')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('Libras')
      expect(knowledge?.affectedUsers).toContain('deaf')
      expect(knowledge?.evaluationQuestions?.length).toBe(3)
      expect(knowledge?.emagRecommendation).toBe('5.3')
    })
  })

  describe('eMAG specific rules', () => {
    it('returns knowledge for emag-skip-links', () => {
      const knowledge = getRuleKnowledge('emag-skip-links')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('skip links')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.affectedUsers).toContain('motor')
      expect(knowledge?.codeExamples).toHaveLength(1)
      expect(knowledge?.emagRecommendation).toBe('1.5')
    })

    it('returns knowledge for emag-atalhos-teclado', () => {
      const knowledge = getRuleKnowledge('emag-atalhos-teclado')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('Alt+1')
      expect(knowledge?.falsePositiveGuidance).toContain('.gov.br')
      expect(knowledge?.emagRecommendation).toBe('1.5')
    })
  })

  describe('axe-core rules', () => {
    it('returns knowledge for image-alt', () => {
      const knowledge = getRuleKnowledge('image-alt')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('texto alternativo')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.affectedUsers).toContain('lowVision')
      expect(knowledge?.codeExamples).toHaveLength(3)
      expect(knowledge?.codeExamples?.[0].description).toBe('Imagem informativa')
      expect(knowledge?.codeExamples?.[1].description).toBe('Imagem decorativa')
      expect(knowledge?.codeExamples?.[2].description).toBe('Imagem como link')
    })

    it('returns knowledge for color-contrast', () => {
      const knowledge = getRuleKnowledge('color-contrast')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('Contraste')
      expect(knowledge?.affectedUsers).toContain('lowVision')
      expect(knowledge?.affectedUsers).toContain('colorBlind')
      expect(knowledge?.fixSteps).toContain('Use ferramenta de verificação de contraste (WebAIM Contrast Checker)')
      expect(knowledge?.evaluationQuestions).toBeDefined()
    })

    it('returns knowledge for label', () => {
      const knowledge = getRuleKnowledge('label')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('formulário')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.affectedUsers).toContain('cognitive')
      expect(knowledge?.codeExamples?.length).toBe(3)
    })

    it('returns knowledge for button-name', () => {
      const knowledge = getRuleKnowledge('button-name')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('Botões sem nome')
      expect(knowledge?.codeExamples?.length).toBe(1)
    })

    it('returns knowledge for link-name', () => {
      const knowledge = getRuleKnowledge('link-name')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('Links sem nome')
      expect(knowledge?.codeExamples?.length).toBe(2)
    })

    it('returns knowledge for heading-order', () => {
      const knowledge = getRuleKnowledge('heading-order')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('hierarquia')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.affectedUsers).toContain('cognitive')
      expect(knowledge?.falsePositiveGuidance).toContain('componentes reutilizáveis')
    })

    it('returns knowledge for region', () => {
      const knowledge = getRuleKnowledge('region')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('landmarks')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.fixSteps.length).toBeGreaterThan(0)
    })
  })

  describe('COGA rules', () => {
    it('returns knowledge for legibilidade-texto-complexo', () => {
      const knowledge = getRuleKnowledge('legibilidade-texto-complexo')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('dificuldades cognitivas')
      expect(knowledge?.affectedUsers).toContain('cognitive')
      expect(knowledge?.fixSteps.length).toBeGreaterThan(0)
      expect(knowledge?.falsePositiveGuidance).toContain('público-alvo')
      expect(knowledge?.evaluationQuestions?.length).toBe(3)
      expect(knowledge?.emagRecommendation).toBe('3.11')
    })

    it('returns knowledge for siglas-sem-expansao', () => {
      const knowledge = getRuleKnowledge('siglas-sem-expansao')

      expect(knowledge).not.toBeNull()
      expect(knowledge?.whyItMatters).toContain('Siglas')
      expect(knowledge?.affectedUsers).toContain('cognitive')
      expect(knowledge?.affectedUsers).toContain('screenReader')
      expect(knowledge?.codeExamples?.length).toBe(1)
      expect(knowledge?.emagRecommendation).toBe('3.12')
    })
  })

  describe('fallback behavior', () => {
    it('returns null for unknown rules', () => {
      const knowledge = getRuleKnowledge('unknown-rule-id')

      expect(knowledge).toBeNull()
    })

    it('returns null for empty string', () => {
      const knowledge = getRuleKnowledge('')

      expect(knowledge).toBeNull()
    })

    it('returns null for random string', () => {
      const knowledge = getRuleKnowledge('some-random-nonexistent-rule')

      expect(knowledge).toBeNull()
    })
  })

  describe('knowledge structure validation', () => {
    const allRules = getRulesWithKnowledge()

    it('all rules have whyItMatters', () => {
      for (const ruleId of allRules) {
        const knowledge = getRuleKnowledge(ruleId)
        expect(knowledge?.whyItMatters, `${ruleId} should have whyItMatters`).toBeDefined()
        expect(knowledge?.whyItMatters.length, `${ruleId} whyItMatters should not be empty`).toBeGreaterThan(0)
      }
    })

    it('all rules have fixSteps', () => {
      for (const ruleId of allRules) {
        const knowledge = getRuleKnowledge(ruleId)
        expect(knowledge?.fixSteps, `${ruleId} should have fixSteps`).toBeDefined()
        expect(knowledge?.fixSteps.length, `${ruleId} should have at least one fix step`).toBeGreaterThan(0)
      }
    })

    it('all rules have valid affectedUsers', () => {
      const validUserTypes = ['screenReader', 'cognitive', 'motor', 'lowVision', 'deaf', 'colorBlind']

      for (const ruleId of allRules) {
        const knowledge = getRuleKnowledge(ruleId)
        if (knowledge?.affectedUsers) {
          for (const userType of knowledge.affectedUsers) {
            expect(validUserTypes, `${ruleId} has invalid user type: ${userType}`).toContain(userType)
          }
        }
      }
    })

    it('code examples have required fields', () => {
      for (const ruleId of allRules) {
        const knowledge = getRuleKnowledge(ruleId)
        if (knowledge?.codeExamples) {
          for (const example of knowledge.codeExamples) {
            expect(example.before, `${ruleId} code example should have before`).toBeDefined()
            expect(example.after, `${ruleId} code example should have after`).toBeDefined()
            expect(example.before.length, `${ruleId} before code should not be empty`).toBeGreaterThan(0)
            expect(example.after.length, `${ruleId} after code should not be empty`).toBeGreaterThan(0)
          }
        }
      }
    })

    it('evaluation questions are not empty', () => {
      for (const ruleId of allRules) {
        const knowledge = getRuleKnowledge(ruleId)
        if (knowledge?.evaluationQuestions) {
          expect(knowledge.evaluationQuestions.length, `${ruleId} should have at least one question`).toBeGreaterThan(0)
          for (const question of knowledge.evaluationQuestions) {
            expect(question.length, `${ruleId} question should not be empty`).toBeGreaterThan(0)
          }
        }
      }
    })
  })
})

describe('hasRuleKnowledge', () => {
  it('returns true for rules with knowledge', () => {
    expect(hasRuleKnowledge('link-texto-generico')).toBe(true)
    expect(hasRuleKnowledge('image-alt')).toBe(true)
    expect(hasRuleKnowledge('color-contrast')).toBe(true)
    expect(hasRuleKnowledge('emag-skip-links')).toBe(true)
  })

  it('returns false for rules without knowledge', () => {
    expect(hasRuleKnowledge('unknown-rule')).toBe(false)
    expect(hasRuleKnowledge('')).toBe(false)
    expect(hasRuleKnowledge('some-random-rule')).toBe(false)
  })

  it('matches getRuleKnowledge results', () => {
    const allRules = getRulesWithKnowledge()

    for (const ruleId of allRules) {
      expect(hasRuleKnowledge(ruleId)).toBe(true)
      expect(getRuleKnowledge(ruleId)).not.toBeNull()
    }
  })
})

describe('getRulesWithKnowledge', () => {
  it('returns array of rule IDs', () => {
    const rules = getRulesWithKnowledge()

    expect(Array.isArray(rules)).toBe(true)
    expect(rules.length).toBeGreaterThan(0)
  })

  it('contains Brazilian custom rules', () => {
    const rules = getRulesWithKnowledge()

    expect(rules).toContain('link-texto-generico')
    expect(rules).toContain('link-nova-aba-sem-aviso')
    expect(rules).toContain('imagem-alt-nome-arquivo')
    expect(rules).toContain('brasil-libras-plugin')
  })

  it('contains eMAG specific rules', () => {
    const rules = getRulesWithKnowledge()

    expect(rules).toContain('emag-skip-links')
    expect(rules).toContain('emag-atalhos-teclado')
  })

  it('contains axe-core rules', () => {
    const rules = getRulesWithKnowledge()

    expect(rules).toContain('image-alt')
    expect(rules).toContain('color-contrast')
    expect(rules).toContain('label')
    expect(rules).toContain('heading-order')
  })

  it('contains COGA rules', () => {
    const rules = getRulesWithKnowledge()

    expect(rules).toContain('legibilidade-texto-complexo')
    expect(rules).toContain('siglas-sem-expansao')
  })

  it('all returned rules have knowledge', () => {
    const rules = getRulesWithKnowledge()

    for (const ruleId of rules) {
      const knowledge = getRuleKnowledge(ruleId)
      expect(knowledge, `${ruleId} should have knowledge`).not.toBeNull()
    }
  })

  it('has no duplicates', () => {
    const rules = getRulesWithKnowledge()
    const uniqueRules = [...new Set(rules)]

    expect(rules.length).toBe(uniqueRules.length)
  })
})

describe('RuleKnowledge type structure', () => {
  it('has correct TypeScript structure', () => {
    const knowledge = getRuleKnowledge('link-texto-generico')

    // Test that knowledge matches the RuleKnowledge type
    if (knowledge) {
      expect(typeof knowledge.whyItMatters).toBe('string')
      expect(Array.isArray(knowledge.fixSteps)).toBe(true)

      if (knowledge.affectedUsers) {
        expect(Array.isArray(knowledge.affectedUsers)).toBe(true)
      }

      if (knowledge.codeExamples) {
        expect(Array.isArray(knowledge.codeExamples)).toBe(true)
        for (const example of knowledge.codeExamples) {
          expect(typeof example.before).toBe('string')
          expect(typeof example.after).toBe('string')
        }
      }

      if (knowledge.falsePositiveGuidance) {
        expect(typeof knowledge.falsePositiveGuidance).toBe('string')
      }

      if (knowledge.evaluationQuestions) {
        expect(Array.isArray(knowledge.evaluationQuestions)).toBe(true)
      }

      if (knowledge.emagRecommendation) {
        expect(typeof knowledge.emagRecommendation).toBe('string')
      }
    }
  })
})
