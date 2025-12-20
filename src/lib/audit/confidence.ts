import type {
  ConfidenceLevel,
  ConfidenceMetadata,
  ConfidenceSignal,
  ReviewReason
} from '@/types'

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Confidence configuration per rule
 * Defines base level and conditions for adjustment
 */
interface RuleConfidenceConfig {
  baseLevel: ConfidenceLevel
  baseScore: number
  isExperimental?: boolean
  // Function to calculate confidence based on element context
  calculateConfidence?: (context: ElementContext) => ConfidenceAdjustment
}

interface ConfidenceAdjustment {
  level?: ConfidenceLevel
  scoreAdjustment: number  // -1.0 to +1.0
  signals: ConfidenceSignal[]
  reason?: ReviewReason
}

export interface ElementContext {
  html: string
  selector: string
  parentHtml: string | null
  pageUrl: string
  // Extra data extracted during audit
  attributes?: Record<string, string>
  computedStyles?: Record<string, string>
  surroundingText?: string
}

// ============================================
// AXE-CORE RULES - CONFIDENCE CONFIGURATION
// ============================================

/**
 * axe-core rules are generally high confidence
 * We only map those that need adjustment
 */
export const AXE_RULE_CONFIDENCE: Record<string, RuleConfidenceConfig> = {
  // HIGH CONFIDENCE (certain) - Default for axe-core
  'image-alt': {
    baseLevel: 'certain',
    baseScore: 1.0,
  },
  'button-name': {
    baseLevel: 'certain',
    baseScore: 1.0,
  },
  'link-name': {
    baseLevel: 'certain',
    baseScore: 1.0,
  },

  // MEDIUM CONFIDENCE (likely) - May have exceptions
  'color-contrast': {
    baseLevel: 'likely',
    baseScore: 0.85,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []
      let adjustment = 0

      // If element has decorative, icon, etc classes
      if (/\b(decorat|icon|logo|brand)\w*/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'possibly_decorative_class',
          weight: 0.3,
          description: 'Element may be decorative based on CSS classes'
        })
        adjustment -= 0.3
      }

      // If element is very small (probably icon)
      if (ctx.computedStyles?.fontSize && parseFloat(ctx.computedStyles.fontSize) < 10) {
        signals.push({
          type: 'negative',
          signal: 'very_small_text',
          weight: 0.2,
          description: 'Very small text, may be icon or decorative'
        })
        adjustment -= 0.2
      }

      return { scoreAdjustment: adjustment, signals }
    }
  },

  // NEEDS REVIEW (needs_review)
  'landmark-one-main': {
    baseLevel: 'needs_review',
    baseScore: 0.6,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'structural_choice',
        weight: 0.4,
        description: 'Missing main landmark may be valid architectural choice'
      }],
      reason: 'context_dependent'
    })
  },

  'region': {
    baseLevel: 'needs_review',
    baseScore: 0.5,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'structural_flexibility',
        weight: 0.5,
        description: 'Not all content needs to be in a landmark'
      }],
      reason: 'context_dependent'
    })
  },
}

// ============================================
// CUSTOM RULES - CONFIDENCE CONFIGURATION
// ============================================

