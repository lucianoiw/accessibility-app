/**
 * False positive filters applied BEFORE saving violations
 * These are cases where we are certain it is NOT a violation
 */

import type { ViolationResult } from './auditor'

interface FilterResult {
  shouldFilter: boolean
  reason?: string
}

type ViolationFilter = (violation: ViolationResult, pageHtml?: string) => FilterResult

// ============================================
// FILTERS FOR HIDDEN ELEMENTS
// ============================================

/**
 * Filters violations on hidden elements
 * Many tools (including WAVE) ignore hidden elements
 */
const filterHiddenElements: ViolationFilter = (violation) => {
  const html = violation.html.toLowerCase()

  // display: none
  if (/style\s*=\s*["'][^"']*display\s*:\s*none/i.test(html)) {
    return { shouldFilter: true, reason: 'element_display_none' }
  }

  // visibility: hidden
  if (/style\s*=\s*["'][^"']*visibility\s*:\s*hidden/i.test(html)) {
    return { shouldFilter: true, reason: 'element_visibility_hidden' }
  }

  // hidden attribute
  if (/\shidden[\s>]/i.test(html)) {
    return { shouldFilter: true, reason: 'element_hidden_attribute' }
  }

  // aria-hidden="true" (for content purposefully hidden from AT)
  if (/aria-hidden\s*=\s*["']true["']/i.test(html)) {
    return { shouldFilter: true, reason: 'element_aria_hidden' }
  }

  return { shouldFilter: false }
}

// ============================================
// FILTERS FOR DECORATIVE ELEMENTS
// ============================================

/**
 * Filters violations on elements that are probably decorative
 */
const filterDecorativeElements: ViolationFilter = (violation) => {
  const html = violation.html.toLowerCase()
  const selector = violation.selector.toLowerCase()

  // Classes indicating decorative element
  const decorativeClasses = [
    'decorative', 'decoration', 'ornament',
    'icon-only', 'visual-only', 'presentational'
  ]

  if (decorativeClasses.some(c => html.includes(c) || selector.includes(c))) {
    return { shouldFilter: true, reason: 'element_decorative_class' }
  }

  // role="presentation" or role="none"
  if (/role\s*=\s*["'](presentation|none)["']/i.test(html)) {
    return { shouldFilter: true, reason: 'element_presentation_role' }
  }

  // Image with alt="" (intentionally empty = decorative)
  if (violation.ruleId === 'image-alt' && /alt\s*=\s*["']\s*["']/i.test(html)) {
    return { shouldFilter: true, reason: 'image_empty_alt_intentional' }
  }

  return { shouldFilter: false }
}

// ============================================
// RULE-SPECIFIC FILTERS
// ============================================

/**
 * Filter for link-nova-aba-sem-aviso
 * Checks if there's already a new tab indication that wasn't detected
 */
const filterLinkNovaAba: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'link-nova-aba-sem-aviso') {
    return { shouldFilter: false }
  }

  const html = violation.html.toLowerCase()

  // Common external link icons (SVG, Font Awesome, etc)
  const externalIcons = [
    'external-link', 'arrow-up-right', 'open-in-new',
    'fa-external', 'bi-box-arrow', 'icon-external',
    'launch', 'open_in_new', 'north_east'
  ]

  if (externalIcons.some(icon => html.includes(icon))) {
    return { shouldFilter: true, reason: 'link_has_external_icon' }
  }

  // sr-only text indicating new tab
  if (/sr-only|visually-hidden|screen-reader/i.test(html)) {
    const srContent = html.match(/<span[^>]*(?:sr-only|visually-hidden)[^>]*>([^<]+)</i)
    if (srContent && /nova|new|external|abre/i.test(srContent[1])) {
      return { shouldFilter: true, reason: 'link_has_sr_only_text' }
    }
  }

  return { shouldFilter: false }
}

/**
 * Filter for fonte-muito-pequena
 * Semantically small elements are acceptable
 */
const filterFontePequena: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'fonte-muito-pequena') {
    return { shouldFilter: false }
  }

  const selector = violation.selector.toLowerCase()
  const html = violation.html.toLowerCase()

  // Tags that are semantically small
  const smallTags = ['sup', 'sub', 'small', 'figcaption', 'caption']
  if (smallTags.some(tag => selector.includes(tag) || html.startsWith(`<${tag}`))) {
    return { shouldFilter: true, reason: 'font_semantic_small_element' }
  }

  // Helper text, hint, etc classes
  const helperClasses = ['helper', 'hint', 'note', 'caption', 'footnote', 'fine-print']
  if (helperClasses.some(c => html.includes(c) || selector.includes(c))) {
    return { shouldFilter: true, reason: 'font_helper_text' }
  }

  return { shouldFilter: false }
}

/**
 * Filter for texto-justificado
 * Very short blocks have minimal impact
 */
const filterTextoJustificado: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'texto-justificado') {
    return { shouldFilter: false }
  }

  // Extract text from HTML
  const textContent = violation.html.replace(/<[^>]+>/g, '').trim()

  // If text is short (less than 100 characters), filter
  if (textContent.length < 100) {
    return { shouldFilter: true, reason: 'justified_text_too_short' }
  }

  return { shouldFilter: false }
}

/**
 * Filter for emag-breadcrumb
 * Top-level pages don't need breadcrumb
 */
