# Plano: Sistema de Comparação e Evolução de Auditorias

## Objetivo

Implementar um sistema completo de comparação entre auditorias e visualização de evolução ao longo do tempo, permitindo que usuários técnicos e não-técnicos entendam o progresso da acessibilidade do seu site.

---

## 1. Modelo de Dados

### 1.1 Nova tabela: `audit_comparisons` (cache de comparações)

```sql
CREATE TABLE audit_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  previous_audit_id UUID NOT NULL REFERENCES audits(id) ON DELETE CASCADE,

  -- Deltas de summary
  delta_critical INTEGER NOT NULL DEFAULT 0,
  delta_serious INTEGER NOT NULL DEFAULT 0,
  delta_moderate INTEGER NOT NULL DEFAULT 0,
  delta_minor INTEGER NOT NULL DEFAULT 0,
  delta_total INTEGER NOT NULL DEFAULT 0,

  -- Deltas de score
  delta_health_score DECIMAL(5,2) NOT NULL DEFAULT 0,

  -- Deltas de páginas
  delta_pages_audited INTEGER NOT NULL DEFAULT 0,
  delta_broken_pages INTEGER NOT NULL DEFAULT 0,

  -- Contagens de violações
  new_violations_count INTEGER NOT NULL DEFAULT 0,
  fixed_violations_count INTEGER NOT NULL DEFAULT 0,
  persistent_violations_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(audit_id, previous_audit_id)
);

CREATE INDEX idx_audit_comparisons_audit_id ON audit_comparisons(audit_id);
CREATE INDEX idx_audit_comparisons_previous_audit_id ON audit_comparisons(previous_audit_id);
```

### 1.2 Nova tabela: `violation_changes` (detalhes das mudanças)

```sql
CREATE TABLE violation_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES audit_comparisons(id) ON DELETE CASCADE,

  -- Identificação da violação
  rule_id TEXT NOT NULL,
  fingerprint TEXT NOT NULL,

  -- Tipo de mudança
  change_type TEXT NOT NULL CHECK (change_type IN ('new', 'fixed', 'persistent', 'worsened', 'improved')),

  -- Dados da violação atual (se existir)
  current_occurrences INTEGER,
  current_page_count INTEGER,
  current_impact TEXT,

  -- Dados da violação anterior (se existir)
  previous_occurrences INTEGER,
  previous_page_count INTEGER,
  previous_impact TEXT,

  -- Delta
  delta_occurrences INTEGER NOT NULL DEFAULT 0,
  delta_page_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_violation_changes_comparison_id ON violation_changes(comparison_id);
CREATE INDEX idx_violation_changes_change_type ON violation_changes(change_type);
```

### 1.3 Novo campo em `audits`

```sql
ALTER TABLE audits ADD COLUMN health_score DECIMAL(5,2);
ALTER TABLE audits ADD COLUMN previous_audit_id UUID REFERENCES audits(id);

-- Índice para buscar auditorias anteriores rapidamente
CREATE INDEX idx_audits_project_created ON audits(project_id, created_at DESC);
```

---

## 2. APIs

### 2.1 GET `/api/audits/[id]/comparison`

Retorna comparação com auditoria anterior (ou especificada).

```typescript
// Query params
interface ComparisonQuery {
  with?: string  // ID de outra auditoria para comparar (opcional, default: anterior)
}

// Response
interface ComparisonResponse {
  current: {
    id: string
    createdAt: string
    completedAt: string
    healthScore: number
    summary: AuditSummary
    pagesAudited: number
    brokenPagesCount: number
  }
  previous: {
    id: string
    createdAt: string
    completedAt: string
    healthScore: number
    summary: AuditSummary
    pagesAudited: number
    brokenPagesCount: number
  } | null
  delta: {
    healthScore: number
    critical: number
    serious: number
    moderate: number
    minor: number
    total: number
    pagesAudited: number
    brokenPages: number
  }
  violations: {
    new: ViolationChange[]
    fixed: ViolationChange[]
    persistent: ViolationChange[]
    worsened: ViolationChange[]  // Mesma regra, mais ocorrências
    improved: ViolationChange[]  // Mesma regra, menos ocorrências
  }
  // Para dropdown de seleção
  availableAudits: Array<{
    id: string
    createdAt: string
    summary: AuditSummary
  }>
}
```

