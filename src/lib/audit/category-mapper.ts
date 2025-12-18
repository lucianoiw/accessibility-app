/**
 * Category Mapper - Mapeia regras de acessibilidade para categorias
 *
 * Categorias baseadas no padrao do BrowserStack para facilitar
 * visualizacao e priorizacao de problemas.
 */

import type { AggregatedViolation } from '@/types'

export interface CategoryCount {
  id: string
  name: string
  count: number
}

/** Definicao das categorias e seus padroes de match */
export const CATEGORY_DEFINITIONS: Record<string, { name: string; patterns: string[] }> = {
  color: {
    name: 'Cor e Contraste',
    patterns: [
      'color-contrast',
      'link-in-text-block',
      'color-contrast-enhanced',
    ],
  },
  'text-alternative': {
    name: 'Texto Alternativo',
    patterns: [
      'image-alt',
      'input-image-alt',
      'object-alt',
      'svg-img-alt',
      'area-alt',
      'role-img-alt',
      'imagem-alt-nome-arquivo', // regra customizada BR
    ],
  },
  aria: {
    name: 'ARIA',
    patterns: [
      'aria-',
      'role-',
      'rotulo-curto-ambiguo', // regra customizada BR
    ],
  },
  keyboard: {
    name: 'Teclado',
    patterns: [
      'tabindex',
      'focus-',
      'accesskey',
      'keyboard-',
      'scrollable-region-focusable',
      'emag-atalhos-teclado', // regra customizada BR
    ],
  },
  forms: {
    name: 'Formularios',
    patterns: [
      'label',
      'input-',
      'select-name',
      'autocomplete-',
      'form-',
    ],
  },
  'time-media': {
    name: 'Tempo e Midia',
    patterns: [
      'audio-',
      'video-',
      'blink',
      'marquee',
      'meta-refresh',
      'autoplay-video-audio', // regra customizada BR
      'carrossel-sem-controles', // regra customizada BR
      'refresh-automatico', // regra customizada BR
    ],
  },
  structure: {
    name: 'Estrutura',
    patterns: [
      'heading-',
      'list',
      'table-',
      'landmark-',
      'region',
      'bypass',
      'document-title',
      'html-has-lang',
      'html-lang-valid',
      'page-has-heading-one',
      'emag-skip-links', // regra customizada BR
      'emag-breadcrumb', // regra customizada BR
      'emag-tabela-layout', // regra customizada BR
      'br-excessivo-layout', // regra customizada BR
    ],
  },
  links: {
    name: 'Links',
    patterns: [
      'link-',
      'link-texto-generico', // regra customizada BR
      'link-nova-aba-sem-aviso', // regra customizada BR
      'emag-links-adjacentes', // regra customizada BR
    ],
  },
  content: {
    name: 'Conteudo',
    patterns: [
      'texto-justificado', // regra customizada BR
      'texto-maiusculo-css', // regra customizada BR
      'conteudo-lorem-ipsum', // regra customizada BR
      'fonte-muito-pequena', // regra customizada BR
      'atributo-title-redundante', // regra customizada BR
      'legibilidade-texto-complexo', // regra customizada BR COGA
      'siglas-sem-expansao', // regra customizada BR COGA
      'linguagem-inconsistente', // regra customizada BR COGA
    ],
  },
  brazilian: {
    name: 'Brasil Especifico',
    patterns: [
      'brasil-libras-plugin', // regra customizada BR
      'barra-acessibilidade-gov-br', // regra customizada BR
      'emag-pdf-acessivel', // regra customizada BR
    ],
  },
  cognitive: {
    name: 'Cognitivo (COGA)',
    patterns: [
      'timeout-sem-aviso', // regra customizada BR COGA
      'captcha-sem-alternativa', // regra customizada BR COGA
      'animacao-sem-pause', // regra customizada BR COGA
    ],
  },
}

/** Ordem de exibicao das categorias */
export const CATEGORY_ORDER = [
  'color',
  'text-alternative',
  'links',
  'aria',
  'keyboard',
  'forms',
  'structure',
  'content',
  'time-media',
  'brazilian',
  'cognitive',
] as const

/**
 * Determina a categoria de uma regra baseado no rule_id
 */
export function getCategoryForRule(ruleId: string): string {
  for (const [categoryId, { patterns }] of Object.entries(CATEGORY_DEFINITIONS)) {
    for (const pattern of patterns) {
      if (ruleId.includes(pattern) || ruleId.startsWith(pattern.replace('-', ''))) {
        return categoryId
      }
    }
  }
  return 'other'
}

/**
 * Agrupa violacoes por categoria
 */
export function groupViolationsByCategory(
  violations: AggregatedViolation[]
): CategoryCount[] {
  const categoryMap = new Map<string, number>()

  // Inicializar todas as categorias com 0
  for (const categoryId of CATEGORY_ORDER) {
    categoryMap.set(categoryId, 0)
  }
  categoryMap.set('other', 0)

  // Contar violacoes por categoria
  for (const violation of violations) {
    const category = getCategoryForRule(violation.rule_id)
    const currentCount = categoryMap.get(category) ?? 0
    categoryMap.set(category, currentCount + violation.occurrences)
  }

  // Converter para array com nomes
  const result: CategoryCount[] = []

  for (const categoryId of CATEGORY_ORDER) {
    const count = categoryMap.get(categoryId) ?? 0
    const definition = CATEGORY_DEFINITIONS[categoryId]
    if (definition) {
      result.push({
        id: categoryId,
        name: definition.name,
        count,
      })
    }
  }

  // Adicionar "Outros" se houver
  const otherCount = categoryMap.get('other') ?? 0
  if (otherCount > 0) {
    result.push({
      id: 'other',
      name: 'Outros',
      count: otherCount,
    })
  }

  return result
}

/**
 * Retorna as categorias ordenadas por contagem (maior primeiro)
 */
export function getCategoriesSortedByCount(
  violations: AggregatedViolation[]
): CategoryCount[] {
  const categories = groupViolationsByCategory(violations)
  return categories.sort((a, b) => b.count - a.count)
}
