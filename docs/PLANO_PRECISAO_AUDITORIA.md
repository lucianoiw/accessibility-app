# Plano de Implementação: Melhoria de Precisão da Auditoria

## Sumário Executivo

Este documento detalha a implementação de melhorias para aumentar a precisão das auditorias de acessibilidade, reduzindo falsos positivos e aumentando a cobertura efetiva. O plano é dividido em 3 fases:

> **⚠️ IMPORTANTE: Internacionalização**
>
> Este projeto NÃO é exclusivo para o Brasil. Todas as implementações devem:
> - Ser agnósticas de país/idioma
> - Adaptar-se ao idioma do site auditado (detectado via `lang` attribute)
> - Suportar múltiplos padrões regionais (eMAG para Brasil, Section 508 para EUA, EN 301 549 para EU, etc)
> - Usar termos genéricos (ex: "sign language plugin" em vez de "VLibras")
> - Manter compatibilidade com regras existentes via aliases quando renomear
>
> O sistema já suporta 3 idiomas na UI (pt-BR, en, es) e deve expandir para mais.

1. **Fase 1**: Níveis de Confiança e Heurísticas (2-3 semanas)
2. **Fase 2**: Testes Semi-Automatizados (IGTs) (4-6 semanas)
3. **Fase 3**: Machine Learning para Classificação (8-12 semanas)

---

## Contexto Atual do Sistema

### Arquitetura de Auditoria Existente

```
src/lib/audit/
├── auditor.ts          # Core: Playwright + axe-core + regras customizadas
├── custom-rules.ts     # 21 regras customizadas (eMAG, plugins de língua de sinais, etc)
├── coga-rules.ts       # 6 regras de acessibilidade cognitiva
├── wcag-partial-rules.ts # Regras WCAG de detecção parcial
├── health.ts           # Cálculo de score de saúde
├── emag-evaluator.ts   # Avaliação de conformidade eMAG
└── crawler.ts          # Descoberta de URLs
```

### Tipos Principais (src/types/database.ts)

```typescript
// Violação agregada atual
interface AggregatedViolation {
  id: string
  audit_id: string
  rule_id: string
  is_custom_rule: boolean
  fingerprint: string
  impact: ImpactLevel  // 'critical' | 'serious' | 'moderate' | 'minor'
  wcag_level: string | null
  wcag_criteria: string[]
  occurrences: number
  page_count: number
  affected_pages: string[]
  unique_elements: UniqueElement[]
  status: ViolationStatus
  // ... outros campos
}
```

### Fluxo Atual de Auditoria

1. `auditPage()` em `auditor.ts` executa:
   - Playwright navega para URL
   - axe-core via `@axe-core/playwright` analisa página
   - `getCustomViolations()` executa regras customizadas
   - Resultados são agregados por `fingerprint` (= `ruleId`)

2. Violações são salvas em `aggregated_violations` no Supabase

3. Score é calculado em `health.ts` usando fórmula BrowserStack

---

## FASE 1: Níveis de Confiança e Heurísticas

### Objetivo
Categorizar cada violação por nível de certeza, permitindo que o usuário filtre e priorize melhor.

### 1.1 Novo Tipo: ConfidenceLevel

**Arquivo**: `src/types/database.ts`

```typescript
// Adicionar ao arquivo existente

/**
 * Nível de confiança da detecção
 * - certain: 100% certeza de que é violação (ex: img sem alt)
 * - likely: Alta probabilidade (~90%) mas pode ter exceções (ex: alt genérico)
 * - needs_review: Requer verificação humana (ex: link "saiba mais" em contexto)
 */
export type ConfidenceLevel = 'certain' | 'likely' | 'needs_review'

/**
 * Razão pela qual uma violação precisa de revisão
 */
export type ReviewReason =
  | 'context_dependent'      // Depende do contexto (ex: link genérico)
  | 'possibly_decorative'    // Pode ser elemento decorativo
  | 'possibly_intentional'   // Pode ser intencional (ex: texto pequeno em legenda)
  | 'detection_limited'      // Detecção automatizada tem limitações
  | 'external_resource'      // Depende de recurso externo (ex: plugin de língua de sinais carregou?)
  | 'user_preference'        // Pode ser preferência do usuário

/**
 * Metadados de confiança para uma violação
 */
export interface ConfidenceMetadata {
  level: ConfidenceLevel
  score: number              // 0.0 a 1.0 (probabilidade de ser real)
  reason?: ReviewReason      // Por que precisa de revisão (se needs_review)
  signals: ConfidenceSignal[] // Sinais que influenciaram a decisão
}

/**
 * Sinal individual que influencia a confiança
 */
export interface ConfidenceSignal {
  type: 'positive' | 'negative'  // Aumenta ou diminui confiança
  signal: string                  // Nome do sinal (ex: 'has_aria_hidden')
  weight: number                  // Peso do sinal (0.0 a 1.0)
  description: string             // Descrição legível
}
```

### 1.2 Atualizar AggregatedViolation

**Arquivo**: `src/types/database.ts`

```typescript
// Adicionar campos ao AggregatedViolation existente
export interface AggregatedViolation {
  // ... campos existentes ...

  // NOVOS CAMPOS - Fase 1
  confidence_level: ConfidenceLevel
  confidence_score: number           // 0.0 a 1.0
  confidence_reason: ReviewReason | null
  confidence_signals: ConfidenceSignal[] | null

  // Flag para regras experimentais
  is_experimental: boolean
}
```

### 1.3 Migration SQL

**Arquivo**: `supabase/migrations/00018_add_confidence_levels.sql`

```sql
-- ============================================
-- Migration: Add Confidence Levels to Violations
-- ============================================

-- Criar enum para confidence level
CREATE TYPE confidence_level AS ENUM ('certain', 'likely', 'needs_review');

-- Criar enum para review reason
CREATE TYPE review_reason AS ENUM (
  'context_dependent',
  'possibly_decorative',
  'possibly_intentional',
  'detection_limited',
  'external_resource',
  'user_preference'
);

-- Adicionar colunas à tabela aggregated_violations
ALTER TABLE aggregated_violations
ADD COLUMN confidence_level confidence_level NOT NULL DEFAULT 'certain',
ADD COLUMN confidence_score DECIMAL(3,2) NOT NULL DEFAULT 1.0,
ADD COLUMN confidence_reason review_reason,
ADD COLUMN confidence_signals JSONB,
ADD COLUMN is_experimental BOOLEAN NOT NULL DEFAULT false;

-- Índice para filtrar por nível de confiança
CREATE INDEX idx_aggregated_violations_confidence
ON aggregated_violations(audit_id, confidence_level);

-- Índice para filtrar regras experimentais
CREATE INDEX idx_aggregated_violations_experimental
ON aggregated_violations(audit_id, is_experimental)
WHERE is_experimental = true;

-- Comentários para documentação
COMMENT ON COLUMN aggregated_violations.confidence_level IS
  'Nível de certeza da detecção: certain (100%), likely (~90%), needs_review (requer humano)';

COMMENT ON COLUMN aggregated_violations.confidence_score IS
  'Score de confiança de 0.0 a 1.0, onde 1.0 é certeza absoluta';

COMMENT ON COLUMN aggregated_violations.confidence_reason IS
  'Razão pela qual a violação precisa de revisão (se confidence_level = needs_review)';

COMMENT ON COLUMN aggregated_violations.confidence_signals IS
  'Array de sinais que influenciaram a decisão de confiança';

COMMENT ON COLUMN aggregated_violations.is_experimental IS
  'Se true, a regra é experimental e pode ter mais falsos positivos';
```

### 1.4 Novo Módulo: Confidence Calculator

**Arquivo**: `src/lib/audit/confidence.ts`