export const CUSTOM_RULE_CONFIDENCE: Record<string, RuleConfidenceConfig> = {
  // HIGH CONFIDENCE
  'link-nova-aba-sem-aviso': {
    baseLevel: 'certain',
    baseScore: 0.95,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []
      let adjustment = 0

      // If has external link icon (common in design systems)
      if (/external|arrow|open|window/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_external_icon',
          weight: 0.5,
          description: 'May have icon indicating external link'
        })
        adjustment -= 0.5
      }

      // If has sr-only text
      if (/sr-only|visually-hidden|screen-reader/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_sr_text',
          weight: 0.7,
          description: 'May have hidden text for screen readers'
        })
        adjustment -= 0.7
      }

      return { scoreAdjustment: adjustment, signals }
    }
  },

  'imagem-alt-nome-arquivo': {
    baseLevel: 'likely',
    baseScore: 0.90,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // Extract alt from HTML
      const altMatch = ctx.html.match(/alt=["']([^"']+)["']/i)
      const alt = altMatch?.[1] || ''

      // If alt is clearly a filename (IMG_20241220.jpg)
      if (/^(IMG_|DSC|PHOTO_|Screenshot)\d+/i.test(alt)) {
        signals.push({
          type: 'positive',
          signal: 'clear_filename_pattern',
          weight: 0.95,
          description: 'Alt text follows clear filename pattern'
        })
        return { scoreAdjustment: 0.05, signals }
      }

      // If looks like name but may be intentional (logo-empresa.png)
      if (/logo|brand|icon/i.test(alt)) {
        signals.push({
          type: 'negative',
          signal: 'possibly_intentional_name',
          weight: 0.3,
          description: 'Name may be intentional description of logo/icon'
        })
        return {
          scoreAdjustment: -0.3,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'link-texto-generico': {
    baseLevel: 'needs_review',
    baseScore: 0.70,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []
      let adjustment = 0

      // If link is inside context that explains (e.g., card, article)
      if (ctx.parentHtml && /article|card|product|item/i.test(ctx.parentHtml)) {
        signals.push({
          type: 'negative',
          signal: 'has_surrounding_context',
          weight: 0.4,
          description: 'Link is in context that may provide meaning'
        })
        adjustment -= 0.4
      }

      // If has aria-describedby or aria-labelledby
      if (/aria-(describedby|labelledby)/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_aria_description',
          weight: 0.6,
          description: 'Link has description via ARIA'
        })
        adjustment -= 0.6
      }

      return {
        scoreAdjustment: adjustment,
        signals,
        reason: 'context_dependent'
      }
    }
  },

  // Sign language plugin rule (VLibras, HandTalk, SignAll, etc)
  // Note: The ruleId 'brasil-libras-plugin' is kept for compatibility,
  // but the rule should be renamed to 'sign-language-plugin' in the future
  'brasil-libras-plugin': {
    baseLevel: 'needs_review',
    baseScore: 0.60,
    isExperimental: true,
    calculateConfidence: () => {
      const signals: ConfidenceSignal[] = []

      // We can only verify if the script exists, not if it works
      signals.push({
        type: 'negative',
        signal: 'cannot_verify_functionality',
        weight: 0.4,
        description: 'Cannot verify if sign language plugin is working correctly'
      })

      return {
        scoreAdjustment: 0,
        signals,
        reason: 'external_resource'
      }
    }
  },

  'emag-skip-links': {
    baseLevel: 'likely',
    baseScore: 0.80,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If page is very simple (few sections), skip link is less critical
      if (ctx.surroundingText && ctx.surroundingText.length < 500) {
        signals.push({
          type: 'negative',
          signal: 'simple_page',
          weight: 0.3,
          description: 'Simple page may not need skip links'
        })
        return {
          scoreAdjustment: -0.3,
          signals,
          reason: 'context_dependent'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'emag-breadcrumb': {
    baseLevel: 'needs_review',
    baseScore: 0.50,
    isExperimental: true,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'design_choice',
        weight: 0.5,
        description: 'Breadcrumb is a recommendation, not a requirement'
      }],
      reason: 'user_preference'
    })
  },

  'texto-justificado': {
    baseLevel: 'likely',
    baseScore: 0.75,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If is small text block, impact is lower
      const textLength = ctx.html.replace(/<[^>]+>/g, '').length
      if (textLength < 200) {
        signals.push({
          type: 'negative',
          signal: 'short_text_block',
          weight: 0.3,
          description: 'Short text block has lower impact'
        })
        return {
          scoreAdjustment: -0.3,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'fonte-muito-pequena': {
    baseLevel: 'likely',
    baseScore: 0.80,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If is form label, legend, or footnote - may be intentional
      if (/label|legend|caption|footnote|small|sup|sub/i.test(ctx.selector)) {
        signals.push({
          type: 'negative',
          signal: 'semantic_small_text',
          weight: 0.4,
          description: 'Small text may be semantically appropriate'
        })
        return {
          scoreAdjustment: -0.4,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  // COGA RULES - Generally need review
  'legibilidade-texto-complexo': {
    baseLevel: 'needs_review',
    baseScore: 0.60,
    isExperimental: true,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'subjective_metric',
        weight: 0.4,
        description: 'Readability is a subjective metric, varies by target audience'
      }],
      reason: 'context_dependent'
    })
  },

  'siglas-sem-expansao': {
    baseLevel: 'needs_review',
    baseScore: 0.65,
    isExperimental: true,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // Very common acronyms (HTML, CSS, URL) may not need expansion
      const commonAcronyms = ['HTML', 'CSS', 'URL', 'API', 'PDF', 'FAQ', 'CEO', 'CFO']
      const hasCommonAcronym = commonAcronyms.some(a => ctx.html.includes(a))

      if (hasCommonAcronym) {
        signals.push({
          type: 'negative',
          signal: 'common_acronym',
          weight: 0.5,
          description: 'Acronym is widely known'
        })
        return {
          scoreAdjustment: -0.5,
          signals,
          reason: 'context_dependent'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'texto-maiusculo-css': {
    baseLevel: 'likely',
    baseScore: 0.75,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If is navigation, button, or short text - may be intentional
      if (/nav|button|btn|header|h[1-6]/i.test(ctx.selector)) {
        signals.push({
          type: 'negative',
          signal: 'ui_element',
          weight: 0.3,
          description: 'Uppercase in UI elements is common design choice'
        })
        return {
          scoreAdjustment: -0.3,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'br-excessivo-layout': {
    baseLevel: 'likely',
    baseScore: 0.80,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'positive',
        signal: 'clear_layout_issue',
        weight: 0.8,
        description: 'Multiple BR tags for layout is a clear anti-pattern'
      }]
    })
  },

  'atributo-title-redundante': {
    baseLevel: 'likely',
    baseScore: 0.70,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'may_be_intentional',
        weight: 0.3,
        description: 'Redundant title may provide touch device tooltip'
      }],
      reason: 'user_preference'
    })
  },

  'rotulo-curto-ambiguo': {
    baseLevel: 'needs_review',
    baseScore: 0.65,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If has aria-label or title providing context
      if (/aria-label|title=/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_accessible_name',
          weight: 0.6,
          description: 'Element may have accessible name via ARIA or title'
        })
        return {
          scoreAdjustment: -0.4,
          signals,
          reason: 'context_dependent'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'conteudo-lorem-ipsum': {
    baseLevel: 'certain',
    baseScore: 0.95,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'positive',
        signal: 'clear_placeholder',
        weight: 0.95,
        description: 'Lorem ipsum is clearly placeholder content'
      }]
    })
  },

  'emag-atalhos-teclado': {
    baseLevel: 'needs_review',
    baseScore: 0.60,
    isExperimental: true,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'gov_specific',
        weight: 0.4,
        description: 'Keyboard shortcuts are specific to gov.br sites'
      }],
      reason: 'context_dependent'
    })
  },

  'emag-links-adjacentes': {
    baseLevel: 'likely',
    baseScore: 0.75,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'visual_separation_may_exist',
        weight: 0.25,
        description: 'Visual separation may exist via CSS'
      }],
      reason: 'detection_limited'
    })
  },

  'emag-tabela-layout': {
    baseLevel: 'likely',
    baseScore: 0.80,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If has role="presentation", it's correctly marked
      if (/role=["']presentation["']/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_presentation_role',
          weight: 0.8,
          description: 'Table is marked as presentational'
        })
        return {
          scoreAdjustment: -0.6,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'emag-pdf-acessivel': {
    baseLevel: 'needs_review',
    baseScore: 0.55,
    isExperimental: true,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'cannot_verify_pdf_content',
        weight: 0.45,
        description: 'Cannot automatically verify PDF accessibility'
      }],
      reason: 'external_resource'
    })
  },

  'autoplay-video-audio': {
    baseLevel: 'certain',
    baseScore: 0.90,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If muted attribute is present, less critical
      if (/muted/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'is_muted',
          weight: 0.3,
          description: 'Muted autoplay is less disruptive'
        })
        return {
          scoreAdjustment: -0.2,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'carrossel-sem-controles': {
    baseLevel: 'likely',
    baseScore: 0.80,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'controls_may_be_dynamic',
        weight: 0.2,
        description: 'Controls may be added dynamically via JavaScript'
      }],
      reason: 'detection_limited'
    })
  },

  'refresh-automatico': {
    baseLevel: 'certain',
    baseScore: 0.95,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'positive',
        signal: 'clear_violation',
        weight: 0.95,
        description: 'Auto-refresh is a clear accessibility barrier'
      }]
    })
  },

  'barra-acessibilidade-gov-br': {
    baseLevel: 'needs_review',
    baseScore: 0.60,
    isExperimental: true,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'gov_specific_requirement',
        weight: 0.4,
        description: 'Accessibility bar is specific to gov.br sites'
      }],
      reason: 'context_dependent'
    })
  },

  // COGA additional rules
  'linguagem-inconsistente': {
    baseLevel: 'needs_review',
    baseScore: 0.60,
    isExperimental: true,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'language_detection_imperfect',
        weight: 0.4,
        description: 'Language detection may have false positives'
      }],
      reason: 'detection_limited'
    })
  },

  'timeout-sem-aviso': {
    baseLevel: 'needs_review',
    baseScore: 0.65,
    isExperimental: true,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'timeout_detection_limited',
        weight: 0.35,
        description: 'Timeout warning detection is limited'
      }],
      reason: 'detection_limited'
    })
  },

  'captcha-sem-alternativa': {
    baseLevel: 'likely',
    baseScore: 0.75,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // reCAPTCHA v3 is invisible and accessible
      if (/recaptcha.*v3|invisible/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'invisible_captcha',
          weight: 0.7,
          description: 'Invisible CAPTCHA does not require user interaction'
        })
        return {
          scoreAdjustment: -0.5,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },

  'animacao-sem-pause': {
    baseLevel: 'likely',
    baseScore: 0.80,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // If prefers-reduced-motion is respected
      if (/prefers-reduced-motion/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'respects_reduced_motion',
          weight: 0.6,
          description: 'Animation respects reduced motion preference'
        })
        return {
          scoreAdjustment: -0.4,
          signals,
          reason: 'possibly_intentional'
        }
      }

      return { scoreAdjustment: 0, signals }
    }
  },
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Calculates confidence for a violation
 */