### 2.2 GET `/api/projects/[id]/evolution`

Retorna dados de evolução ao longo do tempo.

```typescript
// Query params
interface EvolutionQuery {
  period?: '7d' | '30d' | '90d' | '1y' | 'all'  // Default: '30d'
  limit?: number  // Max auditorias a retornar (default: 20)
}

// Response
interface EvolutionResponse {
  audits: Array<{
    id: string
    createdAt: string
    completedAt: string
    healthScore: number
    summary: AuditSummary
    pagesAudited: number
    brokenPagesCount: number
    wcagLevels: string[]
    includeEmag: boolean
  }>
  trends: {
    healthScore: TrendData
    critical: TrendData
    serious: TrendData
    moderate: TrendData
    minor: TrendData
    total: TrendData
  }
  insights: Insight[]  // Mensagens explicativas geradas automaticamente
}

interface TrendData {
  direction: 'up' | 'down' | 'stable'
  changePercent: number
  changeAbsolute: number
  values: Array<{ date: string; value: number }>
}

interface Insight {
  type: 'positive' | 'negative' | 'neutral' | 'warning'
  key: string  // Chave para i18n
  params: Record<string, string | number>  // Parâmetros para interpolação
}
```

---

## 3. Componentes de UI

### 3.1 Novos Componentes

```
src/components/audit/
├── comparison/
│   ├── comparison-card.tsx        # Card resumo no dashboard do projeto
│   ├── comparison-header.tsx      # Header com seletor de auditorias
│   ├── delta-badge.tsx            # Badge com +/- colorido
│   ├── delta-summary.tsx          # Grid de deltas por severidade
│   ├── violation-changes-list.tsx # Lista de violações novas/corrigidas
│   └── comparison-insights.tsx    # Mensagens explicativas
├── evolution/
│   ├── evolution-chart.tsx        # Gráfico de linhas (Recharts)
│   ├── evolution-card.tsx         # Card no dashboard
│   ├── trend-indicator.tsx        # Seta + % de mudança
│   └── period-selector.tsx        # Seletor de período (7d, 30d, etc)
└── index.ts
```

### 3.2 Componente: `DeltaBadge`

Badge que mostra mudança positiva/negativa com cores intuitivas.

```tsx
interface DeltaBadgeProps {
  value: number
  type: 'violations' | 'score' | 'pages'
  size?: 'sm' | 'md' | 'lg'
}

// Para violações: vermelho = mais (ruim), verde = menos (bom)
// Para score: verde = mais (bom), vermelho = menos (ruim)
// Para páginas: neutro (azul)
```

### 3.3 Componente: `ComparisonCard` (Dashboard do Projeto)

Card que aparece no dashboard mostrando resumo da última comparação.

```tsx
// Localização: Dashboard do projeto, abaixo do card de última auditoria
// Mostra:
// - "Comparado com auditoria de [data]"
// - Badges de delta: +3 críticas, -5 graves, etc
// - Score de saúde: 72% → 78% (+6%)
// - Botão "Ver detalhes" → página de comparação
```

### 3.4 Componente: `EvolutionChart`

Gráfico de linhas mostrando evolução ao longo do tempo.

```tsx
// Recharts LineChart
// Linhas:
// - Score de saúde (linha principal, mais grossa)
// - Críticas (vermelho)
// - Graves (roxo)
// - Moderadas (amarelo)
// - Menores (cinza)
// Toggle para mostrar/esconder cada linha
// Tooltip com detalhes ao hover
```

### 3.5 Componente: `ComparisonInsights`

Mensagens explicativas para usuários não-técnicos.