```typescript
import type {
  ConfidenceLevel,
  ConfidenceMetadata,
  ConfidenceSignal,
  ReviewReason
} from '@/types'

// ============================================
// CONFIGURAÇÃO DE REGRAS
// ============================================

/**
 * Configuração de confiança por regra
 * Define o nível base e condições para ajuste
 */
interface RuleConfidenceConfig {
  baseLevel: ConfidenceLevel
  baseScore: number
  isExperimental?: boolean
  // Função para calcular confiança baseada no contexto do elemento
  calculateConfidence?: (context: ElementContext) => ConfidenceAdjustment
}

interface ConfidenceAdjustment {
  level?: ConfidenceLevel
  scoreAdjustment: number  // -1.0 a +1.0
  signals: ConfidenceSignal[]
  reason?: ReviewReason
}

interface ElementContext {
  html: string
  selector: string
  parentHtml: string | null
  pageUrl: string
  // Dados extras extraídos durante auditoria
  attributes?: Record<string, string>
  computedStyles?: Record<string, string>
  surroundingText?: string
}

// ============================================
// REGRAS AXE-CORE - CONFIGURAÇÃO DE CONFIANÇA
// ============================================

/**
 * Regras axe-core são geralmente de alta confiança
 * Mapeamos apenas as que precisam de ajuste
 */
export const AXE_RULE_CONFIDENCE: Record<string, RuleConfidenceConfig> = {
  // ALTA CONFIANÇA (certain) - Default para axe-core
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

  // MÉDIA CONFIANÇA (likely) - Podem ter exceções
  'color-contrast': {
    baseLevel: 'likely',
    baseScore: 0.85,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []
      let adjustment = 0

      // Se elemento tem classe de "decorative", "icon", etc
      if (/\b(decorat|icon|logo|brand)\w*/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'possibly_decorative_class',
          weight: 0.3,
          description: 'Elemento pode ser decorativo baseado em classes CSS'
        })
        adjustment -= 0.3
      }

      // Se elemento é muito pequeno (provavelmente ícone)
      if (ctx.computedStyles?.fontSize && parseFloat(ctx.computedStyles.fontSize) < 10) {
        signals.push({
          type: 'negative',
          signal: 'very_small_text',
          weight: 0.2,
          description: 'Texto muito pequeno, pode ser ícone ou decorativo'
        })
        adjustment -= 0.2
      }

      return { scoreAdjustment: adjustment, signals }
    }
  },

  // PRECISA REVISÃO (needs_review)
  'landmark-one-main': {
    baseLevel: 'needs_review',
    baseScore: 0.6,
    calculateConfidence: () => ({
      scoreAdjustment: 0,
      signals: [{
        type: 'negative',
        signal: 'structural_choice',
        weight: 0.4,
        description: 'Ausência de landmark main pode ser escolha arquitetural válida'
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
        description: 'Nem todo conteúdo precisa estar em landmark'
      }],
      reason: 'context_dependent'
    })
  },
}

// ============================================
// REGRAS CUSTOMIZADAS - CONFIGURAÇÃO DE CONFIANÇA
// ============================================

export const CUSTOM_RULE_CONFIDENCE: Record<string, RuleConfidenceConfig> = {
  // ALTA CONFIANÇA
  'link-nova-aba-sem-aviso': {
    baseLevel: 'certain',
    baseScore: 0.95,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []
      let adjustment = 0

      // Se tem ícone de external link (comum em design systems)
      if (/external|arrow|open|window/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_external_icon',
          weight: 0.5,
          description: 'Pode ter ícone indicando link externo'
        })
        adjustment -= 0.5
      }

      // Se tem sr-only text
      if (/sr-only|visually-hidden|screen-reader/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_sr_text',
          weight: 0.7,
          description: 'Pode ter texto oculto para leitores de tela'
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

      // Extrair alt do HTML
      const altMatch = ctx.html.match(/alt=["']([^"']+)["']/i)
      const alt = altMatch?.[1] || ''

      // Se alt é claramente nome de arquivo (IMG_20241220.jpg)
      if (/^(IMG_|DSC|PHOTO_|Screenshot)\d+/i.test(alt)) {
        signals.push({
          type: 'positive',
          signal: 'clear_filename_pattern',
          weight: 0.95,
          description: 'Alt text segue padrão claro de nome de arquivo'
        })
        return { scoreAdjustment: 0.05, signals }
      }

      // Se parece nome mas pode ser intencional (logo-empresa.png)
      if (/logo|brand|icon/i.test(alt)) {
        signals.push({
          type: 'negative',
          signal: 'possibly_intentional_name',
          weight: 0.3,
          description: 'Nome pode ser descrição intencional de logo/ícone'
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

      // Se link está dentro de contexto que explica (ex: card, article)
      if (ctx.parentHtml && /article|card|product|item/i.test(ctx.parentHtml)) {
        signals.push({
          type: 'negative',
          signal: 'has_surrounding_context',
          weight: 0.4,
          description: 'Link está em contexto que pode fornecer significado'
        })
        adjustment -= 0.4
      }

      // Se tem aria-describedby ou aria-labelledby
      if (/aria-(describedby|labelledby)/i.test(ctx.html)) {
        signals.push({
          type: 'negative',
          signal: 'has_aria_description',
          weight: 0.6,
          description: 'Link tem descrição via ARIA'
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

  // Regra de plugin de língua de sinais (VLibras, HandTalk, SignAll, etc)
  // Nota: O ruleId 'brasil-libras-plugin' é mantido por compatibilidade,
  // mas a regra deve ser renomeada para 'sign-language-plugin' no futuro
  'brasil-libras-plugin': {
    baseLevel: 'needs_review',
    baseScore: 0.60,
    isExperimental: true,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // Só podemos verificar se o script existe, não se funciona
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

      // Se página é muito simples (poucas seções), skip link é menos crítico
      if (ctx.surroundingText && ctx.surroundingText.length < 500) {
        signals.push({
          type: 'negative',
          signal: 'simple_page',
          weight: 0.3,
          description: 'Página simples pode não necessitar de skip links'
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
        description: 'Breadcrumb é recomendação, não requisito'
      }],
      reason: 'user_preference'
    })
  },

  'texto-justificado': {
    baseLevel: 'likely',
    baseScore: 0.75,
    calculateConfidence: (ctx) => {
      const signals: ConfidenceSignal[] = []

      // Se é bloco pequeno de texto, impacto é menor
      const textLength = ctx.html.replace(/<[^>]+>/g, '').length
      if (textLength < 200) {
        signals.push({
          type: 'negative',
          signal: 'short_text_block',
          weight: 0.3,
          description: 'Bloco de texto curto tem menor impacto'
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

      // Se é label de form, legenda, ou footnote - pode ser intencional
      if (/label|legend|caption|footnote|small|sup|sub/i.test(ctx.selector)) {
        signals.push({
          type: 'negative',
          signal: 'semantic_small_text',
          weight: 0.4,
          description: 'Texto pequeno pode ser semanticamente apropriado'
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

  // REGRAS COGA - Geralmente precisam revisão
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
        description: 'Legibilidade é métrica subjetiva, varia por público-alvo'
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

      // Siglas muito comuns (HTML, CSS, URL) podem não precisar expansão
      const commonAcronyms = ['HTML', 'CSS', 'URL', 'API', 'PDF', 'FAQ', 'CEO', 'CFO']
      const hasCommonAcronym = commonAcronyms.some(a => ctx.html.includes(a))

      if (hasCommonAcronym) {
        signals.push({
          type: 'negative',
          signal: 'common_acronym',
          weight: 0.5,
          description: 'Sigla é amplamente conhecida'
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
}

// ============================================
// FUNÇÕES PRINCIPAIS
// ============================================

/**
 * Calcula a confiança para uma violação
 */
export function calculateConfidence(
  ruleId: string,
  isCustomRule: boolean,
  context: ElementContext
): ConfidenceMetadata {
  // Buscar config da regra
  const config = isCustomRule
    ? CUSTOM_RULE_CONFIDENCE[ruleId]
    : AXE_RULE_CONFIDENCE[ruleId]

  // Se não tem config específica, usar defaults
  if (!config) {
    return {
      level: isCustomRule ? 'likely' : 'certain',
      score: isCustomRule ? 0.85 : 0.95,
      signals: []
    }
  }

  // Calcular ajustes baseados no contexto
  const adjustment = config.calculateConfidence?.(context) ?? {
    scoreAdjustment: 0,
    signals: []
  }

  // Calcular score final
  const finalScore = Math.max(0, Math.min(1, config.baseScore + adjustment.scoreAdjustment))

  // Determinar nível baseado no score
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
 * Verifica se uma regra é experimental
 */
export function isExperimentalRule(ruleId: string, isCustomRule: boolean): boolean {
  if (!isCustomRule) return false
  return CUSTOM_RULE_CONFIDENCE[ruleId]?.isExperimental ?? false
}

/**
 * Retorna label legível para nível de confiança
 */
export function getConfidenceLevelLabel(level: ConfidenceLevel): string {
  switch (level) {
    case 'certain':
      return 'Certeza'
    case 'likely':
      return 'Provável'
    case 'needs_review':
      return 'Requer Revisão'
  }
}

/**
 * Retorna cor CSS para nível de confiança
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
 * Retorna ícone para nível de confiança
 */
export function getConfidenceLevelIcon(level: ConfidenceLevel): string {
  switch (level) {
    case 'certain':
      return 'check-circle'  // Lucide icon
    case 'likely':
      return 'alert-circle'
    case 'needs_review':
      return 'help-circle'
  }
}
```

### 1.5 Heurísticas para Redução de Falsos Positivos

**Arquivo**: `src/lib/audit/false-positive-filters.ts`