export function calculateConfidence(
  ruleId: string,
  isCustomRule: boolean,
  context: ElementContext
): ConfidenceMetadata {
  // Get rule config
  const config = isCustomRule
    ? CUSTOM_RULE_CONFIDENCE[ruleId]
    : AXE_RULE_CONFIDENCE[ruleId]

  // If no specific config, use defaults
  if (!config) {
    return {
      level: isCustomRule ? 'likely' : 'certain',
      score: isCustomRule ? 0.85 : 0.95,
      signals: []
    }
  }

  // Calculate adjustments based on context
  const adjustment = config.calculateConfidence?.(context) ?? {
    scoreAdjustment: 0,
    signals: []
  }

  // Calculate final score
  const finalScore = Math.max(0, Math.min(1, config.baseScore + adjustment.scoreAdjustment))

  // Determine level based on score
  let finalLevel: ConfidenceLevel = config.baseLevel
  if (adjustment.level) {
    finalLevel = adjustment.level
  } else if (finalScore >= 0.9) {
    finalLevel = 'certain'
  } else if (finalScore >= 0.7) {
    finalLevel = 'likely'
  } else {
    finalLevel = 'needs_review'
  }

  return {
    level: finalLevel,
    score: Math.round(finalScore * 100) / 100,
    reason: adjustment.reason,
    signals: adjustment.signals
  }
}

/**
 * Checks if a rule is experimental
 */
export function isExperimentalRule(ruleId: string, isCustomRule: boolean): boolean {
  if (!isCustomRule) return false
  return CUSTOM_RULE_CONFIDENCE[ruleId]?.isExperimental ?? false
}

/**
 * Returns readable label for confidence level
 */
export function getConfidenceLevelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'certain':
      return 'Certain'
    case 'likely':
      return 'Likely'
    case 'needs_review':
      return 'Needs Review'
  }
}

/**
 * Returns CSS color classes for confidence level
 */
export function getConfidenceLevelColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'certain':
      return 'text-green-600 bg-green-50 border-green-200'
    case 'likely':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    case 'needs_review':
      return 'text-orange-600 bg-orange-50 border-orange-200'
  }
}

/**
 * Returns icon name for confidence level (Lucide icons)
 */
export function getConfidenceLevelIcon(level: ConfidenceLevel): string {
  switch (level) {
    case 'certain':
      return 'check-circle'
    case 'likely':
      return 'alert-circle'
    case 'needs_review':
      return 'help-circle'
  }
}