```tsx
// Exemplos de insights:
// ✅ "5 problemas críticos foram corrigidos desde a última auditoria"
// ⚠️ "3 novos problemas de contraste de cor apareceram na página /contato"
// 📈 "O score de saúde melhorou 8% no último mês"
// 🎯 "Foque em corrigir os 2 problemas críticos restantes para atingir 80%"
```

---

## 4. Páginas

### 4.1 Página de Comparação Detalhada

**Rota:** `/projects/[id]/audits/[auditId]/compare`

**Estrutura:**
```
Header: Seletor de auditoria para comparar
  └── Dropdown com lista de auditorias anteriores

Row 1: Resumo lado a lado
  ├── Card Auditoria Atual (data, score, summary)
  └── Card Auditoria Comparada (data, score, summary)

Row 2: Deltas
  └── Grid 4 colunas: Críticas | Graves | Moderadas | Menores
      └── Cada uma com DeltaBadge grande

Row 3: Insights
  └── ComparisonInsights (mensagens explicativas)

Row 4: Tabs de mudanças
  ├── Tab "Novas" (X) - Violações que não existiam antes
  ├── Tab "Corrigidas" (Y) - Violações que sumiram
  ├── Tab "Persistentes" (Z) - Violações que continuam
  ├── Tab "Pioraram" (W) - Mesma regra, mais ocorrências
  └── Tab "Melhoraram" (V) - Mesma regra, menos ocorrências

Row 5: Lista de violações (baseada na tab selecionada)
  └── ViolationChangesList
```

### 4.2 Atualização do Dashboard do Projeto

**Rota:** `/projects/[id]`

**Adições:**
```
Novo Row após "Última Auditoria":
  └── ComparisonCard (resumo da comparação com anterior)

Novo Row após Stats Cards:
  └── EvolutionCard com EvolutionChart (gráfico de tendência)
```

### 4.3 Atualização da Página de Resultados

**Rota:** `/projects/[id]/audits/[auditId]`

**Adições:**
```
Header atualizado:
  ├── Título: "Resultados da Auditoria"
  ├── Badge: "Comparando com [data da anterior]"
  └── Botão: "Comparar com outra" → Dropdown

Novo Card após ScoreCard:
  └── DeltaSummary (grid de deltas por severidade)
```

---

## 5. Traduções (i18n)

### 5.1 Novo namespace: `AuditComparison`

```json
{
  "AuditComparison": {
    "title": "Comparação de Auditorias",
    "comparingWith": "Comparando com",
    "selectAudit": "Selecionar auditoria",
    "noComparison": "Esta é a primeira auditoria do projeto",
    "comparedWith": "Comparado com auditoria de {date}",
    "viewDetails": "Ver detalhes",
    "compareWith": "Comparar com outra",

    "delta": {
      "new": "Novos",
      "fixed": "Corrigidos",
      "persistent": "Persistentes",
      "worsened": "Pioraram",
      "improved": "Melhoraram",
      "noChange": "Sem mudança",
      "increased": "Aumentou",
      "decreased": "Diminuiu"
    },

    "tabs": {
      "new": "Novas ({count})",
      "fixed": "Corrigidas ({count})",
      "persistent": "Persistentes ({count})",
      "worsened": "Pioraram ({count})",
      "improved": "Melhoraram ({count})"
    },

    "summary": {
      "healthScore": "Score de Saúde",
      "violations": "Violações",
      "pagesAudited": "Páginas Auditadas",
      "brokenPages": "Páginas Quebradas"
    },

    "tooltips": {
      "deltaPositive": "Aumento de {value} desde a última auditoria",
      "deltaNegative": "Redução de {value} desde a última auditoria",
      "newViolation": "Esta violação não existia na auditoria anterior",
      "fixedViolation": "Esta violação foi corrigida",
      "persistentViolation": "Esta violação persiste desde a auditoria anterior",
      "worsenedViolation": "Esta violação tem mais ocorrências agora",
      "improvedViolation": "Esta violação tem menos ocorrências agora"
    }
  }
}
```

### 5.2 Novo namespace: `AuditEvolution`