```typescript
/**
 * Filtros de falso positivo aplicados ANTES de salvar violações
 * Estes são casos onde temos certeza que NÃO é violação
 */

import type { ViolationResult } from './auditor'

interface FilterResult {
  shouldFilter: boolean
  reason?: string
}

type ViolationFilter = (violation: ViolationResult, pageHtml?: string) => FilterResult

// ============================================
// FILTROS PARA ELEMENTOS OCULTOS
// ============================================

/**
 * Filtra violações em elementos que estão ocultos
 * Muitas ferramentas (incluindo WAVE) ignoram elementos hidden
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

  // aria-hidden="true" (para conteúdo que está propositalmente oculto de AT)
  if (/aria-hidden\s*=\s*["']true["']/i.test(html)) {
    return { shouldFilter: true, reason: 'element_aria_hidden' }
  }

  return { shouldFilter: false }
}

// ============================================
// FILTROS PARA ELEMENTOS DECORATIVOS
// ============================================

/**
 * Filtra violações em elementos que são provavelmente decorativos
 */
const filterDecorativeElements: ViolationFilter = (violation) => {
  const html = violation.html.toLowerCase()
  const selector = violation.selector.toLowerCase()

  // Classes que indicam elemento decorativo
  const decorativeClasses = [
    'decorative', 'decoration', 'ornament',
    'icon-only', 'visual-only', 'presentational'
  ]

  if (decorativeClasses.some(c => html.includes(c) || selector.includes(c))) {
    return { shouldFilter: true, reason: 'element_decorative_class' }
  }

  // role="presentation" ou role="none"
  if (/role\s*=\s*["'](presentation|none)["']/i.test(html)) {
    return { shouldFilter: true, reason: 'element_presentation_role' }
  }

  // Imagem com alt="" (vazio intencional = decorativa)
  if (violation.ruleId === 'image-alt' && /alt\s*=\s*["']\s*["']/i.test(html)) {
    return { shouldFilter: true, reason: 'image_empty_alt_intentional' }
  }

  return { shouldFilter: false }
}

// ============================================
// FILTROS POR REGRA ESPECÍFICA
// ============================================

/**
 * Filtro para link-nova-aba-sem-aviso
 * Verifica se já tem indicação de nova aba que não foi detectada
 */
const filterLinkNovaAba: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'link-nova-aba-sem-aviso') {
    return { shouldFilter: false }
  }

  const html = violation.html.toLowerCase()

  // Ícones comuns de external link (SVG, Font Awesome, etc)
  const externalIcons = [
    'external-link', 'arrow-up-right', 'open-in-new',
    'fa-external', 'bi-box-arrow', 'icon-external',
    'launch', 'open_in_new', 'north_east'
  ]

  if (externalIcons.some(icon => html.includes(icon))) {
    return { shouldFilter: true, reason: 'link_has_external_icon' }
  }

  // Texto sr-only indicando nova aba
  if (/sr-only|visually-hidden|screen-reader/i.test(html)) {
    const srContent = html.match(/<span[^>]*(?:sr-only|visually-hidden)[^>]*>([^<]+)</i)
    if (srContent && /nova|new|external|abre/i.test(srContent[1])) {
      return { shouldFilter: true, reason: 'link_has_sr_only_text' }
    }
  }

  return { shouldFilter: false }
}

/**
 * Filtro para fonte-muito-pequena
 * Elementos semanticamente pequenos são aceitáveis
 */
const filterFontePequena: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'fonte-muito-pequena') {
    return { shouldFilter: false }
  }

  const selector = violation.selector.toLowerCase()
  const html = violation.html.toLowerCase()

  // Tags que são semanticamente pequenas
  const smallTags = ['sup', 'sub', 'small', 'figcaption', 'caption']
  if (smallTags.some(tag => selector.includes(tag) || html.startsWith(`<${tag}`))) {
    return { shouldFilter: true, reason: 'font_semantic_small_element' }
  }

  // Classes de helper text, hint, etc
  const helperClasses = ['helper', 'hint', 'note', 'caption', 'footnote', 'fine-print']
  if (helperClasses.some(c => html.includes(c) || selector.includes(c))) {
    return { shouldFilter: true, reason: 'font_helper_text' }
  }

  return { shouldFilter: false }
}

/**
 * Filtro para texto-justificado
 * Blocos muito curtos têm impacto mínimo
 */
const filterTextoJustificado: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'texto-justificado') {
    return { shouldFilter: false }
  }

  // Extrair texto do HTML
  const textContent = violation.html.replace(/<[^>]+>/g, '').trim()

  // Se texto é curto (menos de 100 caracteres), filtrar
  if (textContent.length < 100) {
    return { shouldFilter: true, reason: 'justified_text_too_short' }
  }

  return { shouldFilter: false }
}

/**
 * Filtro para emag-breadcrumb
 * Páginas de primeiro nível não precisam de breadcrumb
 */
const filterEmagBreadcrumb: ViolationFilter = (violation) => {
  if (violation.ruleId !== 'emag-breadcrumb') {
    return { shouldFilter: false }
  }

  // Se a URL do selector indica página inicial, filtrar
  // (breadcrumb em home page não faz sentido)
  if (violation.selector === 'body' && violation.failureSummary?.includes('1 níveis')) {
    return { shouldFilter: true, reason: 'breadcrumb_root_page' }
  }

  return { shouldFilter: false }
}

// ============================================
// PIPELINE DE FILTROS
// ============================================

/**
 * Lista ordenada de filtros a aplicar
 */
const FILTERS: ViolationFilter[] = [
  filterHiddenElements,
  filterDecorativeElements,
  filterLinkNovaAba,
  filterFontePequena,
  filterTextoJustificado,
  filterEmagBreadcrumb,
]

/**
 * Aplica todos os filtros de falso positivo a uma violação
 * Retorna { shouldFilter, reasons } indicando se deve ser filtrada
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
 * Filtra array de violações removendo falsos positivos
 * Retorna { violations, filtered } com as violações válidas e as filtradas
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

  // Log para debug
  if (filtered.length > 0) {
    console.log(`[FalsePositiveFilter] Filtradas ${filtered.length} violações:`,
      filtered.map(f => `${f.violation.ruleId} (${f.reasons.join(', ')})`).join(', ')
    )
  }

  return { violations: valid, filtered }
}
```

### 1.6 Integrar no Auditor

**Arquivo**: `src/lib/audit/auditor.ts` (modificações)

```typescript
// Adicionar imports
import { calculateConfidence, isExperimentalRule, type ElementContext } from './confidence'
import { filterFalsePositives } from './false-positive-filters'

// Na função auditPage(), após coletar todas as violações:

export async function auditPage(
  url: string,
  options: AuditorOptions
): Promise<AuditResult> {
  // ... código existente até coletar violations ...

  // NOVO: Filtrar falsos positivos antes de retornar
  const { violations: filteredViolations, filtered } = filterFalsePositives(violations)

  if (filtered.length > 0) {
    console.log(`[Auditor] Filtered ${filtered.length} likely false positives for ${url}`)
  }

  // NOVO: Enriquecer com dados de confiança
  const enrichedViolations = filteredViolations.map(v => {
    const context: ElementContext = {
      html: v.html,
      selector: v.selector,
      parentHtml: v.parentHtml,
      pageUrl: url,
    }

    const confidence = calculateConfidence(v.ruleId, v.isCustomRule, context)

    return {
      ...v,
      confidenceLevel: confidence.level,
      confidenceScore: confidence.score,
      confidenceReason: confidence.reason || null,
      confidenceSignals: confidence.signals,
      isExperimental: isExperimentalRule(v.ruleId, v.isCustomRule),
    }
  })

  // ... resto do código ...

  return {
    url,
    violations: enrichedViolations,
    loadTime,
    screenshot,
    discoveredLinks,
  }
}
```

### 1.7 Atualizar ViolationResult Type

**Arquivo**: `src/lib/audit/auditor.ts` (atualizar tipo)

```typescript
export interface ViolationResult {
  // ... campos existentes ...

  // NOVOS CAMPOS - Fase 1
  confidenceLevel: ConfidenceLevel
  confidenceScore: number
  confidenceReason: ReviewReason | null
  confidenceSignals: ConfidenceSignal[]
  isExperimental: boolean
}
```

### 1.8 UI: Badge de Confiança

**Arquivo**: `src/components/audit/confidence-badge.tsx`

```typescript
'use client'

import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  FlaskConical
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import type { ConfidenceLevel, ConfidenceSignal } from '@/types'
import { cn } from '@/lib/utils'

interface ConfidenceBadgeProps {
  level: ConfidenceLevel
  score: number
  signals?: ConfidenceSignal[]
  isExperimental?: boolean
  showScore?: boolean
  className?: string
}

const levelConfig = {
  certain: {
    label: 'Certeza',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  likely: {
    label: 'Provável',
    icon: AlertCircle,
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
  },
  needs_review: {
    label: 'Verificar',
    icon: HelpCircle,
    className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
  },
}

export function ConfidenceBadge({
  level,
  score,
  signals = [],
  isExperimental = false,
  showScore = false,
  className,
}: ConfidenceBadgeProps) {
  const config = levelConfig[level]
  const Icon = config.icon

  const tooltipContent = (
    <div className="space-y-2 max-w-xs">
      <div className="font-medium">
        {config.label} {showScore && `(${Math.round(score * 100)}%)`}
      </div>

      {signals.length > 0 && (
        <div className="text-xs space-y-1">
          <div className="font-medium text-muted-foreground">Sinais detectados:</div>
          {signals.map((signal, i) => (
            <div key={i} className="flex items-start gap-1">
              <span className={signal.type === 'positive' ? 'text-green-500' : 'text-orange-500'}>
                {signal.type === 'positive' ? '✓' : '⚠'}
              </span>
              <span>{signal.description}</span>
            </div>
          ))}
        </div>
      )}

      {isExperimental && (
        <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <FlaskConical className="h-3 w-3" />
          Regra experimental - pode ter mais falsos positivos
        </div>
      )}
    </div>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'cursor-help gap-1',
              config.className,
              className
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="text-xs">{config.label}</span>
            {isExperimental && <FlaskConical className="h-3 w-3 ml-1" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-3">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
```

### 1.9 UI: Filtro por Confiança

**Arquivo**: `src/components/audit/violations-filter.tsx` (adicionar)

```typescript
// Adicionar ao filtro existente de violações

// Novo estado
const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceLevel | 'all'>('all')
const [showExperimental, setShowExperimental] = useState(true)

// Novo select
<Select value={confidenceFilter} onValueChange={(v) => setConfidenceFilter(v as ConfidenceLevel | 'all')}>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Confiança" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">Todas</SelectItem>
    <SelectItem value="certain">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        Certeza
      </div>
    </SelectItem>
    <SelectItem value="likely">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-yellow-500" />
        Provável
      </div>
    </SelectItem>
    <SelectItem value="needs_review">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-orange-500" />
        Verificar
      </div>
    </SelectItem>
  </SelectContent>
</Select>

// Checkbox para experimentais
<div className="flex items-center space-x-2">
  <Checkbox
    id="show-experimental"
    checked={showExperimental}
    onCheckedChange={(checked) => setShowExperimental(!!checked)}
  />
  <label htmlFor="show-experimental" className="text-sm flex items-center gap-1">
    <FlaskConical className="h-4 w-4" />
    Mostrar experimentais
  </label>
</div>

// Aplicar filtro
const filteredViolations = violations.filter(v => {
  if (confidenceFilter !== 'all' && v.confidence_level !== confidenceFilter) return false
  if (!showExperimental && v.is_experimental) return false
  return true
})
```

