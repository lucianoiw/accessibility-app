/**
 * Pattern Grouping - Agrupa violações por padrão de seletor
 *
 * Isso permite identificar templates/componentes reutilizados que têm
 * a mesma violação, reduzindo o "ruído" de múltiplas ocorrências do
 * mesmo problema estrutural.
 *
 * Exemplo:
 * - ".card:nth-child(1) > img"
 * - ".card:nth-child(2) > img"
 * - ".card:nth-child(3) > img"
 *
 * São normalizados para: ".card > img" (1 padrão, 3 ocorrências)
 */

/**
 * Normaliza um seletor CSS removendo partes dinâmicas
 * para identificar padrões de template
 */
export function normalizeSelector(selector: string): string {
  if (!selector) return ''

  return selector
    // Remove :nth-child(N), :nth-of-type(N), :nth-last-child(N)
    .replace(/:nth-child\(\d+\)/g, '')
    .replace(/:nth-of-type\(\d+\)/g, '')
    .replace(/:nth-last-child\(\d+\)/g, '')
    .replace(/:nth-last-of-type\(\d+\)/g, '')

    // Remove :first-child, :last-child (são equivalentes a nth-child)
    .replace(/:first-child/g, '')
    .replace(/:last-child/g, '')
    .replace(/:first-of-type/g, '')
    .replace(/:last-of-type/g, '')

    // Remove IDs com números (geralmente dinâmicos): #item-123 → #item-*
    .replace(/#([\w-]+)-\d+/g, '#$1-*')
    .replace(/#([\w-]+)_\d+/g, '#$1_*')

    // IDs que são apenas números: #123 → #*
    .replace(/#\d+/g, '#*')

    // Remove classes com números no final: .item-3 → .item-*
    .replace(/\.([\w-]+)-\d+/g, '.$1-*')
    .replace(/\.([\w-]+)_\d+/g, '.$1_*')

    // Classes que terminam com hash/uuid parcial: .component-a1b2c3 → .component-*
    .replace(/\.([\w-]+)-[a-f0-9]{6,}/gi, '.$1-*')

    // Remove índices de array em atributos: [data-index="3"] → [data-index]
    .replace(/\[([^\]=]+)="?\d+"?\]/g, '[$1]')

    // Simplifica seletores de atributo com valores numéricos
    .replace(/\[([^\]=]+)="[^"]*\d+[^"]*"\]/g, '[$1]')

    // Remove espaços extras e normaliza
    .replace(/\s+/g, ' ')
    .trim()

    // Remove > no início ou fim
    .replace(/^\s*>\s*/, '')
    .replace(/\s*>\s*$/, '')
}

/**
 * Normaliza um XPath removendo partes dinâmicas
 */
export function normalizeXPath(xpath: string): string {
  if (!xpath) return ''

  return xpath
    // Remove índices posicionais: [1], [2], etc
    .replace(/\[\d+\]/g, '')

    // Remove predicados com números: [@data-index='3'] → [@data-index]
    .replace(/\[@([^\]=]+)='?\d+'?\]/g, '[@$1]')

    // Remove IDs com números
    .replace(/@id='[^']*\d+[^']*'/g, "@id='*'")

    // Remove classes com números
    .replace(/contains\(@class,\s*'[^']*\d+[^']*'\)/g, "contains(@class,'*')")

    // Normaliza espaços
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Agrupa elementos por padrão normalizado
 * Retorna um mapa de padrão → lista de seletores originais
 *
 * Nota: Aceita tanto 'xpath' (lowercase) quanto 'xPath' (camelCase) para compatibilidade
 * com diferentes fontes de dados (banco usa lowercase, código usa camelCase)
 */
export function groupByPattern(
  elements: Array<{ fullPath?: string | null; xPath?: string | null; xpath?: string | null }>,
  useXPath = false
): Map<string, string[]> {
  const groups = new Map<string, string[]>()

  for (const element of elements) {
    // Aceitar tanto xPath (camelCase) quanto xpath (lowercase)
    const xpathValue = element.xPath ?? element.xpath
    const original = useXPath ? xpathValue : element.fullPath
    if (!original) continue

    const normalized = useXPath
      ? normalizeXPath(original)
      : normalizeSelector(original)

    if (!normalized) continue

    const existing = groups.get(normalized) || []
    existing.push(original)
    groups.set(normalized, existing)
  }

  return groups
}

/**
 * Conta padrões únicos a partir de uma lista de elementos
 */
export function countUniquePatterns(
  elements: Array<{ fullPath?: string | null; xPath?: string | null; xpath?: string | null }>,
  useXPath = false
): number {
  const groups = groupByPattern(elements, useXPath)
  return groups.size
}

/**
 * Interface para resultado do agrupamento
 */
export interface PatternGroup {
  pattern: string
  occurrences: number
  examples: string[]  // Primeiros 3 exemplos de seletores originais
}

/**
 * Agrupa elementos e retorna informações detalhadas sobre cada padrão
 */
export function getPatternGroups(
  elements: Array<{ fullPath?: string | null; xPath?: string | null; xpath?: string | null }>,
  useXPath = false
): PatternGroup[] {
  const groups = groupByPattern(elements, useXPath)

  return Array.from(groups.entries())
    .map(([pattern, originals]) => ({
      pattern,
      occurrences: originals.length,
      examples: originals.slice(0, 3),
    }))
    .sort((a, b) => b.occurrences - a.occurrences)  // Mais ocorrências primeiro
}

/**
 * Calcula estatísticas de padrões para um conjunto de violações
 */
export interface PatternStats {
  totalOccurrences: number
  uniquePatterns: number
  byPattern: PatternGroup[]
  templateRatio: number  // Proporção de ocorrências que são de templates (>1 ocorrência)
}

export function calculatePatternStats(
  elements: Array<{ fullPath?: string | null; xPath?: string | null; xpath?: string | null }>,
  useXPath = false
): PatternStats {
  const groups = getPatternGroups(elements, useXPath)

  const totalOccurrences = groups.reduce((sum, g) => sum + g.occurrences, 0)
  const uniquePatterns = groups.length

  // Calcula quantas ocorrências são de "templates" (padrões com >1 ocorrência)
  const templateOccurrences = groups
    .filter(g => g.occurrences > 1)
    .reduce((sum, g) => sum + g.occurrences, 0)

  const templateRatio = totalOccurrences > 0
    ? templateOccurrences / totalOccurrences
    : 0

  return {
    totalOccurrences,
    uniquePatterns,
    byPattern: groups,
    templateRatio,
  }
}

/**
 * Agrupa violações por severidade e calcula padrões únicos para cada
 */
export interface SeverityPatternSummary {
  critical: { occurrences: number; patterns: number }
  serious: { occurrences: number; patterns: number }
  moderate: { occurrences: number; patterns: number }
  minor: { occurrences: number; patterns: number }
  total: { occurrences: number; patterns: number }
}

export function calculateSeverityPatternSummary(
  violations: Array<{
    impact: 'critical' | 'serious' | 'moderate' | 'minor'
    unique_elements: Array<{ fullPath?: string | null; xPath?: string | null; xpath?: string | null }>
  }>,
  useXPath = false
): SeverityPatternSummary {
  const result: SeverityPatternSummary = {
    critical: { occurrences: 0, patterns: 0 },
    serious: { occurrences: 0, patterns: 0 },
    moderate: { occurrences: 0, patterns: 0 },
    minor: { occurrences: 0, patterns: 0 },
    total: { occurrences: 0, patterns: 0 },
  }

  // Agrupa todas as violações por severidade
  const bySeverity: Record<string, Array<{ fullPath?: string | null; xPath?: string | null; xpath?: string | null }>> = {
    critical: [],
    serious: [],
    moderate: [],
    minor: [],
  }

  for (const violation of violations) {
    const elements = violation.unique_elements || []
    const severity = violation.impact || 'minor'

    bySeverity[severity].push(...elements)
    result[severity].occurrences += elements.length
  }

  // Calcula padrões únicos por severidade
  for (const severity of ['critical', 'serious', 'moderate', 'minor'] as const) {
    result[severity].patterns = countUniquePatterns(bySeverity[severity], useXPath)
  }

  // Totais
  result.total.occurrences =
    result.critical.occurrences +
    result.serious.occurrences +
    result.moderate.occurrences +
    result.minor.occurrences

  result.total.patterns =
    result.critical.patterns +
    result.serious.patterns +
    result.moderate.patterns +
    result.minor.patterns

  return result
}
