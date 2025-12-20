/**
 * Registry de IGTs disponíveis
 *
 * Centraliza todos os IGTs registrados no sistema.
 */

import type { IGTDefinition, IGTCategory, IGTAuditContext, IGTSummary } from './types'

// ============================================
// REGISTRY
// ============================================

/**
 * Map de todos os IGTs registrados
 */
const igtRegistry = new Map<string, IGTDefinition>()

/**
 * Registra um IGT no sistema
 */
export function registerIGT(igt: IGTDefinition): void {
  if (igtRegistry.has(igt.id)) {
    console.warn(`[IGT Registry] IGT "${igt.id}" already registered, overwriting`)
  }
  igtRegistry.set(igt.id, igt)
}

/**
 * Obtém um IGT pelo ID
 */
export function getIGT(id: string): IGTDefinition | undefined {
  return igtRegistry.get(id)
}

/**
 * Obtém todos os IGTs registrados
 */
export function getAllIGTs(): IGTDefinition[] {
  return Array.from(igtRegistry.values())
}

/**
 * Obtém IGTs por categoria
 */
export function getIGTsByCategory(category: IGTCategory): IGTDefinition[] {
  return getAllIGTs().filter(igt => igt.category === category)
}

/**
 * Obtém IGTs relevantes para uma auditoria
 */
export function getRelevantIGTs(context: IGTAuditContext): IGTDefinition[] {
  return getAllIGTs().filter(igt => igt.isRelevant(context))
}

/**
 * Obtém resumo de IGTs para listagem
 */
export async function getIGTSummaries(
  context: IGTAuditContext,
  existingSessions?: Map<string, { status: string; progress: number; completedAt?: string }>
): Promise<IGTSummary[]> {
  const relevantIGTs = getRelevantIGTs(context)

  const summaries: IGTSummary[] = []

  for (const igt of relevantIGTs) {
    // Obter candidatos para contar
    const candidates = await igt.getCandidates(context)

    const summary: IGTSummary = {
      id: igt.id,
      nameKey: igt.nameKey,
      descriptionKey: igt.descriptionKey,
      category: igt.category,
      estimatedMinutes: igt.estimatedMinutes,
      candidateCount: candidates.length,
    }

    // Adicionar dados da sessão se existir
    const session = existingSessions?.get(igt.id)
    if (session) {
      summary.session = {
        status: session.status as IGTSummary['session'] extends undefined ? never : NonNullable<IGTSummary['session']>['status'],
        progress: session.progress,
        completedAt: session.completedAt,
      }
    }

    summaries.push(summary)
  }

  return summaries
}

// ============================================
// CATEGORY LABELS
// ============================================

/**
 * Chaves de tradução para categorias
 */
export const IGT_CATEGORY_KEYS: Record<IGTCategory, string> = {
  'images': 'categories.images',
  'links': 'categories.links',
  'forms': 'categories.forms',
  'keyboard': 'categories.keyboard',
  'sign-language': 'categories.signLanguage',
  'contrast': 'categories.contrast',
  'structure': 'categories.structure',
  'multimedia': 'categories.multimedia',
}

/**
 * Ícones para categorias (Lucide icon names)
 */
export const IGT_CATEGORY_ICONS: Record<IGTCategory, string> = {
  'images': 'image',
  'links': 'link',
  'forms': 'file-text',
  'keyboard': 'keyboard',
  'sign-language': 'hand',
  'contrast': 'contrast',
  'structure': 'layout',
  'multimedia': 'play-circle',
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Inicializa o registry com todos os IGTs disponíveis
 * Chamado no startup da aplicação
 */
export async function initializeIGTRegistry(): Promise<void> {
  // Importar e registrar IGTs
  // Os imports são dinâmicos para evitar circular dependencies

  try {
    const imagesIGT = await import('./tests/images')
    registerIGT(imagesIGT.imagesAltQualityIGT)
  } catch (e) {
    console.warn('[IGT Registry] Failed to load images IGT:', e)
  }

  try {
    const linksIGT = await import('./tests/links')
    registerIGT(linksIGT.linksPurposeIGT)
  } catch (e) {
    console.warn('[IGT Registry] Failed to load links IGT:', e)
  }

  try {
    const signLanguageIGT = await import('./tests/sign-language')
    registerIGT(signLanguageIGT.signLanguagePluginIGT)
  } catch (e) {
    console.warn('[IGT Registry] Failed to load sign-language IGT:', e)
  }

  console.log(`[IGT Registry] Initialized with ${igtRegistry.size} IGTs`)
}

// Auto-initialize em ambiente de desenvolvimento
// Em produção, chamar initializeIGTRegistry() explicitamente
if (typeof window !== 'undefined') {
  // Client-side: inicializar quando importado
  initializeIGTRegistry()
}
