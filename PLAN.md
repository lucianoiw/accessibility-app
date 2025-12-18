# Plano: Reestruturar Descoberta de Páginas

## Objetivo

Permitir que usuários escolham como as páginas serão descobertas para auditoria:
1. **Manual** - URLs específicas (textarea, uma por linha)
2. **Sitemap** - Via URL do sitemap
3. **Rastreamento** - Crawler automático com configurações avançadas

## Decisões Tomadas

| Item | Decisão |
|------|---------|
| Nomenclatura 3ª aba | "Rastreamento" |
| Exclusão de paths | Textarea (1 por linha) |
| Limite máximo | 1-500 páginas |
| Upload de arquivos | **Fase 2** (botão desabilitado por enquanto) |
| URL base | Mantém no projeto como default, editável na auditoria |
| Depth | Relativo à URL de início informada, sempre dentro do path |

### Comportamento do Depth

Se usuário informar `https://example.com/blog/posts/`:
- **Depth 0**: A própria URL `/blog/posts/`
- **Depth 1**: Links encontrados em `/blog/posts/` que estejam dentro de `/blog/posts/*`
- **Depth 2**: Links dos links de depth 1, sempre dentro de `/blog/posts/*`
- **Depth 3**: Links dos links de depth 2, sempre dentro de `/blog/posts/*`

O crawler **nunca** sai do path base informado.

---

## Arquivos Afetados

### Banco de Dados
- `supabase/migrations/00011_discovery_config.sql` (nova migração)
- `src/types/database.ts` (atualizar tipos)
- `src/types/index.ts` (novos tipos)

### UI/Frontend
- `src/components/ui/tabs.tsx` (novo - shadcn)
- `src/components/ui/radio-group.tsx` (novo - shadcn)
- `src/app/(dashboard)/projects/[id]/start-audit-button.tsx` (refatorar completamente)
- `src/app/(dashboard)/projects/[id]/page.tsx` (passar baseUrl para StartAuditButton)

### Backend/API
- `src/lib/validations.ts` (novos schemas)
- `src/app/api/audits/route.ts` (atualizar payload)

### Crawler/Auditoria
- `src/lib/audit/crawler.ts` (suportar novas opções + path scoping)
- `src/trigger/audit.ts` (suportar novos modos)

---

## Mudanças no Banco de Dados

### Nova migração: `00011_discovery_config.sql`

```sql
-- Adicionar campos de configuração de descoberta na tabela audits
ALTER TABLE audits
ADD COLUMN discovery_method TEXT DEFAULT 'crawler'
  CHECK (discovery_method IN ('manual', 'sitemap', 'crawler')),
ADD COLUMN discovery_config JSONB DEFAULT '{}';

-- Comentários para documentação
COMMENT ON COLUMN audits.discovery_method IS 'Método de descoberta: manual, sitemap, crawler';
COMMENT ON COLUMN audits.discovery_config IS 'Configuração específica do método de descoberta';

-- Estrutura do discovery_config por método:
--
-- manual: {
--   "urls": ["https://example.com/page1", "https://example.com/page2"]
-- }
--
-- sitemap: {
--   "sitemapUrl": "https://example.com/sitemap.xml",
--   "maxPages": 100
-- }
--
-- crawler: {
--   "startUrl": "https://example.com/blog/", // URL de início (define o escopo)
--   "excludePaths": ["/admin/*", "/api/*"],
--   "depth": 2, // 1-3, relativo ao startUrl
--   "maxPages": 100 // 1-500
-- }
```

---

## Estrutura da UI

### Dialog de Configuração (expandido)

```
┌─────────────────────────────────────────────────────────────────┐
│ Configurar Auditoria                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  [Manual]  │  [Sitemap]  │  [Rastreamento]                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ (Conteúdo muda conforme a aba selecionada)                      │
│                                                                 │
│ ═══════════════════════════════════════════════════════════════ │
│                                                                 │
│ Opções de Análise                                               │
│ ─────────────────────────────────────────────────────────────── │
│ ☑ Nível A (básico)                                              │
│ ☑ Nível AA (recomendado)                                        │
│ ☐ Nível AAA (avançado)                                          │
│                                                                 │
│ ☑ Incluir referências ABNT NBR 17060                            │
│ ☑ Incluir conformidade eMAG 3.1                                 │
│ ☐ Incluir regras COGA (Acessibilidade Cognitiva)                │
│                                                                 │
│                               [Cancelar]  [Iniciar Auditoria]   │
└─────────────────────────────────────────────────────────────────┘
```

### Aba Manual