### 1.10 Traduções

**Arquivo**: `src/messages/pt-BR.json` (adicionar)

```json
{
  "Confidence": {
    "certain": "Certeza",
    "likely": "Provável",
    "needsReview": "Requer Verificação",
    "experimental": "Experimental",
    "experimentalTooltip": "Esta regra é experimental e pode ter mais falsos positivos",
    "signalsDetected": "Sinais detectados",
    "filterByConfidence": "Filtrar por confiança",
    "showExperimental": "Mostrar regras experimentais",
    "allLevels": "Todos os níveis",
    "reasons": {
      "context_dependent": "Depende do contexto da página",
      "possibly_decorative": "Pode ser elemento decorativo",
      "possibly_intentional": "Pode ser intencional",
      "detection_limited": "Detecção automatizada tem limitações",
      "external_resource": "Depende de recurso externo",
      "user_preference": "Pode ser preferência de design"
    }
  }
}
```

---

## FASE 2: Testes Semi-Automatizados (IGTs)

### Objetivo
Implementar Intelligent Guided Tests para cobrir casos que automação pura não resolve.

### 2.1 Arquitetura de IGTs

```
src/
├── lib/
│   └── igt/
│       ├── index.ts           # Exports
│       ├── types.ts           # Tipos IGT
│       ├── registry.ts        # Registro de todos os IGTs
│       ├── runner.ts          # Executor de IGTs
│       ├── storage.ts         # Persistência de respostas
│       └── tests/
│           ├── images.ts      # IGT: Qualidade de alt text
│           ├── links.ts       # IGT: Propósito de links
│           ├── forms.ts       # IGT: Labels de formulários
│           ├── keyboard.ts    # IGT: Navegação por teclado
│           ├── sign-language.ts # IGT: Plugin de língua de sinais funcional
│           └── contrast.ts    # IGT: Contraste em contexto
├── app/
│   └── [locale]/
│       └── (dashboard)/
│           └── projects/
│               └── [id]/
│                   └── audits/
│                       └── [auditId]/
│                           └── igt/
│                               ├── page.tsx      # Lista de IGTs disponíveis
│                               └── [testId]/
│                                   └── page.tsx  # Execução de IGT específico
└── components/
    └── igt/
        ├── igt-card.tsx           # Card de IGT na lista
        ├── igt-runner.tsx         # UI para executar IGT
        ├── igt-question.tsx       # Componente de pergunta
        ├── igt-element-picker.tsx # Seletor de elementos
        └── igt-results.tsx        # Resultados do IGT
```

### 2.2 Tipos IGT

**Arquivo**: `src/lib/igt/types.ts`

```typescript
/**
 * Tipos para o sistema de Intelligent Guided Tests (IGT)
 */

// ============================================
// TIPOS BASE
// ============================================

/**
 * Status de um IGT
 */
export type IGTStatus =
  | 'not_started'   // Nunca executado
  | 'in_progress'   // Sendo executado
  | 'completed'     // Todas as perguntas respondidas
  | 'skipped'       // Pulado pelo usuário

/**
 * Tipo de pergunta em um IGT
 */
export type QuestionType =
  | 'yes_no'              // Sim/Não
  | 'yes_no_unsure'       // Sim/Não/Não tenho certeza
  | 'multiple_choice'     // Múltipla escolha
  | 'element_select'      // Selecionar elemento na página
  | 'text_input'          // Entrada de texto livre
  | 'rating'              // Escala (1-5)

/**
 * Resultado de uma resposta
 */
export type AnswerResult =
  | 'pass'        // Passa no teste
  | 'fail'        // Falha no teste
  | 'warning'     // Aviso (não é erro, mas atenção)
  | 'needs_more'  // Precisa de mais informação
  | 'skip'        // Pulado

// ============================================
// ESTRUTURA DE IGT
// ============================================

/**
 * Definição de um IGT
 */
export interface IGTDefinition {
  id: string
  name: string
  description: string
  category: 'images' | 'links' | 'forms' | 'keyboard' | 'sign-language' | 'contrast' | 'structure'
  wcagCriteria: string[]           // Ex: ['1.1.1', '2.4.4'] - Padrão internacional
  // Mapeamentos regionais opcionais - cada padrão tem seu campo
  emagRecommendations?: string[]   // eMAG (Brasil) - Ex: ['3.6', '3.5']
  section508?: string[]            // Section 508 (EUA)
  en301549?: string[]              // EN 301 549 (EU)
  estimatedTime: number            // Minutos

  // Função que determina se este IGT é relevante para a auditoria
  isRelevant: (auditContext: AuditContext) => boolean

  // Função que retorna os elementos candidatos para teste
  getCandidates: (auditContext: AuditContext) => Promise<IGTCandidate[]>

  // Perguntas do teste
  questions: IGTQuestion[]

  // Função que processa as respostas e gera resultados
  processResults: (answers: IGTAnswer[], candidates: IGTCandidate[]) => IGTResult[]
}

/**
 * Contexto da auditoria para o IGT
 */
export interface AuditContext {
  auditId: string
  projectId: string
  baseUrl: string
  // Violações detectadas automaticamente
  violations: Array<{
    ruleId: string
    selector: string
    html: string
    pageUrl: string
  }>
  // Páginas auditadas
  pages: Array<{
    url: string
    title: string
  }>
  // Configurações
  includeEmag: boolean
  includeCoga: boolean
}

/**
 * Candidato para teste em um IGT
 * Elemento que precisa ser avaliado pelo usuário
 */
export interface IGTCandidate {
  id: string                    // ID único do candidato
  elementType: string           // 'img', 'a', 'button', etc
  selector: string              // CSS selector
  xpath: string                 // XPath
  html: string                  // HTML do elemento
  pageUrl: string               // URL da página
  screenshot?: string           // Base64 do screenshot do elemento

  // Dados extras dependendo do tipo
  attributes?: Record<string, string>
  surroundingText?: string

  // Pré-classificação por ML (Fase 3)
  mlPrediction?: {
    predictedResult: AnswerResult
    confidence: number
    reason: string
  }
}

/**
 * Pergunta de um IGT
 */
export interface IGTQuestion {
  id: string
  order: number
  type: QuestionType
  text: string                   // Texto da pergunta
  helpText?: string              // Texto de ajuda

  // Para multiple_choice
  options?: Array<{
    value: string
    label: string
    resultMapping: AnswerResult  // Qual resultado esta opção gera
  }>

  // Para element_select
  elementFilter?: string         // CSS selector para filtrar elementos

  // Condição para mostrar esta pergunta (baseado em respostas anteriores)
  showIf?: (previousAnswers: IGTAnswer[]) => boolean

  // Como interpretar a resposta
  resultMapping?: {
    yes?: AnswerResult
    no?: AnswerResult
    unsure?: AnswerResult
  }
}

/**
 * Resposta do usuário a uma pergunta
 */
export interface IGTAnswer {
  questionId: string
  candidateId: string
  value: string | string[] | number | boolean
  timestamp: string

  // Para element_select
  selectedElements?: string[]    // Seletores dos elementos selecionados

  // Comentário opcional
  comment?: string
}

/**
 * Resultado de um IGT para um candidato
 */
export interface IGTResult {
  candidateId: string
  result: AnswerResult
  confidence: number             // 0.0 a 1.0 (1.0 = certeza baseada em resposta direta)

  // Se falha, dados para criar violação
  violation?: {
    ruleId: string
    impact: 'critical' | 'serious' | 'moderate' | 'minor'
    help: string
    description: string
    selector: string
    html: string
    pageUrl: string
  }

  // Respostas que levaram a este resultado
  answers: IGTAnswer[]
}

// ============================================
// SESSÃO DE IGT
// ============================================

/**
 * Sessão de execução de IGT
 */
export interface IGTSession {
  id: string
  auditId: string
  igtId: string
  status: IGTStatus

  // Progresso
  totalCandidates: number
  completedCandidates: number
  currentCandidateIndex: number

  // Dados
  candidates: IGTCandidate[]
  answers: IGTAnswer[]
  results: IGTResult[]

  // Auto-replay: padrões aprendidos
  learnedPatterns?: IGTLearnedPattern[]

  // Timestamps
  startedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Padrão aprendido para auto-replay
 */
export interface IGTLearnedPattern {
  id: string
  igtId: string
  projectId: string

  // Padrão de match
  pattern: {
    elementType?: string
    selectorPattern?: string      // Regex
    htmlPattern?: string          // Regex
    attributePatterns?: Record<string, string>  // Attribute name -> regex
  }

  // Resposta aprendida
  answers: Omit<IGTAnswer, 'candidateId' | 'timestamp'>[]
  expectedResult: AnswerResult

  // Confiança do padrão
  timesUsed: number
  timesCorrect: number
  confidence: number

  // Timestamps
  createdAt: string
  updatedAt: string
}

// ============================================
// SUMÁRIO DE IGTs
// ============================================

/**
 * Sumário de IGTs para uma auditoria
 */
export interface IGTSummary {
  auditId: string

  // Disponibilidade
  available: Array<{
    igtId: string
    name: string
    category: string
    candidateCount: number
    estimatedTime: number
    relevanceScore: number  // 0.0 a 1.0
  }>

  // Executados
  completed: Array<{
    igtId: string
    sessionId: string
    status: IGTStatus
    passCount: number
    failCount: number
    warningCount: number
    completedAt: string
  }>

  // Violações adicionais encontradas via IGT
  additionalViolations: number

  // Cobertura
  coverageIncrease: number  // % de aumento na cobertura vs só automático
}
```