```json
{
  "AuditEvolution": {
    "title": "Evolução da Acessibilidade",
    "subtitle": "Acompanhe o progresso ao longo do tempo",

    "period": {
      "label": "Período",
      "7d": "Últimos 7 dias",
      "30d": "Últimos 30 dias",
      "90d": "Últimos 90 dias",
      "1y": "Último ano",
      "all": "Todo o histórico"
    },

    "chart": {
      "healthScore": "Score de Saúde",
      "violations": "Violações",
      "critical": "Críticas",
      "serious": "Graves",
      "moderate": "Moderadas",
      "minor": "Menores",
      "showAll": "Mostrar todas",
      "hideAll": "Esconder todas"
    },

    "trend": {
      "improving": "Melhorando",
      "worsening": "Piorando",
      "stable": "Estável",
      "noData": "Dados insuficientes"
    },

    "insights": {
      "criticalFixed": "{count} {count, plural, =1 {problema crítico foi corrigido} other {problemas críticos foram corrigidos}} desde a última auditoria",
      "newCritical": "{count} {count, plural, =1 {novo problema crítico apareceu} other {novos problemas críticos apareceram}}",
      "scoreImproved": "O score de saúde melhorou {percent}% {period}",
      "scoreDecreased": "O score de saúde caiu {percent}% {period}",
      "focusOn": "Foque em corrigir {count, plural, =1 {o problema crítico restante} other {os {count} problemas críticos restantes}} para melhorar seu score",
      "greatProgress": "Excelente progresso! Continue assim.",
      "noViolations": "Parabéns! Nenhuma violação encontrada.",
      "firstAudit": "Esta é sua primeira auditoria. Execute mais auditorias para ver a evolução."
    }
  }
}
```

### 5.3 Atualização de namespaces existentes

Adicionar em `ProjectInfo`:
```json
{
  "evolution": "Evolução",
  "comparison": "Comparação",
  "lastComparison": "Última Comparação"
}
```

---

## 6. Lógica de Negócio

### 6.1 Cálculo de Comparação

```typescript
// src/lib/audit/comparison.ts

interface ViolationFingerprint {
  ruleId: string
  fingerprint: string
}

export function calculateComparison(
  currentAudit: Audit,
  currentViolations: AggregatedViolation[],
  previousAudit: Audit,
  previousViolations: AggregatedViolation[]
): ComparisonResult {
  // 1. Criar maps por fingerprint
  const currentMap = new Map(currentViolations.map(v => [v.fingerprint, v]))
  const previousMap = new Map(previousViolations.map(v => [v.fingerprint, v]))

  // 2. Classificar mudanças
  const newViolations: ViolationChange[] = []
  const fixedViolations: ViolationChange[] = []
  const persistentViolations: ViolationChange[] = []
  const worsenedViolations: ViolationChange[] = []
  const improvedViolations: ViolationChange[] = []

  // Violações atuais
  for (const [fingerprint, current] of currentMap) {
    const previous = previousMap.get(fingerprint)

    if (!previous) {
      newViolations.push({ type: 'new', current, previous: null })
    } else {
      const delta = current.occurrences - previous.occurrences
      if (delta > 0) {
        worsenedViolations.push({ type: 'worsened', current, previous, delta })
      } else if (delta < 0) {
        improvedViolations.push({ type: 'improved', current, previous, delta })
      } else {
        persistentViolations.push({ type: 'persistent', current, previous, delta: 0 })
      }
    }
  }

  // Violações corrigidas (existiam antes, não existem mais)
  for (const [fingerprint, previous] of previousMap) {
    if (!currentMap.has(fingerprint)) {
      fixedViolations.push({ type: 'fixed', current: null, previous })
    }
  }

  // 3. Calcular deltas de summary
  const delta = {
    healthScore: calculateHealthScore(currentAudit) - calculateHealthScore(previousAudit),
    critical: (currentAudit.summary?.critical || 0) - (previousAudit.summary?.critical || 0),
    serious: (currentAudit.summary?.serious || 0) - (previousAudit.summary?.serious || 0),
    moderate: (currentAudit.summary?.moderate || 0) - (previousAudit.summary?.moderate || 0),
    minor: (currentAudit.summary?.minor || 0) - (previousAudit.summary?.minor || 0),
    total: (currentAudit.summary?.total || 0) - (previousAudit.summary?.total || 0),
  }

  return {
    current: currentAudit,
    previous: previousAudit,
    delta,
    violations: {
      new: newViolations,
      fixed: fixedViolations,
      persistent: persistentViolations,
      worsened: worsenedViolations,
      improved: improvedViolations,
    }
  }
}
```