```
┌─────────────────────────────────────────────────────────────────┐
│ URLs Específicas                                                │
│                                                                 │
│ Adicione as URLs que deseja auditar. Uma por linha.             │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ https://example.com/page1                                   │ │
│ │ https://example.com/page2                                   │ │
│ │ https://example.com/about                                   │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ─── ou ───                                                      │
│                                                                 │
│ [📁 Importar de arquivo] (em breve)                             │
│                                                                 │
│ URLs válidas: 3                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Aba Sitemap

```
┌─────────────────────────────────────────────────────────────────┐
│ Sitemap                                                         │
│                                                                 │
│ URL do Sitemap                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ https://example.com/sitemap.xml                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ─── ou ───                                                      │
│                                                                 │
│ [📁 Importar arquivo sitemap.xml] (em breve)                    │
│                                                                 │
│ Limite de páginas                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 100                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ Máximo de páginas a auditar do sitemap (1-500)                  │
│                                                                 │
│ ⚠️ Mais de 200 páginas pode demorar significativamente.         │
└─────────────────────────────────────────────────────────────────┘
```

### Aba Rastreamento

```
┌─────────────────────────────────────────────────────────────────┐
│ Rastreamento Automático                                         │
│                                                                 │
│ URL de início                                                   │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ https://example.com/                          (pré-preenchido)│
│ └─────────────────────────────────────────────────────────────┘ │
│ O crawler só seguirá links dentro deste caminho.                │
│ Pré-preenchido com a URL base do projeto, mas editável.         │
│                                                                 │
│ Limite de páginas                                               │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 100                                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ Máximo de páginas a auditar (1-500)                             │
│ ⚠️ Mais de 200 páginas pode demorar significativamente.         │
│                                                                 │
│ Profundidade                                                    │
│ ○ 1 - Apenas links diretos da página inicial                    │
│ ● 2 - Até 2 níveis de profundidade (recomendado)                │
│ ○ 3 - Até 3 níveis de profundidade                              │
│                                                                 │
│ Excluir caminhos (opcional)                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ /admin/*                                                    │ │
│ │ /api/*                                                      │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ Um caminho por linha. Suporta wildcard (*).                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Etapas de Implementação

### Fase 1: Infraestrutura (banco + tipos)
1. Criar migração SQL `00011_discovery_config.sql`
2. Atualizar tipos TypeScript (`database.ts`, `index.ts`)
3. Criar novos schemas de validação Zod em `validations.ts`

### Fase 2: Componentes UI
1. Instalar dependências Radix:
   ```bash
   yarn add @radix-ui/react-tabs @radix-ui/react-radio-group
   ```
2. Criar componentes shadcn:
   - `src/components/ui/tabs.tsx`
   - `src/components/ui/radio-group.tsx`
3. Refatorar `start-audit-button.tsx`:
   - Adicionar Tabs para Manual | Sitemap | Rastreamento
   - Aba Manual: Textarea para URLs
   - Aba Sitemap: Input para URL do sitemap + limite
   - Aba Rastreamento: URL de início, limite, depth (radio), exclude paths (textarea)
   - Botões de upload desabilitados com texto "(em breve)"

### Fase 3: API + Validação
1. Criar schemas Zod para cada método de descoberta:
   - `ManualDiscoverySchema`
   - `SitemapDiscoverySchema`
   - `CrawlerDiscoverySchema`
2. Atualizar `CreateAuditSchema` para incluir `discoveryMethod` e `discoveryConfig`
3. Atualizar `/api/audits` POST para:
   - Validar configuração específica do método
   - Salvar `discovery_method` e `discovery_config` na audit
   - Passar para Trigger task

### Fase 4: Crawler + Task
1. Atualizar `crawler.ts`:
   - Função `crawlWithinPath(startUrl, depth, excludePaths)` - respeita escopo do path
   - Função `fetchSitemapUrls(sitemapUrl, maxPages)` - modo sitemap-only
2. Atualizar `audit.ts` (Trigger task):
   - Se `manual`: usar URLs diretamente, pular descoberta
   - Se `sitemap`: buscar URLs do sitemap, respeitar limite
   - Se `crawler`: usar nova função com path scoping

### Fase 5: Testes + Documentação
1. Testes unitários para novos schemas de validação
2. Atualizar CLAUDE.md com nova documentação do fluxo

---

## Backlog (Fase 2 - Futuro)

- [ ] Upload de arquivo CSV/TXT no modo Manual
- [ ] Upload de arquivo sitemap.xml no modo Sitemap
- [ ] Parsing de CSV com múltiplas colunas (URL, descrição, etc.)

---

## Tipos TypeScript

### Novos tipos em `src/types/index.ts`

```typescript
// Métodos de descoberta de páginas
export type DiscoveryMethod = 'manual' | 'sitemap' | 'crawler'

// Configuração para modo Manual
export interface ManualDiscoveryConfig {
  urls: string[]
}

// Configuração para modo Sitemap
export interface SitemapDiscoveryConfig {
  sitemapUrl: string
  maxPages: number
}

// Configuração para modo Crawler/Rastreamento
export interface CrawlerDiscoveryConfig {
  startUrl: string
  depth: 1 | 2 | 3
  maxPages: number
  excludePaths: string[]
}

// Union type para todas as configurações
export type DiscoveryConfig =
  | ManualDiscoveryConfig
  | SitemapDiscoveryConfig
  | CrawlerDiscoveryConfig
```

---

## Schemas Zod (validations.ts)

```typescript
// Schema para URLs válidas
const UrlSchema = z.string().url('URL inválida')

// Schema para modo Manual
export const ManualDiscoverySchema = z.object({
  method: z.literal('manual'),
  config: z.object({
    urls: z.array(UrlSchema)
      .min(1, 'Adicione pelo menos uma URL')
      .max(500, 'Máximo de 500 URLs'),
  }),
})

// Schema para modo Sitemap
export const SitemapDiscoverySchema = z.object({
  method: z.literal('sitemap'),
  config: z.object({
    sitemapUrl: UrlSchema,
    maxPages: z.number().int().min(1).max(500),
  }),
})

// Schema para modo Crawler/Rastreamento
export const CrawlerDiscoverySchema = z.object({
  method: z.literal('crawler'),
  config: z.object({
    startUrl: UrlSchema,
    depth: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    maxPages: z.number().int().min(1).max(500),
    excludePaths: z.array(z.string().max(200)).max(50).optional(),
  }),
})

// Union schema para validar qualquer método
export const DiscoverySchema = z.discriminatedUnion('method', [
  ManualDiscoverySchema,
  SitemapDiscoverySchema,
  CrawlerDiscoverySchema,
])
```

---

## Estimativa de Arquivos

| Tipo | Quantidade |
|------|------------|
| Novos arquivos | 3 (migração, tabs.tsx, radio-group.tsx) |
| Arquivos modificados | 6 |
| Linhas de código estimadas | ~600-800 |