### 2.3 IGT: Qualidade de Alt Text

**Arquivo**: `src/lib/igt/tests/images.ts`

```typescript
import type { IGTDefinition, AuditContext, IGTCandidate, IGTAnswer, IGTResult } from '../types'

/**
 * IGT para avaliar qualidade de alt text em imagens
 *
 * Este teste foca em:
 * 1. Imagens com alt text que parece inadequado
 * 2. Imagens sem alt text em contexto importante
 * 3. Alt text que não descreve o conteúdo real da imagem
 */
export const imagesAltTextIGT: IGTDefinition = {
  id: 'images-alt-text-quality',
  name: 'Qualidade do Texto Alternativo',
  description: 'Avalia se o texto alternativo das imagens descreve adequadamente seu conteúdo',
  category: 'images',
  wcagCriteria: ['1.1.1'],
  emagRecommendations: ['3.6'],
  estimatedTime: 5,

  isRelevant: (ctx: AuditContext) => {
    // Relevante se:
    // 1. Há violações de imagem detectadas
    // 2. Ou há muitas imagens na auditoria
    const hasImageViolations = ctx.violations.some(v =>
      ['image-alt', 'imagem-alt-nome-arquivo'].includes(v.ruleId)
    )
    return hasImageViolations
  },

  getCandidates: async (ctx: AuditContext): Promise<IGTCandidate[]> => {
    const candidates: IGTCandidate[] = []

    // Candidatos são imagens que:
    // 1. Têm alt text mas pode ser inadequado (detected by automation)
    // 2. Parecem importantes mas não têm alt text

    for (const violation of ctx.violations) {
      if (violation.ruleId === 'imagem-alt-nome-arquivo') {
        candidates.push({
          id: `img-${candidates.length}`,
          elementType: 'img',
          selector: violation.selector,
          xpath: '', // Será preenchido se necessário
          html: violation.html,
          pageUrl: violation.pageUrl,
          attributes: extractAttributes(violation.html),
          // ML prediction seria adicionado na Fase 3
        })
      }
    }

    return candidates
  },

  questions: [
    {
      id: 'q1-image-purpose',
      order: 1,
      type: 'multiple_choice',
      text: 'Qual é o propósito principal desta imagem?',
      helpText: 'Considere o que a imagem comunica no contexto da página',
      options: [
        {
          value: 'informative',
          label: 'Informativa - transmite informação importante',
          resultMapping: 'needs_more'  // Precisa verificar se alt é descritivo
        },
        {
          value: 'decorative',
          label: 'Decorativa - apenas visual, sem informação',
          resultMapping: 'pass'  // Decorativa = alt vazio é ok
        },
        {
          value: 'functional',
          label: 'Funcional - é um link ou botão',
          resultMapping: 'needs_more'  // Precisa verificar se alt descreve ação
        },
        {
          value: 'complex',
          label: 'Complexa - gráfico, diagrama ou infográfico',
          resultMapping: 'needs_more'  // Precisa de descrição longa
        },
      ]
    },
    {
      id: 'q2-alt-describes',
      order: 2,
      type: 'yes_no_unsure',
      text: 'O texto alternativo atual descreve adequadamente a imagem?',
      helpText: 'Compare o alt text com o conteúdo real da imagem',
      showIf: (prev) => {
        const purpose = prev.find(a => a.questionId === 'q1-image-purpose')
        return purpose?.value !== 'decorative'
      },
      resultMapping: {
        yes: 'pass',
        no: 'fail',
        unsure: 'warning'
      }
    },
    {
      id: 'q3-suggest-alt',
      order: 3,
      type: 'text_input',
      text: 'Sugira um texto alternativo mais adequado:',
      helpText: 'Descreva o que a imagem mostra em 1-2 frases',
      showIf: (prev) => {
        const describes = prev.find(a => a.questionId === 'q2-alt-describes')
        return describes?.value === 'no' || describes?.value === 'unsure'
      }
    },
  ],

  processResults: (answers: IGTAnswer[], candidates: IGTCandidate[]): IGTResult[] => {
    const results: IGTResult[] = []

    // Agrupar respostas por candidato
    const answersByCandidate = new Map<string, IGTAnswer[]>()
    for (const answer of answers) {
      const existing = answersByCandidate.get(answer.candidateId) || []
      existing.push(answer)
      answersByCandidate.set(answer.candidateId, existing)
    }

    for (const candidate of candidates) {
      const candidateAnswers = answersByCandidate.get(candidate.id) || []

      // Processar respostas
      const purposeAnswer = candidateAnswers.find(a => a.questionId === 'q1-image-purpose')
      const describesAnswer = candidateAnswers.find(a => a.questionId === 'q2-alt-describes')
      const suggestAnswer = candidateAnswers.find(a => a.questionId === 'q3-suggest-alt')

      let result: AnswerResult = 'pass'
      let confidence = 1.0

      // Determinar resultado
      if (purposeAnswer?.value === 'decorative') {
        // Imagem decorativa - verificar se alt está vazio
        const currentAlt = candidate.attributes?.alt || ''
        if (currentAlt && currentAlt.trim() !== '') {
          result = 'warning'  // Decorativa não deveria ter alt
        } else {
          result = 'pass'
        }
      } else if (describesAnswer?.value === 'no') {
        result = 'fail'
      } else if (describesAnswer?.value === 'unsure') {
        result = 'warning'
        confidence = 0.7
      }

      results.push({
        candidateId: candidate.id,
        result,
        confidence,
        answers: candidateAnswers,

        // Se falhou, criar dados para violação
        violation: result === 'fail' ? {
          ruleId: 'igt-alt-text-inadequate',
          impact: 'serious',
          help: 'Texto alternativo não descreve adequadamente a imagem',
          description: suggestAnswer?.value
            ? `Sugestão: "${suggestAnswer.value}"`
            : 'O texto alternativo não corresponde ao conteúdo da imagem',
          selector: candidate.selector,
          html: candidate.html,
          pageUrl: candidate.pageUrl,
        } : undefined
      })
    }

    return results
  }
}

// Helper para extrair atributos do HTML
function extractAttributes(html: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const matches = html.matchAll(/(\w+)=["']([^"']*)["']/g)
  for (const match of matches) {
    attrs[match[1]] = match[2]
  }
  return attrs
}
```

### 2.4 IGT: Propósito de Links

**Arquivo**: `src/lib/igt/tests/links.ts`

```typescript
import type { IGTDefinition, AuditContext, IGTCandidate, IGTAnswer, IGTResult } from '../types'

/**
 * IGT para avaliar propósito de links genéricos
 *
 * Este teste foca em:
 * 1. Links com texto genérico ("clique aqui", "saiba mais")
 * 2. Verificar se o contexto fornece significado suficiente
 */
export const linksPurposeIGT: IGTDefinition = {
  id: 'links-purpose',
  name: 'Propósito dos Links',
  description: 'Avalia se links com texto genérico são compreensíveis no contexto',
  category: 'links',
  wcagCriteria: ['2.4.4', '2.4.9'],
  emagRecommendations: ['3.5'],
  estimatedTime: 3,

  isRelevant: (ctx: AuditContext) => {
    return ctx.violations.some(v => v.ruleId === 'link-texto-generico')
  },

  getCandidates: async (ctx: AuditContext): Promise<IGTCandidate[]> => {
    return ctx.violations
      .filter(v => v.ruleId === 'link-texto-generico')
      .map((v, i) => ({
        id: `link-${i}`,
        elementType: 'a',
        selector: v.selector,
        xpath: '',
        html: v.html,
        pageUrl: v.pageUrl,
        attributes: extractAttributes(v.html),
      }))
  },

  questions: [
    {
      id: 'q1-context-clear',
      order: 1,
      type: 'yes_no_unsure',
      text: 'O propósito do link é claro pelo contexto ao redor?',
      helpText: 'Considere o texto antes/depois do link, títulos, e estrutura da página',
      resultMapping: {
        yes: 'pass',
        no: 'fail',
        unsure: 'warning'
      }
    },
    {
      id: 'q2-aria-description',
      order: 2,
      type: 'yes_no',
      text: 'O link tem aria-label ou aria-describedby que explica seu propósito?',
      helpText: 'Verifique os atributos ARIA no código do link',
      showIf: (prev) => {
        const contextClear = prev.find(a => a.questionId === 'q1-context-clear')
        return contextClear?.value === 'no'
      },
      resultMapping: {
        yes: 'pass',
        no: 'fail'
      }
    },
    {
      id: 'q3-suggest-text',
      order: 3,
      type: 'text_input',
      text: 'Sugira um texto de link mais descritivo:',
      helpText: 'Ex: "Leia mais sobre acessibilidade web" em vez de "Leia mais"',
      showIf: (prev) => {
        const ariaDesc = prev.find(a => a.questionId === 'q2-aria-description')
        return ariaDesc?.value === 'no'
      }
    },
  ],

  processResults: (answers: IGTAnswer[], candidates: IGTCandidate[]): IGTResult[] => {
    const results: IGTResult[] = []

    const answersByCandidate = groupAnswersByCandidate(answers)

    for (const candidate of candidates) {
      const candidateAnswers = answersByCandidate.get(candidate.id) || []

      const contextClear = candidateAnswers.find(a => a.questionId === 'q1-context-clear')
      const ariaDesc = candidateAnswers.find(a => a.questionId === 'q2-aria-description')
      const suggestText = candidateAnswers.find(a => a.questionId === 'q3-suggest-text')

      let result: AnswerResult = 'pass'
      let confidence = 1.0

      if (contextClear?.value === 'yes') {
        result = 'pass'
      } else if (contextClear?.value === 'unsure') {
        result = 'warning'
        confidence = 0.7
      } else if (ariaDesc?.value === 'yes') {
        result = 'pass'
      } else {
        result = 'fail'
      }

      results.push({
        candidateId: candidate.id,
        result,
        confidence,
        answers: candidateAnswers,
        violation: result === 'fail' ? {
          ruleId: 'igt-link-purpose-unclear',
          impact: 'serious',
          help: 'Link genérico sem contexto suficiente',
          description: suggestText?.value
            ? `Sugestão: "${suggestText.value}"`
            : 'O propósito do link não é claro pelo texto nem pelo contexto',
          selector: candidate.selector,
          html: candidate.html,
          pageUrl: candidate.pageUrl,
        } : undefined
      })
    }

    return results
  }
}

// Helpers
function extractAttributes(html: string): Record<string, string> {
  const attrs: Record<string, string> = {}
  const matches = html.matchAll(/(\w+)=["']([^"']*)["']/g)
  for (const match of matches) {
    attrs[match[1]] = match[2]
  }
  return attrs
}

function groupAnswersByCandidate(answers: IGTAnswer[]): Map<string, IGTAnswer[]> {
  const map = new Map<string, IGTAnswer[]>()
  for (const answer of answers) {
    const existing = map.get(answer.candidateId) || []
    existing.push(answer)
    map.set(answer.candidateId, existing)
  }
  return map
}
```