### 6.2 Geração de Insights

```typescript
// src/lib/audit/insights.ts

export function generateInsights(
  comparison: ComparisonResult,
  locale: string
): Insight[] {
  const insights: Insight[] = []

  // Críticos corrigidos (positivo)
  if (comparison.violations.fixed.filter(v => v.previous?.impact === 'critical').length > 0) {
    const count = comparison.violations.fixed.filter(v => v.previous?.impact === 'critical').length
    insights.push({
      type: 'positive',
      key: 'criticalFixed',
      params: { count }
    })
  }

  // Novos críticos (negativo)
  if (comparison.violations.new.filter(v => v.current?.impact === 'critical').length > 0) {
    const count = comparison.violations.new.filter(v => v.current?.impact === 'critical').length
    insights.push({
      type: 'negative',
      key: 'newCritical',
      params: { count }
    })
  }

  // Score melhorou
  if (comparison.delta.healthScore > 5) {
    insights.push({
      type: 'positive',
      key: 'scoreImproved',
      params: { percent: Math.round(comparison.delta.healthScore) }
    })
  }

  // Score piorou
  if (comparison.delta.healthScore < -5) {
    insights.push({
      type: 'negative',
      key: 'scoreDecreased',
      params: { percent: Math.abs(Math.round(comparison.delta.healthScore)) }
    })
  }

  // Foco em críticos restantes
  const criticalRemaining = comparison.current.summary?.critical || 0
  if (criticalRemaining > 0 && criticalRemaining <= 5) {
    insights.push({
      type: 'warning',
      key: 'focusOn',
      params: { count: criticalRemaining }
    })
  }

  // Excelente progresso
  if (comparison.delta.total < -10 && comparison.delta.healthScore > 0) {
    insights.push({
      type: 'positive',
      key: 'greatProgress',
      params: {}
    })
  }

  return insights
}
```

---

## 7. Ordem de Implementação

### Sprint 1: Fundação (Banco + APIs)

1. [ ] Criar migration para novas tabelas (`audit_comparisons`, `violation_changes`)
2. [ ] Adicionar campo `health_score` na tabela `audits`
3. [ ] Atualizar Trigger.dev task para calcular e salvar `health_score`
4. [ ] Implementar `src/lib/audit/comparison.ts`
5. [ ] Implementar `src/lib/audit/insights.ts`
6. [ ] Criar API `GET /api/audits/[id]/comparison`
7. [ ] Criar API `GET /api/projects/[id]/evolution`
8. [ ] Adicionar tipos em `src/types/index.ts`

### Sprint 2: Componentes Base

1. [ ] Criar componente `DeltaBadge`
2. [ ] Criar componente `TrendIndicator`
3. [ ] Criar componente `PeriodSelector`
4. [ ] Criar componente `ComparisonInsights`
5. [ ] Adicionar traduções `AuditComparison` (pt-BR, en, es)
6. [ ] Adicionar traduções `AuditEvolution` (pt-BR, en, es)
7. [ ] Escrever testes para componentes

### Sprint 3: Dashboard do Projeto

1. [ ] Criar componente `ComparisonCard`
2. [ ] Criar componente `EvolutionChart` (Recharts LineChart)
3. [ ] Criar componente `EvolutionCard`
4. [ ] Integrar `ComparisonCard` no dashboard do projeto
5. [ ] Integrar `EvolutionCard` no dashboard do projeto
6. [ ] Escrever testes para componentes