const filterEmagBreadcrumb: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'emag-breadcrumb') {
    return { shouldFilter: false }
  }

  // If selector indicates home page, filter
  // (breadcrumb on home page doesn't make sense)
  if (violation.selector === 'body' && violation.failureSummary?.includes('1 níveis')) {
    return { shouldFilter: true, reason: 'breadcrumb_root_page' }
  }

  return { shouldFilter: false }
}

/**
 * Filter for color-contrast
 * Text that is clearly decorative or has visual alternatives
 */
const filterColorContrast: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'color-contrast') {
    return { shouldFilter: false }
  }

  const html = violation.html.toLowerCase()

  // Placeholder text (often intentionally light)
  if (/placeholder/i.test(html)) {
    return { shouldFilter: true, reason: 'color_contrast_placeholder' }
  }

  // Disabled elements
  if (/disabled|aria-disabled\s*=\s*["']true["']/i.test(html)) {
    return { shouldFilter: true, reason: 'color_contrast_disabled' }
  }

  return { shouldFilter: false }
}

/**
 * Filter for imagem-alt-nome-arquivo
 * Some filenames are actually valid descriptions
 */
const filterImagemAltNomeArquivo: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'imagem-alt-nome-arquivo') {
    return { shouldFilter: false }
  }

  const html = violation.html.toLowerCase()

  // If alt contains descriptive words along with the filename pattern
  const altMatch = html.match(/alt\s*=\s*["']([^"']+)["']/i)
  if (altMatch) {
    const alt = altMatch[1]
    // If alt contains actual descriptive words beyond just the filename
    const descriptiveWords = ['logo', 'banner', 'icon', 'photo of', 'image of', 'picture of']
    if (descriptiveWords.some(w => alt.includes(w))) {
      return { shouldFilter: true, reason: 'image_alt_has_description' }
    }
  }

  return { shouldFilter: false }
}

/**
 * Filter for text-maiusculo-css
 * Short navigation/UI text in uppercase is acceptable
 */
const filterTextoMaiusculo: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'texto-maiusculo-css') {
    return { shouldFilter: false }
  }

  const html = violation.html.toLowerCase()
  const textContent = html.replace(/<[^>]+>/g, '').trim()

  // Very short text (2-3 words) in navigation is acceptable
  if (textContent.split(/\s+/).length <= 3) {
    return { shouldFilter: true, reason: 'uppercase_short_ui_text' }
  }

  return { shouldFilter: false }
}

/**
 * Filter for rotulo-curto-ambiguo
 * Icons with proper aria-label are acceptable
 */
const filterRotuloCurto: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'rotulo-curto-ambiguo') {
    return { shouldFilter: false }
  }

  const html = violation.html.toLowerCase()

  // If has comprehensive aria-label
  const ariaLabelMatch = html.match(/aria-label\s*=\s*["']([^"']+)["']/i)
  if (ariaLabelMatch && ariaLabelMatch[1].length > 3) {
    return { shouldFilter: true, reason: 'short_label_has_aria_label' }
  }

  return { shouldFilter: false }
}

// ============================================
// FILTER PIPELINE
// ============================================

/**
 * Ordered list of filters to apply
 */
const FILTERS: ViolationFilter[] = [
  filterHiddenElements,
  filterDecorativeElements,
  filterColorContrast,
  filterLinkNovaAba,
  filterFontePequena,
  filterTextoJustificado,
  filterEmagBreadcrumb,
  filterImagemAltNomeArquivo,
  filterTextoMaiusculo,
  filterRotuloCurto,
]

/**
 * Applies all false positive filters to a violation
 * Returns { shouldFilter, reasons } indicating if it should be filtered
 */
export function applyFalsePositiveFilters(
  violation: ViolationResult,
  pageHtml?: string
): { shouldFilter: boolean; reasons: string[] } {
  const reasons: string[] = []

  for (const filter of FILTERS) {
    const result = filter(violation, pageHtml)
    if (result.shouldFilter) {
      reasons.push(result.reason || 'unknown')
    }
  }

  return {
    shouldFilter: reasons.length > 0,
    reasons
  }
}

/**
 * Filters array of violations removing false positives
 * Returns { violations, filtered } with valid violations and filtered ones
 */
export function filterFalsePositives(
  violations: ViolationResult[],
  pageHtml?: string
): {
  violations: ViolationResult[]
  filtered: Array<{ violation: ViolationResult; reasons: string[] }>
} {
  const valid: ViolationResult[] = []
  const filtered: Array<{ violation: ViolationResult; reasons: string[] }> = []

  for (const violation of violations) {
    const result = applyFalsePositiveFilters(violation, pageHtml)

    if (result.shouldFilter) {
      filtered.push({ violation, reasons: result.reasons })
    } else {
      valid.push(violation)
    }
  }

  // Log for debug
  if (filtered.length > 0) {
    console.log(`[FalsePositiveFilter] Filtered ${filtered.length} violations:`,
      filtered.map(f => `${f.violation.ruleId} (${f.reasons.join(', ')})`).join(', ')
    )
  }

  return { violations: valid, filtered }
}

/**
 * Gets statistics about filtered violations
 */
export function getFilterStats(
  filtered: Array<{ violation: ViolationResult; reasons: string[] }>
): Record<string, number> {
  const stats: Record<string, number> = {}

  for (const { reasons } of filtered) {
    for (const reason of reasons) {
      stats[reason] = (stats[reason] || 0) + 1
    }
  }

  return stats
}