### 2.5 IGT: Plugin de Língua de Sinais Funcional

**Arquivo**: `src/lib/igt/tests/sign-language.ts`

```typescript
import type { IGTDefinition, AuditContext, IGTCandidate, IGTAnswer, IGTResult } from '../types'

/**
 * IGT para verificar se plugins de língua de sinais estão funcionando
 *
 * Suporta múltiplos plugins por idioma/país:
 * - VLibras, HandTalk (Libras - Brasil)
 * - SignAll, Ava (ASL - EUA)
 * - SignLive (BSL - Reino Unido)
 * - Outros detectados via padrões genéricos
 *
 * Este teste foca em:
 * 1. Widget carregou corretamente
 * 2. Botão está visível e acessível
 * 3. Avatar/intérprete aparece ao ativar
 */

// Plugins conhecidos por região/língua de sinais
const SIGN_LANGUAGE_PLUGINS = {
  // Libras (Brasil)
  libras: {
    name: 'Libras',
    selectors: ['[vw]', '.vw-access', '[data-ht]', '.ht-button', '.vlibras', '.hand-talk'],
    providers: ['VLibras', 'HandTalk']
  },
  // ASL (American Sign Language)
  asl: {
    name: 'ASL',
    selectors: ['.signall', '[data-ava]', '.asl-plugin', '.sign-language-asl'],
    providers: ['SignAll', 'Ava', 'ASL Services']
  },
  // BSL (British Sign Language)
  bsl: {
    name: 'BSL',
    selectors: ['.signlive', '.bsl-plugin', '[data-bsl]'],
    providers: ['SignLive', 'BSL Services']
  },
  // Genérico (detecta padrões comuns)
  generic: {
    name: 'Sign Language',
    selectors: [
      '[class*="sign-language"]',
      '[class*="signlanguage"]',
      '[id*="sign-language"]',
      '[aria-label*="sign language"]',
      '[aria-label*="língua de sinais"]',
      '[aria-label*="lenguaje de señas"]'
    ],
    providers: ['Unknown']
  }
}

export const signLanguageFunctionalIGT: IGTDefinition = {
  id: 'sign-language-functional',
  name: 'Funcionalidade do Plugin de Língua de Sinais',
  description: 'Verifica se o plugin de língua de sinais (VLibras, HandTalk, SignAll, etc) está funcionando',
  category: 'sign-language',
  wcagCriteria: ['1.2.6'],  // Sign Language (Prerecorded)
  estimatedTime: 2,

  isRelevant: (ctx: AuditContext) => {
    // Relevante se detectamos plugin de língua de sinais na página
    // OU se há violação indicando ausência (para sites que deveriam ter)
    const hasSignLanguageViolation = ctx.violations.some(v =>
      v.ruleId === 'sign-language-plugin-missing' ||
      v.ruleId === 'brasil-libras-plugin'  // Compatibilidade com regra existente
    )

    // Detectar se página tem plugin de língua de sinais
    const pageHasPlugin = ctx.violations.some(v =>
      Object.values(SIGN_LANGUAGE_PLUGINS).some(plugin =>
        plugin.selectors.some(sel => v.html?.includes(sel.replace(/[\[\].#]/g, '')))
      )
    )

    return hasSignLanguageViolation || pageHasPlugin
  },

  getCandidates: async (ctx: AuditContext): Promise<IGTCandidate[]> => {
    // Construir seletores de todos os plugins conhecidos
    const allSelectors = Object.values(SIGN_LANGUAGE_PLUGINS)
      .flatMap(p => p.selectors)
      .join(', ')

    return [{
      id: 'sign-language-plugin',
      elementType: 'plugin',
      selector: allSelectors,
      xpath: '',
      html: '<plugin>Sign Language Plugin</plugin>',
      pageUrl: ctx.baseUrl,
    }]
  },

  questions: [
    {
      id: 'q1-plugin-visible',
      order: 1,
      type: 'yes_no',
      text: 'O botão/ícone do plugin de língua de sinais está visível na página?',
      helpText: 'Procure por um ícone de mãos ou pessoa sinalizando, geralmente no canto da tela',
      resultMapping: {
        yes: 'needs_more',
        no: 'fail'
      }
    },
    {
      id: 'q2-plugin-clickable',
      order: 2,
      type: 'yes_no',
      text: 'Você consegue clicar/ativar o botão do plugin?',
      helpText: 'Tente clicar no ícone do plugin',
      showIf: (prev) => prev.find(a => a.questionId === 'q1-plugin-visible')?.value === 'yes',
      resultMapping: {
        yes: 'needs_more',
        no: 'fail'
      }
    },
    {
      id: 'q3-avatar-appears',
      order: 3,
      type: 'yes_no',
      text: 'O avatar/intérprete de língua de sinais aparece ao ativar?',
      helpText: 'Deve aparecer uma janela com um avatar ou vídeo de intérprete',
      showIf: (prev) => prev.find(a => a.questionId === 'q2-plugin-clickable')?.value === 'yes',
      resultMapping: {
        yes: 'pass',
        no: 'fail'
      }
    },
    {
      id: 'q4-avatar-signing',
      order: 4,
      type: 'yes_no',
      text: 'O avatar/intérprete está traduzindo o conteúdo (fazendo sinais)?',
      helpText: 'Selecione algum texto e veja se o intérprete traduz',
      showIf: (prev) => prev.find(a => a.questionId === 'q3-avatar-appears')?.value === 'yes',
      resultMapping: {
        yes: 'pass',
        no: 'warning'
      }
    },
    {
      id: 'q5-keyboard-accessible',
      order: 5,
      type: 'yes_no_unsure',
      text: 'É possível ativar o plugin usando apenas o teclado (Tab + Enter)?',
      helpText: 'Tente navegar até o botão usando Tab e ativá-lo com Enter',
      showIf: (prev) => prev.find(a => a.questionId === 'q1-plugin-visible')?.value === 'yes',
      resultMapping: {
        yes: 'pass',
        no: 'warning',
        unsure: 'warning'
      }
    },
  ],

  processResults: (answers: IGTAnswer[], candidates: IGTCandidate[]): IGTResult[] => {
    const candidate = candidates[0]
    const candidateAnswers = answers.filter(a => a.candidateId === candidate.id)

    const visible = candidateAnswers.find(a => a.questionId === 'q1-plugin-visible')
    const clickable = candidateAnswers.find(a => a.questionId === 'q2-plugin-clickable')
    const avatar = candidateAnswers.find(a => a.questionId === 'q3-avatar-appears')
    const signing = candidateAnswers.find(a => a.questionId === 'q4-avatar-signing')
    const keyboard = candidateAnswers.find(a => a.questionId === 'q5-keyboard-accessible')

    let result: AnswerResult = 'pass'
    let confidence = 1.0
    let description = ''

    if (visible?.value === 'no') {
      result = 'fail'
      description = 'Sign language plugin is not visible on the page'
    } else if (clickable?.value === 'no') {
      result = 'fail'
      description = 'Plugin button exists but is not clickable'
    } else if (avatar?.value === 'no') {
      result = 'fail'
      description = 'Plugin does not load the sign language interpreter'
    } else if (signing?.value === 'no') {
      result = 'warning'
      confidence = 0.8
      description = 'Interpreter appears but is not translating content'
    } else if (keyboard?.value === 'no') {
      result = 'warning'
      confidence = 0.8
      description = 'Plugin is not keyboard accessible'
    }

    return [{
      candidateId: candidate.id,
      result,
      confidence,
      answers: candidateAnswers,
      violation: result === 'fail' ? {
        ruleId: 'igt-sign-language-not-functional',
        impact: 'moderate',
        help: 'Sign language plugin is not working correctly',
        description,
        selector: candidate.selector,
        html: candidate.html,
        pageUrl: candidate.pageUrl,
      } : undefined
    }]
  }
}
```