### Sprint 4: Página de Comparação

1. [ ] Criar página `/projects/[id]/audits/[auditId]/compare`
2. [ ] Criar componente `ComparisonHeader` (seletor de auditoria)
3. [ ] Criar componente `DeltaSummary`
4. [ ] Criar componente `ViolationChangesList`
5. [ ] Criar tabs de mudanças (novas, corrigidas, etc)
6. [ ] Integrar tudo na página
7. [ ] Escrever testes

### Sprint 5: Refinamentos

1. [ ] Atualizar página de resultados da auditoria com botão "Comparar"
2. [ ] Adicionar badge de comparação no header da auditoria
3. [ ] Polir UX/UI baseado em feedback
4. [ ] Otimizar queries para performance
5. [ ] Adicionar loading states e error handling
6. [ ] Testes E2E

---

## 8. Considerações Técnicas

### 8.1 Performance

- Usar cache (`audit_comparisons`) para não recalcular toda vez
- Pré-calcular comparação com anterior ao finalizar auditoria
- Limitar histórico de evolução (últimas 50 auditorias)
- Usar índices apropriados nas queries

### 8.2 UX para Não-Técnicos

- Cores consistentes: verde = bom, vermelho = ruim
- Ícones claros: ↑ ↓ = para cima/baixo
- Tooltips explicativos em todos os números
- Mensagens de insight em linguagem simples
- Evitar jargões técnicos nas traduções

### 8.3 UX para Técnicos

- Dados detalhados disponíveis (clique para expandir)
- Filtros avançados na lista de mudanças
- Export de dados (CSV/JSON) - futuro
- Links diretos para violações específicas

### 8.4 Multi-idiomas

- Todas as strings via i18n
- Pluralização correta (1 problema vs X problemas)
- Formatação de datas respeitando locale
- Formatação de números respeitando locale

---

## 9. Mockups Conceituais

### 9.1 ComparisonCard (Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Comparação com auditoria anterior                       │
│  Comparado com: 15 de dezembro de 2024                      │
├─────────────────────────────────────────────────────────────┤
│  Score de Saúde    │  Críticas  │  Graves  │  Moderadas    │
│  72% → 78%         │   -3 ✓     │   +1 ⚠   │    -5 ✓       │
│  ↑ +6%             │            │          │               │
├─────────────────────────────────────────────────────────────┤
│  ✅ 8 problemas corrigidos   ⚠️ 2 novos problemas          │
│                                                             │
│  [Ver detalhes →]                                          │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 EvolutionChart (Dashboard)

```
┌─────────────────────────────────────────────────────────────┐
│  📈 Evolução da Acessibilidade        [Últimos 30 dias ▼]  │
├─────────────────────────────────────────────────────────────┤
│  100% ┤                                                     │
│   80% ┤        ●───●                    ●───●               │
│   60% ┤   ●───●     ╲                  ╱                    │
│   40% ┤              ╲                ╱                     │
│   20% ┤               ╲──────●───────●                      │
│    0% ┼────┬────┬────┬────┬────┬────┬────┬────┬────┬────   │
│       Nov  5   10   15   20   25   30  Dez  5   10   15    │
├─────────────────────────────────────────────────────────────┤
│  [●] Score   [●] Críticas   [●] Graves   [ ] Moderadas     │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Performance em projetos com muitas auditorias | Média | Alto | Cache + paginação + limites |
| Complexidade de UI para não-técnicos | Alta | Médio | Testes de usabilidade + insights claros |
| Inconsistência de dados entre auditorias | Baixa | Alto | Validação rigorosa + snapshots de config |
| Traduções incompletas | Média | Médio | Checklist de QA por idioma |

---

## Aprovação

- [ ] Modelo de dados aprovado
- [ ] APIs aprovadas
- [ ] Componentes aprovados
- [ ] Ordem de implementação aprovada
- [ ] Pronto para iniciar Sprint 1
