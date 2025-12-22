/**
 * Regras de violação que se beneficiam de screenshot automático
 *
 * Estas são regras "visuais" onde ver o elemento ajuda a entender o problema:
 * - Problemas de contraste de cores
 * - Tamanho de fonte
 * - Espaçamento e layout
 * - Alinhamento de texto
 */

/**
 * Regras do axe-core que terão screenshot automático
 */
export const AXE_VISUAL_RULES = [
  'color-contrast',           // Contraste de cores insuficiente
  'color-contrast-enhanced',  // Contraste de cores (AAA)
] as const

/**
 * Regras customizadas brasileiras que terão screenshot automático
 */
export const CUSTOM_VISUAL_RULES = [
  'fonte-muito-pequena',      // Font-size < 12px
  'texto-justificado',        // text-align: justify
  'texto-maiusculo-css',      // text-transform: uppercase em blocos
  'br-excessivo-layout',      // Múltiplos <br> para espaçamento
  'emag-tabela-layout',       // Tabela usada para layout
] as const

/**
 * Lista completa de regras visuais (automático)
 */
export const VISUAL_RULES = [
  ...AXE_VISUAL_RULES,
  ...CUSTOM_VISUAL_RULES,
] as const

/**
 * Tipo para regras visuais
 */
export type VisualRule = typeof VISUAL_RULES[number]

/**
 * Verifica se uma regra é visual (deve ter screenshot automático)
 */
export function isVisualRule(ruleId: string): boolean {
  return (VISUAL_RULES as readonly string[]).includes(ruleId)
}

/**
 * Configurações de screenshot por regra
 * Permite customizar padding e outras opções por regra
 */
export const SCREENSHOT_CONFIG: Record<string, { padding?: number; maxWidth?: number; maxHeight?: number }> = {
  // Contraste: padding maior para mostrar contexto de cores ao redor
  'color-contrast': { padding: 30 },
  'color-contrast-enhanced': { padding: 30 },
  // Fonte pequena: padding normal
  'fonte-muito-pequena': { padding: 20 },
  // Texto justificado: padding horizontal maior para mostrar alinhamento
  'texto-justificado': { padding: 25 },
  // Texto maiúsculo: padding normal
  'texto-maiusculo-css': { padding: 20 },
  // BR excessivo: padding vertical maior para mostrar espaçamento
  'br-excessivo-layout': { padding: 30 },
  // Tabela layout: pode ser grande, limitar dimensões
  'emag-tabela-layout': { padding: 20, maxWidth: 800, maxHeight: 600 },
}

/**
 * Retorna configuração de screenshot para uma regra
 */
export function getScreenshotConfig(ruleId: string): { padding: number; maxWidth?: number; maxHeight?: number } {
  const config = SCREENSHOT_CONFIG[ruleId]
  return {
    padding: config?.padding ?? 20,
    maxWidth: config?.maxWidth,
    maxHeight: config?.maxHeight,
  }
}