### 2.6 Migration: Tabelas IGT

**Arquivo**: `supabase/migrations/00019_add_igt_tables.sql`

```sql
-- ============================================
-- Migration: Add IGT (Intelligent Guided Tests) Tables
-- ============================================

-- Enum para status de IGT
CREATE TYPE igt_status AS ENUM ('not_started', 'in_progress', 'completed', 'skipped');

-- Enum para resultado de resposta
CREATE TYPE igt_answer_result AS ENUM ('pass', 'fail', 'warning', 'needs_more', 'skip');

-- Tabela de sessões IGT
CREATE TABLE igt_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  igt_id VARCHAR(100) NOT NULL,  -- ID do IGT (ex: 'images-alt-text-quality')
  status igt_status NOT NULL DEFAULT 'not_started',

  -- Progresso
  total_candidates INTEGER NOT NULL DEFAULT 0,
  completed_candidates INTEGER NOT NULL DEFAULT 0,
  current_candidate_index INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de candidatos IGT
CREATE TABLE igt_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES igt_sessions(id) ON DELETE CASCADE,

  -- Dados do elemento
  element_type VARCHAR(50) NOT NULL,
  selector TEXT NOT NULL,
  xpath TEXT,
  html TEXT NOT NULL,
  page_url TEXT NOT NULL,
  attributes JSONB,
  surrounding_text TEXT,
  screenshot_url TEXT,

  -- ML prediction (Fase 3)
  ml_predicted_result igt_answer_result,
  ml_confidence DECIMAL(3,2),
  ml_reason TEXT,

  -- Ordem
  display_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de respostas IGT
CREATE TABLE igt_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES igt_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES igt_candidates(id) ON DELETE CASCADE,

  question_id VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,  -- Pode ser string, array, number, boolean
  selected_elements JSONB,  -- Para element_select
  comment TEXT,

  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de resultados IGT
CREATE TABLE igt_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES igt_sessions(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES igt_candidates(id) ON DELETE CASCADE,

  result igt_answer_result NOT NULL,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 1.0,

  -- Se criou violação
  violation_id UUID REFERENCES aggregated_violations(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de padrões aprendidos (auto-replay)
CREATE TABLE igt_learned_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  igt_id VARCHAR(100) NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Padrão de match
  pattern JSONB NOT NULL,

  -- Resposta aprendida
  answers JSONB NOT NULL,
  expected_result igt_answer_result NOT NULL,

  -- Confiança
  times_used INTEGER NOT NULL DEFAULT 1,
  times_correct INTEGER NOT NULL DEFAULT 1,
  confidence DECIMAL(3,2) NOT NULL DEFAULT 1.0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_igt_sessions_audit ON igt_sessions(audit_id);
CREATE INDEX idx_igt_sessions_status ON igt_sessions(audit_id, status);
CREATE INDEX idx_igt_candidates_session ON igt_candidates(session_id);
CREATE INDEX idx_igt_answers_session ON igt_answers(session_id);
CREATE INDEX idx_igt_answers_candidate ON igt_answers(candidate_id);
CREATE INDEX idx_igt_results_session ON igt_results(session_id);
CREATE INDEX idx_igt_learned_patterns_project ON igt_learned_patterns(project_id, igt_id);

-- Trigger para updated_at
CREATE TRIGGER update_igt_sessions_updated_at
  BEFORE UPDATE ON igt_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_igt_learned_patterns_updated_at
  BEFORE UPDATE ON igt_learned_patterns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE igt_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE igt_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE igt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE igt_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE igt_learned_patterns ENABLE ROW LEVEL SECURITY;

-- Policies (via audit -> project -> user)
CREATE POLICY "Users can access their IGT sessions" ON igt_sessions
  FOR ALL USING (
    audit_id IN (
      SELECT a.id FROM audits a
      JOIN projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their IGT candidates" ON igt_candidates
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM igt_sessions s
      JOIN audits a ON s.audit_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their IGT answers" ON igt_answers
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM igt_sessions s
      JOIN audits a ON s.audit_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their IGT results" ON igt_results
  FOR ALL USING (
    session_id IN (
      SELECT s.id FROM igt_sessions s
      JOIN audits a ON s.audit_id = a.id
      JOIN projects p ON a.project_id = p.id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access their learned patterns" ON igt_learned_patterns
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- Comentários
COMMENT ON TABLE igt_sessions IS 'Sessões de Intelligent Guided Tests';
COMMENT ON TABLE igt_candidates IS 'Elementos candidatos para avaliação em IGTs';
COMMENT ON TABLE igt_answers IS 'Respostas do usuário às perguntas de IGTs';
COMMENT ON TABLE igt_results IS 'Resultados finais de cada candidato em IGTs';
COMMENT ON TABLE igt_learned_patterns IS 'Padrões aprendidos para auto-replay de IGTs';
```

---

## FASE 3: Machine Learning para Classificação

### Objetivo
Usar ML para pré-classificar candidatos de IGT e detectar padrões de alt text inadequado.

### 3.1 Arquitetura ML

```
src/
├── lib/
│   └── ml/
│       ├── index.ts              # Exports
│       ├── types.ts              # Tipos ML
│       ├── alt-text-classifier.ts # Classificador de alt text
│       ├── element-detector.ts   # Detector de elementos interativos
│       ├── patterns.ts           # Padrões de detecção
│       └── training/
│           ├── dataset.ts        # Geração de dataset
│           └── evaluation.ts     # Métricas de avaliação
```

### 3.2 Classificador de Alt Text

**Arquivo**: `src/lib/ml/alt-text-classifier.ts`

```typescript
/**
 * Classificador de qualidade de alt text
 *
 * Usa heurísticas e padrões para classificar alt text como:
 * - good: Alt text adequado
 * - bad_filename: Parece nome de arquivo
 * - bad_generic: Muito genérico
 * - bad_placeholder: Texto placeholder
 * - needs_review: Precisa revisão humana
 */

export type AltTextQuality =
  | 'good'
  | 'bad_filename'
  | 'bad_generic'
  | 'bad_placeholder'
  | 'needs_review'

export interface AltTextClassification {
  quality: AltTextQuality
  confidence: number          // 0.0 a 1.0
  reason: string
  suggestedAction: 'keep' | 'remove' | 'replace' | 'review'
  patterns: string[]          // Padrões que matcharam
}

// ============================================
// PADRÕES DE DETECÇÃO
// ============================================

/**
 * Padrões que indicam nome de arquivo
 */
const FILENAME_PATTERNS = [
  /^IMG_\d+/i,
  /^DSC_?\d+/i,
  /^DCIM/i,
  /^Photo_?\d+/i,
  /^Screenshot/i,
  /^Screen Shot/i,
  /^Captura de/i,
  /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff?)$/i,
  /^\d{8}_\d{6}/,  // Timestamp pattern: 20241220_143022
  /^[A-Z]{2,4}\d{4,}/i,  // Camera codes: DSCN0001, P1000001
  /^image\d*$/i,
  /^foto\d*$/i,
  /^picture\d*$/i,
]

/**
 * Padrões que indicam alt text genérico
 */
const GENERIC_PATTERNS = [
  /^image$/i,
  /^foto$/i,
  /^photo$/i,
  /^picture$/i,
  /^imagem$/i,
  /^icon$/i,
  /^icone$/i,
  /^logo$/i,
  /^banner$/i,
  /^graphic$/i,
  /^illustration$/i,
  /^thumbnail$/i,
  /^avatar$/i,
  /^placeholder$/i,
]

/**
 * Padrões que indicam placeholder
 */
const PLACEHOLDER_PATTERNS = [
  /lorem ipsum/i,
  /placeholder/i,
  /test image/i,
  /imagem teste/i,
  /sample/i,
  /exemplo/i,
  /dummy/i,
  /temp/i,
  /todo/i,
  /fixme/i,
  /xxx/i,
]

/**
 * Padrões que indicam alt text provavelmente bom
 */
const GOOD_PATTERNS = [
  // Descritivo com substantivo + adjetivo/ação
  /\b(pessoa|homem|mulher|criança|grupo)\b.*\b(sorrindo|trabalhando|caminhando|sentad[ao])/i,
  // Objetos com contexto
  /\b(gráfico|tabela|diagrama)\b.*\b(mostrando|representando|comparando)/i,
  // Ações descritas
  /\b(clique|pressione|selecione|arraste)\b/i,
  // Logos com nome
  /logo\s+(da|do|de)\s+\w+/i,
]

// ============================================
// CLASSIFICADOR
// ============================================

/**
 * Classifica a qualidade de um alt text
 */
export function classifyAltText(
  altText: string,
  context?: {
    filename?: string       // Nome do arquivo da imagem
    nearbyText?: string     // Texto ao redor
    isInLink?: boolean      // Se imagem está dentro de link
    pageContext?: string    // Contexto da página
  }
): AltTextClassification {
  const alt = altText.trim()
  const matchedPatterns: string[] = []

  // Caso especial: alt vazio
  if (!alt) {
    return {
      quality: 'needs_review',
      confidence: 0.5,
      reason: 'Alt text vazio - pode ser decorativa ou faltando descrição',
      suggestedAction: 'review',
      patterns: ['empty_alt']
    }
  }

  // Verificar padrões de nome de arquivo
  for (const pattern of FILENAME_PATTERNS) {
    if (pattern.test(alt)) {
      matchedPatterns.push(`filename:${pattern.source}`)
    }
  }

  if (matchedPatterns.length > 0) {
    // Se alt é idêntico ao filename, alta confiança
    const confidence = context?.filename && alt === context.filename ? 0.98 : 0.90

    return {
      quality: 'bad_filename',
      confidence,
      reason: 'Alt text parece ser nome de arquivo',
      suggestedAction: 'replace',
      patterns: matchedPatterns
    }
  }

  // Verificar padrões de placeholder
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(alt)) {
      matchedPatterns.push(`placeholder:${pattern.source}`)
    }
  }

  if (matchedPatterns.length > 0) {
    return {
      quality: 'bad_placeholder',
      confidence: 0.95,
      reason: 'Alt text é texto placeholder',
      suggestedAction: 'replace',
      patterns: matchedPatterns
    }
  }

  // Verificar padrões genéricos
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(alt) && alt.length < 20) {  // Apenas se curto
      matchedPatterns.push(`generic:${pattern.source}`)
    }
  }

  if (matchedPatterns.length > 0) {
    // Se é "logo" em contexto de link, pode ser intencional
    if (context?.isInLink && /logo/i.test(alt)) {
      return {
        quality: 'needs_review',
        confidence: 0.60,
        reason: 'Alt text genérico mas pode ser apropriado em link',
        suggestedAction: 'review',
        patterns: matchedPatterns
      }
    }

    return {
      quality: 'bad_generic',
      confidence: 0.85,
      reason: 'Alt text muito genérico',
      suggestedAction: 'replace',
      patterns: matchedPatterns
    }
  }

  // Verificar padrões de alt text bom
  for (const pattern of GOOD_PATTERNS) {
    if (pattern.test(alt)) {
      matchedPatterns.push(`good:${pattern.source}`)
    }
  }

  if (matchedPatterns.length > 0) {
    return {
      quality: 'good',
      confidence: 0.80,
      reason: 'Alt text parece descritivo',
      suggestedAction: 'keep',
      patterns: matchedPatterns
    }
  }

  // Heurísticas adicionais

  // Alt text muito curto (< 5 chars) - provavelmente ruim
  if (alt.length < 5) {
    return {
      quality: 'bad_generic',
      confidence: 0.70,
      reason: 'Alt text muito curto',
      suggestedAction: 'review',
      patterns: ['too_short']
    }
  }

  // Alt text muito longo (> 150 chars) - pode ser excessivo
  if (alt.length > 150) {
    return {
      quality: 'needs_review',
      confidence: 0.60,
      reason: 'Alt text muito longo - verificar se necessário',
      suggestedAction: 'review',
      patterns: ['too_long']
    }
  }

  // Alt text com comprimento médio e sem padrões ruins
  return {
    quality: 'needs_review',
    confidence: 0.50,
    reason: 'Não foi possível determinar qualidade automaticamente',
    suggestedAction: 'review',
    patterns: ['unknown']
  }
}

/**
 * Batch classify múltiplos alt texts
 */
export function classifyAltTextBatch(
  items: Array<{
    altText: string
    context?: Parameters<typeof classifyAltText>[1]
  }>
): AltTextClassification[] {
  return items.map(item => classifyAltText(item.altText, item.context))
}

/**
 * Gera sugestão de alt text baseado no contexto
 * (Versão simples - Fase 3 terá versão com LLM)
 */
export function suggestAltText(context: {
  filename?: string
  nearbyText?: string
  pageTitle?: string
  isInLink?: boolean
  linkText?: string
}): string | null {
  // Se é logo em link, usar texto do link
  if (context.isInLink && context.linkText) {
    return `Logo - ${context.linkText}`
  }

  // Se tem texto próximo que parece descrição
  if (context.nearbyText) {
    const caption = context.nearbyText.match(/^[A-Z][^.!?]*[.!?]/)?.[0]
    if (caption && caption.length < 100) {
      return caption
    }
  }

  // Não conseguimos sugerir
  return null
}
```

### 3.3 Integração com IGT

**Arquivo**: `src/lib/igt/ml-integration.ts`

```typescript
import { classifyAltText, type AltTextClassification } from '../ml/alt-text-classifier'
import type { IGTCandidate } from './types'

/**
 * Enriquece candidatos de IGT com predições de ML
 */
export async function enrichCandidatesWithML(
  candidates: IGTCandidate[],
  igtId: string
): Promise<IGTCandidate[]> {
  // Só enriquecer IGTs suportados
  if (igtId !== 'images-alt-text-quality') {
    return candidates
  }

  return candidates.map(candidate => {
    // Extrair alt text do HTML
    const altMatch = candidate.html.match(/alt=["']([^"']*)["']/i)
    const altText = altMatch?.[1] || ''

    // Extrair src para contexto
    const srcMatch = candidate.html.match(/src=["']([^"']*)["']/i)
    const filename = srcMatch?.[1]?.split('/').pop()

    // Classificar
    const classification = classifyAltText(altText, { filename })

    // Mapear para formato de predição
    const mlPrediction = mapClassificationToPrediction(classification)

    return {
      ...candidate,
      mlPrediction
    }
  })
}

function mapClassificationToPrediction(
  classification: AltTextClassification
): IGTCandidate['mlPrediction'] {
  let predictedResult: 'pass' | 'fail' | 'warning' | 'needs_more' | 'skip'

  switch (classification.quality) {
    case 'good':
      predictedResult = 'pass'
      break
    case 'bad_filename':
    case 'bad_generic':
    case 'bad_placeholder':
      predictedResult = 'fail'
      break
    case 'needs_review':
    default:
      predictedResult = 'needs_more'
  }

  return {
    predictedResult,
    confidence: classification.confidence,
    reason: classification.reason
  }
}
```

---

## Resumo de Arquivos a Criar/Modificar

### Fase 1 (Níveis de Confiança)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/types/database.ts` | Modificar | Adicionar tipos ConfidenceLevel, ReviewReason, etc |
| `supabase/migrations/00018_add_confidence_levels.sql` | Criar | Migration para colunas de confiança |
| `src/lib/audit/confidence.ts` | Criar | Calculadora de confiança por regra |
| `src/lib/audit/false-positive-filters.ts` | Criar | Filtros de falso positivo |
| `src/lib/audit/auditor.ts` | Modificar | Integrar confiança e filtros |
| `src/components/audit/confidence-badge.tsx` | Criar | Badge de nível de confiança |
| `src/components/audit/violations-filter.tsx` | Modificar | Filtro por confiança |
| `src/messages/pt-BR.json` | Modificar | Traduções de confiança |
| `src/messages/en.json` | Modificar | Traduções em inglês |
| `src/messages/es.json` | Modificar | Traduções em espanhol |

### Fase 2 (IGTs)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/igt/types.ts` | Criar | Tipos para sistema IGT |
| `src/lib/igt/registry.ts` | Criar | Registro de IGTs disponíveis |
| `src/lib/igt/runner.ts` | Criar | Executor de IGTs |
| `src/lib/igt/storage.ts` | Criar | Persistência de sessões |
| `src/lib/igt/tests/images.ts` | Criar | IGT de alt text |
| `src/lib/igt/tests/links.ts` | Criar | IGT de links |
| `src/lib/igt/tests/sign-language.ts` | Criar | IGT de plugin de língua de sinais |
| `supabase/migrations/00019_add_igt_tables.sql` | Criar | Tabelas IGT |
| `src/app/[locale]/(dashboard)/projects/[id]/audits/[auditId]/igt/page.tsx` | Criar | Lista de IGTs |
| `src/components/igt/igt-runner.tsx` | Criar | UI de execução |
| `src/components/igt/igt-question.tsx` | Criar | Componente de pergunta |

### Fase 3 (ML)

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/lib/ml/types.ts` | Criar | Tipos ML |
| `src/lib/ml/alt-text-classifier.ts` | Criar | Classificador de alt text |
| `src/lib/ml/element-detector.ts` | Criar | Detector de elementos |
| `src/lib/igt/ml-integration.ts` | Criar | Integração ML + IGT |

---

## Cronograma Sugerido

### Fase 1: 2-3 semanas
- Semana 1: Tipos, migration, confidence.ts
- Semana 2: false-positive-filters.ts, integração auditor
- Semana 3: UI (badge, filtros), traduções, testes

### Fase 2: 4-6 semanas
- Semana 1-2: Tipos IGT, migration, estrutura base
- Semana 3-4: IGTs de images, links, sign-language
- Semana 5-6: UI de execução, persistência, auto-replay

### Fase 3: 8-12 semanas
- Semana 1-4: Classificador de alt text, padrões
- Semana 5-8: Integração com IGT, predições
- Semana 9-12: Avaliação, ajustes, documentação

---

## Métricas de Sucesso

### Fase 1
- Redução de 30%+ em falsos positivos reportados
- 100% das violações têm nível de confiança
- Filtro de confiança funcional na UI

### Fase 2
- 3+ IGTs funcionais (images, links, sign-language)
- Aumento de 20%+ na cobertura de issues
- Auto-replay funcionando para IGTs executados

### Fase 3
- Classificador de alt text com >80% accuracy
- Predições ML aparecem em IGTs
- Tempo de execução de IGT reduzido em 50%+

---

## Referências

- [Deque: Zero False Positives](https://www.deque.com/axe/)
- [Deque: Intelligent Guided Tests](https://docs.deque.com/devtools-for-web/4/en/devtools-igt/)
- [axe-core: Incomplete Results](https://www.deque.com/blog/upgrade-accessibility-testing-axe-extension-3-0/)
- [WAVE: Confidence Categories](https://wave.webaim.org/)
- [Apple: ML for Accessibility](https://machinelearning.apple.com/research/mobile-applications-accessible)
