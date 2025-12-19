# Accessibility Audit Platform

## Visao Geral

Plataforma de auditoria de acessibilidade web focada no contexto brasileiro. Combina axe-core com regras customizadas brasileiras e mapeamento para ABNT NBR 17060.

## Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth)
- **Auditoria**: Playwright (browser automation), axe-core via `@axe-core/playwright` (npm)
- **Background Jobs**: Trigger.dev v4 (processamento assincrono)
- **i18n**: next-intl (pt-BR, en, es)
- **Linguagem**: TypeScript

## Estrutura Principal

```
src/
├── app/
│   ├── [locale]/             # Segmento dinamico de locale (pt-BR, en, es)
│   │   ├── (auth)/           # Rotas publicas
│   │   │   └── login/        # Pagina de login
│   │   └── (dashboard)/      # Rotas autenticadas
│   │       ├── projects/     # Lista e CRUD de projetos
│   │       │   └── [id]/     # Detalhe do projeto
│   │       │       ├── settings/   # Configuracoes do projeto
│   │       │       └── audits/     # Auditorias do projeto
│   │       │           └── [auditId]/  # Resultados da auditoria
│   │       │               ├── broken-pages-card.tsx  # Card de paginas quebradas
│   │       │               └── emag/   # Relatorio de conformidade eMAG
│   │       └── page.tsx      # Dashboard principal
│   ├── api/
│   │   ├── audits/           # API de auditoria (POST inicia, processa em background)
│   │   │   └── [id]/
│   │   │       ├── status/   # GET polling de status em tempo real
│   │   │       ├── cancel/   # POST cancelar auditoria via Trigger.dev
│   │   │       └── emag/     # GET avaliacao eMAG
│   │   ├── health/           # Health check endpoint
│   │   ├── projects/[id]/auth/  # Configuracao de autenticacao de sites
│   │   ├── reports/          # API de relatorios (PDF, etc)
│   │   └── violations/[id]/  # Sugestoes e verificacao de violacoes
│   └── auth/                 # Callbacks de autenticacao Supabase
├── components/
│   ├── audit/                # Componentes de auditoria (score-card, charts, etc)
│   ├── layout/               # Componentes de layout (header, nav, switchers)
│   ├── reports/              # Componentes de exportacao
│   ├── ui/                   # Componentes shadcn/ui
│   └── error-boundary.tsx    # Error boundary global
├── i18n/
│   ├── navigation.ts         # Link e useRouter tipados com locale
│   ├── request.ts            # getRequestConfig para server components
│   └── routing.ts            # Configuracao de locales e pathnames
├── messages/
│   ├── pt-BR.json            # Traducoes portugues brasileiro (default)
│   ├── en.json               # Traducoes ingles
│   └── es.json               # Traducoes espanhol
├── lib/
│   ├── audit/
│   │   ├── auditor.ts        # Core: usa @axe-core/playwright, extrai links, classifica erros
│   │   ├── crawler.ts        # Descoberta de URLs (sitemap + crawl + extractLinks)
│   │   ├── custom-rules.ts   # Regras brasileiras customizadas (21 regras base)
│   │   ├── coga-rules.ts     # Regras COGA de acessibilidade cognitiva (6 regras)
│   │   ├── rule-labels.ts    # Labels amigaveis em PT-BR
│   │   ├── abnt-map.ts       # Mapeamento WCAG -> ABNT NBR 17060
│   │   ├── emag-map.ts       # Mapeamento eMAG 3.1 (45 recomendacoes)
│   │   ├── emag-evaluator.ts # Avaliador de conformidade eMAG
│   │   ├── health.ts         # Calculos de saude/score da acessibilidade
│   │   ├── parallel.ts       # Processamento paralelo de paginas
│   │   ├── score-calculator.ts  # Calculo de scores de acessibilidade
│   │   ├── category-mapper.ts   # Mapeamento de categorias WCAG
│   │   ├── scan-logs.ts      # Logs de varredura em tempo real
│   │   ├── conformance-standards.ts  # Padroes de conformidade
│   │   └── syllables-pt-br.ts  # Contagem de silabas PT-BR (legibilidade)
│   ├── reports/
│   │   ├── pdf-generator.ts  # Geracao de PDF (react-pdf)
│   │   ├── data-builder.ts   # Construcao de dados para relatorios
│   │   ├── types.ts          # Tipos para relatorios
│   │   └── templates/        # Templates de relatorios
│   │       └── styles.ts     # Estilos para PDF
│   ├── supabase/
│   │   ├── server.ts         # Cliente com cookies (respeita RLS)
│   │   ├── admin.ts          # Cliente com service role (bypassa RLS)
│   │   ├── client.ts         # Cliente para browser
│   │   └── middleware.ts     # Middleware de autenticacao
│   ├── validations.ts        # Schemas Zod para validacao de entrada
│   └── csrf.ts               # Protecao CSRF via Origin/Host
├── trigger/
│   └── audit.ts              # Task Trigger.dev com loop iterativo
└── types/
    ├── index.ts              # Tipos compartilhados (inclui BrokenPage, BrokenPageErrorType)
    └── database.ts           # Tipos gerados do Supabase
```

## Fluxo de Auditoria (Iterativo)

O fluxo de auditoria usa uma abordagem **iterativa/lazy** que combina descoberta e auditoria em um unico loop:

1. Usuario clica "Iniciar Auditoria" com configs (WCAG levels, max pages, ABNT)
2. API cria registro de audit com status CRAWLING
3. **Descoberta inicial**: `discoverInitialUrls()` busca URLs via sitemap.xml e/ou crawl de links
   - Margem de 50% extra (CANDIDATE_MARGIN: 1.5x) para compensar paginas quebradas
4. **Loop iterativo** (max 50 iteracoes):
   - Seleciona batch de 5 URLs candidatas (BATCH_SIZE)
   - Para cada URL em paralelo:
     - Playwright abre pagina
     - Verifica status HTTP (>=400 = erro)
     - Se erro: salva em `broken_pages` e continua
     - Se sucesso: executa auditoria (axe-core + regras customizadas)
     - Extrai novos links da pagina (`extractLinksFromPage`)
   - Adiciona links descobertos ao pool de candidatos
   - Repete ate atingir `max_pages` ou esgotar candidatos
5. Agrega violacoes por fingerprint
6. Calcula prioridade (impacto + frequencia + spread)
7. Gera sugestoes com IA (se configurado)
8. Status final: COMPLETED

### Constantes do Loop

```typescript
const BATCH_SIZE = 5;           // Paginas auditadas em paralelo por iteracao
const MAX_ITERATIONS = 50;      // Limite de seguranca para evitar loops infinitos
const CANDIDATE_MARGIN = 1.5;   // Margem de 50% extra para descoberta inicial
```

### Classificacao de Erros (Paginas Quebradas)

```typescript
type BrokenPageErrorType =
  | 'timeout'           // Pagina nao carregou no tempo limite
  | 'http_error'        // Status HTTP >= 400 (404, 500, etc)
  | 'connection_error'  // Erro de conexao (DNS, rede)
  | 'ssl_error'         // Certificado SSL invalido
  | 'other'             // Outros erros
```

### Campos Importantes da Tabela `audits`

```typescript
interface Audit {
  // ... campos padrao ...
  trigger_run_id: string | null  // ID do run no Trigger.dev (para cancelamento)
  status: 'PENDING' | 'CRAWLING' | 'AUDITING' | 'AGGREGATING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
}
```

## Regras Customizadas Brasileiras (21 regras base + 6 COGA)

| Regra                       | Descricao                               | Padrao               |
| --------------------------- | --------------------------------------- | -------------------- |
| `link-texto-generico`       | "clique aqui", "saiba mais", etc        | eMAG 3.5, WCAG 2.4.4 |
| `link-nova-aba-sem-aviso`   | target="\_blank" sem indicacao          | eMAG 1.9, WCAG 3.2.5 |
| `imagem-alt-nome-arquivo`   | alt parece ser nome de arquivo          | eMAG 3.6, WCAG 1.1.1 |
| `texto-justificado`         | text-align: justify                     | WCAG 1.4.8 (AAA)     |
| `texto-maiusculo-css`       | text-transform: uppercase em blocos     | WCAG 1.4.8 (AAA)     |
| `br-excessivo-layout`       | multiplos `<br>` para espacamento       | eMAG 1.6, WCAG 1.3.1 |
| `atributo-title-redundante` | title duplica texto/alt/aria-label      | Best practice        |
| `rotulo-curto-ambiguo`      | botoes/links com 1-2 caracteres         | WCAG 2.4.4, 2.5.3    |
| `conteudo-lorem-ipsum`      | texto placeholder em producao           | QA                   |
| `fonte-muito-pequena`       | font-size < 12px                        | WCAG 1.4.4           |
| `brasil-libras-plugin`      | ausencia de VLibras/Hand Talk           | Especifico BR        |
| `emag-skip-links`           | ausencia de links "pular para conteudo" | eMAG 1.5, WCAG 2.4.1 |
| `emag-atalhos-teclado`      | sites gov.br sem Alt+1/2/3              | eMAG 1.5             |
| `emag-links-adjacentes`     | links adjacentes sem separador          | eMAG 1.7, WCAG 1.3.1 |
| `emag-breadcrumb`           | paginas internas sem breadcrumb         | eMAG 3.4, WCAG 2.4.8 |
| `emag-tabela-layout`        | tabela usada para layout                | eMAG 1.6, WCAG 1.3.1 |
| `emag-pdf-acessivel`        | PDF sem indicacao de formato            | eMAG 3.8, WCAG 1.1.1 |
| `autoplay-video-audio`      | midia com autoplay sem controles        | eMAG 2.7, WCAG 1.4.2 |
| `carrossel-sem-controles`   | carrossel/slideshow sem pause/navegacao | eMAG 2.7, WCAG 2.2.2 |
| `refresh-automatico`        | meta refresh ou redirect automatico     | eMAG 2.3, 2.4        |
| `barra-acessibilidade-gov-br` | site gov.br sem barra de acessibilidade | eMAG 1.5             |

### Regras COGA (Acessibilidade Cognitiva) - Opcional

**Diferencial competitivo**: Nenhuma ferramenta internacional implementa bem acessibilidade cognitiva, especialmente calculo de legibilidade em portugues.

| Regra                       | Descricao                                     | Padrao               |
| --------------------------- | --------------------------------------------- | -------------------- |
| `legibilidade-texto-complexo` | Texto com baixa legibilidade (Flesch PT-BR < 50) | eMAG 3.11, WCAG 3.1.5 |
| `siglas-sem-expansao`       | Sigla sem `<abbr title>` ou explicacao        | eMAG 3.12, WCAG 3.1.4 |
| `linguagem-inconsistente`   | Texto em outro idioma sem `lang="en"`         | eMAG 3.2, WCAG 3.1.2 |
| `timeout-sem-aviso`         | Formulario com timeout sem aviso visivel      | eMAG 2.5, WCAG 2.2.1 |
| `captcha-sem-alternativa`   | CAPTCHA visual sem alternativa de audio       | eMAG 6.8, WCAG 1.1.1 |
| `animacao-sem-pause`        | Animacao CSS/GIF/SVG infinita sem pause       | eMAG 5.5, WCAG 2.2.2 |

**Formula de Legibilidade Flesch-Kincaid PT-BR (Martins et al., 1996):**

```typescript
score = 248.835 - (1.015 * ASL) - (84.6 * ASW)
// ASL = media de palavras por sentenca
// ASW = media de silabas por palavra

// Interpretacao:
// 75-100: Muito facil (4a serie)
// 50-75:  Facil (5a-8a serie) <- ALVO eMAG 3.11
// 25-50:  Dificil (ensino medio)
// 0-25:   Muito dificil (ensino superior)
```

### Cobertura Atual vs Padroes

**axe-core** cobre ~57% dos criterios WCAG automaticamente (~100 regras).
Nossas regras customizadas focam em gaps especificos do contexto brasileiro.

## Comandos

```bash
yarn dev           # Desenvolvimento
yarn build         # Build producao
yarn lint          # Linting
yarn test          # Rodar todos os testes
yarn test:coverage # Rodar testes com cobertura
```

## Testes

### Stack de Testes

- **Framework**: Vitest (compativel com Jest API)
- **Ambiente**: jsdom (simulacao de browser)
- **React Testing**: @testing-library/react + @testing-library/user-event
- **Mocking**: vi.mock, vi.hoisted (para mocks hoisted)

### Cobertura Atual (~757 testes em 42 arquivos)

| Area | Statements | Linhas |
|------|-----------|--------|
| **components/ui** | 88.19% | 88.74% |
| **lib/supabase** | 81.25% | 81.25% |
| **lib (root)** | 100% | 100% |
| **lib/audit** | 23.17% | 22.27% |
| **Overall** | 16.73% | 16.59% |

### Arquivos de Teste

```
__tests__/
├── components/
│   ├── audit/              # Componentes de auditoria
│   │   ├── scan-logs.test.tsx
│   │   ├── score-card.test.tsx
│   │   └── score-modal.test.tsx
│   ├── layout/             # Componentes de layout
│   │   └── language-switcher.test.tsx
│   ├── reports/            # Componentes de exportacao
│   │   └── export-button.test.tsx
│   ├── ui/                 # Todos os componentes shadcn/ui
│   │   ├── autocomplete.test.tsx
│   │   ├── badge.test.tsx
│   │   ├── button.test.tsx
│   │   ├── card.test.tsx
│   │   ├── checkbox.test.tsx
│   │   ├── collapsible.test.tsx
│   │   ├── dialog.test.tsx
│   │   ├── dropdown-menu.test.tsx
│   │   ├── input.test.tsx
│   │   ├── label.test.tsx
│   │   ├── popover.test.tsx
│   │   ├── progress.test.tsx
│   │   ├── select.test.tsx
│   │   ├── separator.test.tsx
│   │   ├── tags-input.test.tsx
│   │   ├── textarea.test.tsx
│   │   ├── theme-provider.test.tsx
│   │   └── tooltip.test.tsx
│   └── error-boundary.test.tsx
├── lib/
│   ├── audit/
│   │   ├── abnt-map.test.ts
│   │   ├── crawler-utils.test.ts  # normalizeUrl, getPathFromUrl
│   │   ├── emag-evaluator.test.ts
│   │   ├── emag-map.test.ts
│   │   ├── health.test.ts
│   │   ├── parallel.test.ts
│   │   └── rule-labels.test.ts
│   ├── reports/
│   │   ├── data-builder.test.ts   # generateReportFileName
│   │   ├── templates/
│   │   │   └── styles.test.ts
│   │   └── types.test.ts
│   ├── supabase/
│   │   ├── admin.test.ts
│   │   ├── client.test.ts
│   │   ├── middleware.test.ts
│   │   └── server.test.ts
│   ├── csrf.test.ts
│   └── validations.test.ts
├── styles/
│   └── fonts.test.ts
└── utils/
    └── cn.test.ts
```

### Padrao de Mocking com vi.hoisted

Quando precisar usar variaveis de mock dentro de `vi.mock()`, use `vi.hoisted()`:

```typescript
// CORRETO - mock hoisted
const { mockFn, mockClient } = vi.hoisted(() => ({
  mockFn: vi.fn(),
  mockClient: { auth: { getUser: vi.fn() } },
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockClient),
}))

// ERRADO - causa ReferenceError
const mockFn = vi.fn()  // NAO funciona com vi.mock()
vi.mock('module', () => ({ fn: mockFn }))
```

### Codigo Nao Testavel (Requer E2E)

| Modulo | Motivo |
|--------|--------|
| `auditor.ts`, `crawler.ts` | Dependem de Playwright |
| `custom-rules.ts`, `coga-rules.ts` | Manipulam DOM real via Playwright |
| `syllables-pt-br.ts` | Regex Unicode `\p{L}` nao suportado em jsdom |
| `pdf-generator.ts` | Requer renderizacao no browser |
| `templates/*.tsx` | Componentes React para PDF |
| `trigger/*.ts` | Runtime do Trigger.dev |
| API routes | Requerem mocking complexo de Next.js Request/Response |
| Portal components | dropdown-menu, select, popover - Portals nao renderizam em jsdom |

### Codigo Defensivo (Inalcancavel)

Algumas linhas nao cobertas sao codigo defensivo que nunca e executado:

- `autocomplete.tsx:91-95` - `onFocus` abre dropdown antes de qualquer tecla
- `tags-input.tsx:33` - Input desabilitado quando maxTags atingido
- `health.ts:279` - `default` case inalcancavel (regex garante 1-4)

## Variaveis de Ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # Para operacoes admin (bypassa RLS)
```

---

## Funcionalidades Implementadas

### Auditoria Core

- [x] Auditoria com axe-core via `@axe-core/playwright` (npm, nao CDN)
- [x] 21 regras customizadas brasileiras + 6 regras COGA (acessibilidade cognitiva)
- [x] Mapeamento WCAG -> ABNT NBR 17060
- [x] Crawler inteligente (sitemap + crawl de links)
- [x] Espera DOM estabilizar (waitForPageStable com request tracker)
- [x] 5 workers paralelos para auditoria (batches de 5 paginas)
- [x] Deteccao de SPAs (loading indicators no titulo, network tracking)
- [x] Politica de subdominios (main_only, all_subdomains, specific)
- [x] Fluxo iterativo (descoberta + auditoria combinados em loop)
- [x] Extracao de links durante auditoria para descoberta dinamica

### Paginas Quebradas (Broken Pages)

- [x] Deteccao automatica de paginas com erro durante auditoria
- [x] Classificacao por tipo de erro (timeout, http_error, connection_error, ssl_error, other)
- [x] Verificacao de status HTTP (>=400 = erro)
- [x] Tabela dedicada `broken_pages` com detalhes do erro
- [x] Card visual na pagina de resultados com badges coloridos por tipo
- [x] Contagem de paginas com problema no resumo da auditoria
- [x] Contagem de iteracoes de descoberta (crawl_iterations)
- [x] Comparacao "paginas solicitadas" vs "paginas auditadas"

### Escalabilidade

- [x] Processamento em background com Trigger.dev
- [x] Retries automaticos para paginas que falham
- [x] Observabilidade via dashboard Trigger.dev
- [x] 50k runs/mes gratis, concorrencia ilimitada
- [x] Machine preset `medium-2x` (2 vCPU, 4 GB RAM) para evitar OOM
- [x] Cancelamento de auditoria via `runs.cancel()` (Trigger.dev API)

### Cancelamento de Auditoria

- [x] Coluna `trigger_run_id` na tabela `audits` para rastrear run do Trigger.dev
- [x] API `POST /api/audits/[id]/cancel` para cancelar auditoria em andamento
- [x] Cancelamento direto via `runs.cancel()` do Trigger.dev SDK
- [x] Verificacao de status CANCELLED antes de atualizar para COMPLETED
- [x] Polling de status a cada 3 segundos (`/api/audits/[id]/status`)
- [x] UI de progresso com botao "Cancelar"
- [x] Redirecionamento para lista apos cancelamento
- [x] Card especifico para auditorias canceladas

### Comparacao e Evolucao de Auditorias (Sprint 1 - Backend)

- [x] Campos `health_score` e `previous_audit_id` na tabela `audits`
- [x] Tabela `audit_comparisons` para cache de comparacoes
- [x] Tabela `violation_changes` para detalhes de mudancas
- [x] Calculo automatico de `health_score` ao finalizar auditoria
- [x] Link automatico para auditoria anterior (`previous_audit_id`)
- [x] API `GET /api/audits/[id]/comparison` para comparacao entre auditorias
- [x] API `GET /api/projects/[id]/evolution` para dados de evolucao
- [x] Logica de comparacao: novas, corrigidas, persistentes, pioraram, melhoraram
- [x] Calculo de deltas por severidade (critical, serious, moderate, minor)
- [x] Geracao de insights automaticos (mensagens explicativas)
- [x] Calculo de tendencias (up, down, stable) com percentuais
- [x] Suporte a periodos (7d, 30d, 90d, 1y, all)
- [x] Tipos TypeScript completos para todas as estruturas

**Arquivos criados:**
- `supabase/migrations/00015_add_audit_comparison.sql`
- `src/lib/audit/comparison.ts` - Logica de comparacao
- `src/lib/audit/insights.ts` - Geracao de insights e tendencias
- `src/app/api/audits/[id]/comparison/route.ts`
- `src/app/api/projects/[id]/evolution/route.ts`

**Proximos passos (Sprint 2+):**
- [ ] Componentes UI: DeltaBadge, TrendIndicator, ComparisonCard, EvolutionChart
- [ ] Pagina de comparacao detalhada
- [ ] Integracao no dashboard do projeto
- [ ] Traducoes (AuditComparison, AuditEvolution)

### Gestao de Violacoes

- [x] Agregacao por regra com elementos unicos (unique_elements)
- [x] Rastreamento de fullPath (CSS) e XPath para cada elemento
- [x] Toggle CSS/XPath na UI (XPath mais estavel para CSS-in-JS)
- [x] Botao "Copiar seletor" para DevTools
- [x] Filtros avancados (impact, WCAG level, regra, tipo, status, ABNT)
- [x] Filtro por URL/pagina com Autocomplete (busca em todas as paginas)
- [x] Ordenacao por prioridade, criticidade, ocorrencias, paginas
- [x] Status de violacao (open, fixed, ignored, false_positive)
- [x] Metrica "paginas com violacoes" no resumo da auditoria

### Sugestoes com IA

- [x] Gerar sugestoes de codigo corrigido (Claude API)
- [x] Explicacao do problema em linguagem simples
- [x] Snippet de HTML acessivel sugerido

### Verificacao de Correcoes

- [x] Botao "Verificar" para re-auditar paginas afetadas
- [x] Contagem de ocorrencias restantes vs corrigidas
- [x] Historico de verificacao por violacao

### Autenticacao de Sites

- [x] No Auth (padrao)
- [x] Bearer Token
- [x] Cookies (para SPAs com auth via cookie)

### Exportacao de Relatorios

- [x] Sistema de geracao de relatorios (lib/reports/)
- [x] Tipos de relatorio: executive_pdf, technical_pdf, csv, json
- [x] API de relatorios (/api/reports)
- [x] Organizacao por principios WCAG (POUR)
- [x] Mapeamento WCAG por nivel (A, AA, AAA)
- [x] Metricas calculadas (conformidade %, violacoes por severidade, por principio)
- [x] Formatacao de violacoes para PDF com elementos unicos
- [x] Integracao com regras brasileiras customizadas
- [x] Componente ExportButton com download direto
- [x] Status de geracao (pending, generating, completed, failed)

### Seguranca

- [x] Validacao de entrada com Zod (schemas tipados)
- [x] Protecao CSRF via validacao Origin/Host
- [x] Verificacao de ownership em todas as APIs (project.user_id === user.id)
- [x] Sanitizacao de erros (mensagens genericas para cliente, detalhes no log)
- [x] Security headers (X-Frame-Options, CSP, HSTS, etc)
- [x] Cleanup de recursos (browser/page/listeners em finally blocks)
- [x] Batch inserts para evitar N+1 queries

### Infraestrutura e Monitoramento

- [x] Health check endpoint (/api/health)
- [x] Verificacao de conexao com Supabase
- [x] Status healthy/degraded/unhealthy
- [x] Error Boundary global para captura de erros React
- [x] Logging de erros no console (componentDidCatch)

### Conformidade eMAG 3.1

- [x] Checklist eMAG 3.1 completo (46 recomendacoes: 45 oficiais + 6.8 CAPTCHA customizada)
- [x] Status por recomendacao: Conforme / Nao Conforme / Atencao / Nao Testado / N/A
- [x] Mapeamento eMAG <-> WCAG completo (emag-map.ts)
- [x] Avaliacao automatica baseada em violacoes detectadas (emag-evaluator.ts)
- [x] UI com secoes colapsaveis (Radix Collapsible) e tooltips explicativos
- [x] Filtro por status de conformidade (dropdown com 6 opcoes)
- [x] Barra de progresso por secao com cores dinamicas (verde/amarelo/vermelho)
- [x] Links diretos para violacoes relacionadas (filtra por regra)
- [x] Export via impressao (window.print) com layout otimizado para PDF
- [x] Resumo executivo com gauge de conformidade geral
- [x] 21 regras customizadas brasileiras mapeadas para eMAG
- [x] Integracao com menu Exportar (condicional a audit.include_emag)
- [x] Botao "Voltar" para navegacao rapida
- [x] Card resumo na pagina de resultados da auditoria

### Internacionalizacao (i18n)

- [x] Suporte a 3 idiomas: pt-BR (padrao), en (ingles), es (espanhol)
- [x] next-intl para traducoes com App Router
- [x] Rotas prefixadas por locale (`/pt-BR/projects`, `/en/projects`, `/es/projects`)
- [x] Arquivos de mensagens JSON organizados por namespace
- [x] Language switcher no header (entre busca e notificacoes)
- [x] Troca de idioma preserva a rota atual
- [x] Server Components com `getTranslations()`
- [x] Client Components com `useTranslations()`
- [x] Link e useRouter tipados via `@/i18n/navigation`

**Namespaces de traducao (40 namespaces):**

| Namespace | Descricao |
|-----------|-----------|
| `Common` | Textos comuns (salvar, cancelar, etc) |
| `Auth` | Login e autenticacao |
| `Navigation` | Menu e navegacao principal |
| `Dashboard` | Pagina inicial |
| `Project` | Lista e CRUD de projetos |
| `ProjectInfo` | Informacoes do projeto |
| `ProjectSettings` | Configuracoes do projeto |
| `ProjectSwitcher` | Seletor de projetos |
| `Audit` | Configuracao e execucao de auditorias |
| `AuditConfig` | Configuracao de auditoria |
| `AuditComponents` | Componentes de auditoria |
| `AuditStatus` | Status de auditoria |
| `AuditFailed` | Mensagens de erro de auditoria |
| `StartAudit` | Modal de iniciar auditoria |
| `Violations` | Lista de violacoes e filtros |
| `ViolationsFilter` | Filtros avancados de violacoes |
| `ViolationStatus` | Status de violacoes |
| `EmagReport` | Relatorio de conformidade eMAG |
| `ExportButton` | Botao de exportacao |
| `Reports` | Relatorios |
| `SettingsForm` | Formularios de configuracao |
| `AuthConfig` | Configuracao de autenticacao de sites |
| `Authentication` | Autenticacao de sites |
| `SubdomainPolicy` | Politica de subdominios |
| `SubdomainPolicyConfig` | Configuracao de subdominios |
| `Discovery` | Descoberta de paginas |
| `DangerZone` | Zona de perigo (exclusao) |
| `ScoreModal` | Modal de calculo do score |
| `BrokenPages` | Paginas quebradas |
| `BrokenPagesCard` | Card de paginas quebradas |
| `VerifyButton` | Botao de verificacao |
| `SuggestButton` | Botao de sugestao IA |
| `Suggestions` | Sugestoes de correcao |
| `Verification` | Verificacao de correcoes |
| `Health` | Saude da acessibilidade |
| `Severity` | Severidade de violacoes |
| `Standards` | Padroes (WCAG, eMAG, ABNT) |
| `Plan` | Planos e limites |
| `UserMenu` | Menu do usuario |
| `Errors` | Mensagens de erro |
| `Metadata` | Metadados da aplicacao |

### Dashboard de Saude da Acessibilidade

Dashboard educativo redesenhado para ajudar usuarios sem cultura de acessibilidade a entender o estado atual e o que priorizar.

- [x] Score de saude (0-100%) ponderado por severidade
- [x] Gauge visual com tooltip explicando a formula de calculo
- [x] Mensagem de orientacao contextual (o que corrigir primeiro e por que)
- [x] Grid de severidade mostrando ocorrencias → tipos unicos
- [x] Card WCAG com conformidade % e breakdown por principio POUR
- [x] Card eMAG com conformidade % e link para relatorio completo
- [x] Detalhes tecnicos em secao colapsavel
- [x] Tooltips educativos em todos os numeros

**Formula de Saude:**

```typescript
// Pesos por severidade (critico tem mais impacto negativo)
const weights = { critical: 10, serious: 5, moderate: 2, minor: 1 }

// Score de 0 a 100 (menos penalidade = mais saudavel)
const maxPenalty = total * weights.critical
const penalty = critical * 10 + serious * 5 + moderate * 2 + minor * 1
const health = 100 - (penalty / maxPenalty) * 100
```

**Interpretacao do Score:**

| Score     | Label     | Cor      |
| --------- | --------- | -------- |
| 90-100%   | Excelente | Verde    |
| 70-89%    | Bom       | Amarelo  |
| 50-69%    | Regular   | Laranja  |
| 0-49%     | Critico   | Vermelho |

**Funcoes em `health.ts`:**

- `calculateHealthScore(audit)` - Calcula score ponderado
- `getHealthLabel(score)` - Retorna label (Critico/Regular/Bom/Excelente)
- `getHealthColor(score)` - Retorna classe CSS de cor
- `getGuidanceMessage(audit)` - Retorna mensagem contextual de orientacao
- `calculateDashboardSummary(audit, violations)` - Resumo com tipos unicos por severidade
- `calculateWcagConformance(violations, wcagLevels)` - Conformidade WCAG com breakdown POUR
- `calculateEmagConformance(violations)` - Conformidade eMAG
- `calculateWcagPrincipleBreakdown(violations)` - Breakdown por principio WCAG (POUR)

---

## Diferenciais Competitivos (Pontos Fortes)

O que temos que **nenhum concorrente internacional** (Siteimprove, Deque, Level Access) oferece:

| Feature | Status | Concorrentes |
|---------|--------|--------------|
| **eMAG 3.1 completo** | ✅ 46 recomendacoes mapeadas | Nenhum suporta |
| **Regras brasileiras** | ✅ 21 customizadas + 6 COGA | Nao existem |
| **Deteccao VLibras/Hand Talk** | ✅ Implementado | Nao existe |
| **Legibilidade PT-BR** | ✅ Flesch-Kincaid adaptado | So ingles |
| **ABNT NBR 17060** | ✅ Mapeamento iniciado | Nenhum suporta |
| **Barra acessibilidade gov.br** | ✅ Regra especifica | Nao existe |

---

## Roadmap Priorizado

### FASE 1: MVP Competitivo (Critico para Lancamento)

**Objetivo**: Transformar ferramenta de "teste pontual" em "plataforma de conformidade continua"

#### 1.1 Monitoramento Continuo (BLOQUEADOR)

Concorrentes (Siteimprove, Deque) oferecem varredura automatica diaria/semanal.

- [ ] **Auditorias agendadas (cron)** - Trigger.dev scheduled tasks
  - Frequencia configuravel: diaria, semanal, mensal
  - Horario customizavel por projeto
  - Pausar/retomar agendamento
- [ ] **Dashboard de tendencias**
  - Grafico de evolucao do score ao longo do tempo
  - Comparacao entre auditorias (delta de violacoes)
  - Alertas visuais quando score cai
- [ ] **Notificacoes por email**
  - Resumo apos cada auditoria automatica
  - Alerta imediato para novas violacoes criticas
  - Digest semanal de progresso
  - Configuracoes de preferencia por usuario

#### 1.2 Integracao CI/CD (BLOQUEADOR)

Empresas nao adotam sem automacao no pipeline de desenvolvimento.

- [ ] **API publica REST**
  - POST /api/v1/audits - Iniciar auditoria
  - GET /api/v1/audits/:id - Status e resultados
  - GET /api/v1/projects/:id/latest - Ultima auditoria
  - Autenticacao via API Key
  - Rate limiting por plano
  - Documentacao OpenAPI/Swagger
- [ ] **GitHub Action oficial**
  - Auditar em PRs automaticamente
  - Comentario no PR com resumo
  - Status check (pass/fail)
  - Badge de conformidade
- [ ] **Webhook para notificar resultados**
  - Payload JSON com resumo da auditoria
  - Configuravel por projeto
  - Retry automatico em falhas
- [ ] **Blocking rules**
  - Falhar build se X violacoes criticas
  - Configuravel por severidade
  - Threshold customizavel

#### 1.3 Extensao de Navegador (BLOQUEADOR)

Desenvolvedores precisam testar ad-hoc durante desenvolvimento.

- [ ] **Extensao Chrome/Firefox**
  - Auditar pagina atual com 1 clique
  - Highlight de elementos com violacoes
  - Panel com lista de problemas
  - Link para documentacao de cada regra
  - Sincronizar com conta da plataforma
  - Modo offline (regras locais)

#### 1.4 VPATs/ACRs (BLOQUEADOR para B2B)

Documentos de conformidade sao requisito para contratos e licitacoes.

- [ ] **Gerador de VPAT (Voluntary Product Accessibility Template)**
  - Template padrao Section 508
  - Preenchimento automatico baseado em auditoria
  - Campos editaveis para avaliacao manual
  - Export PDF/Word
- [ ] **Gerador de ACR (Accessibility Conformance Report)**
  - Formato WCAG 2.1/2.2
  - Declaracao de conformidade
  - Sumario executivo
  - Detalhes tecnicos

---

### FASE 2: Escala Empresarial

**Objetivo**: Permitir uso por times e organizacoes

#### 2.1 Multi-tenancy e Colaboracao (IMPORTANTE)

Necessario para vender para empresas com multiplos usuarios.

- [ ] **Organizacoes/Times**
  - Criar organizacao
  - Convidar membros por email
  - Roles: Owner, Admin, Member, Viewer
  - Projetos compartilhados dentro da org
- [ ] **Atribuicao de violacoes**
  - Assignee por violacao
  - Comentarios e discussao
  - Historico de mudancas
  - Mencoes (@usuario)
- [ ] **Workflow de correcao**
  - Status: Open → In Progress → Fixed → Verified
  - Filtros por assignee/status
  - Kanban view (opcional)

#### 2.2 Historico e Comparacao (IMPORTANTE)

Necessario para demonstrar progresso para stakeholders.

- [ ] **Dashboard de evolucao**
  - Grafico de linha: score ao longo do tempo
  - Grafico de barras: violacoes por severidade por auditoria
  - Filtro por periodo
- [ ] **Comparar auditorias**
  - Selecionar 2 auditorias
  - Delta de violacoes (novas, corrigidas, persistentes)
  - Diff visual
- [ ] **Graficos de tendencia**
  - Por tipo de violacao
  - Por pagina
  - Por regra

#### 2.3 Branding e White-label (IMPORTANTE)

Empresas querem relatorios com sua marca.

- [ ] **Branding customizavel em relatorios**
  - Upload de logo
  - Cores primaria/secundaria
  - Texto de rodape customizado
  - Nome da empresa no cabecalho
- [ ] **Dominio customizado** (futuro)
  - CNAME para subdominio do cliente
  - SSL automatico

---

### FASE 3: Conformidade Completa

**Objetivo**: Cobrir gaps que automacao nao alcanca

#### 3.1 Testes Guiados Semi-automatizados (IMPORTANTE)

~43% dos criterios WCAG nao sao automatizaveis.

- [ ] **Checklist de testes manuais**
  - Por criterio WCAG
  - Instrucoes passo-a-passo
  - Screenshots de referencia
  - Status: Pass/Fail/N/A
- [ ] **Intelligent Guided Tests** (inspirado em Deque)
  - Fluxo guiado por tipo de teste
  - Perguntas simples (sim/nao)
  - Resultado automatico baseado em respostas
- [ ] **Gravacao de evidencias**
  - Captura de tela durante teste
  - Anotacoes visuais
  - Anexar ao resultado

#### 3.2 Treinamento Contextual (DIFERENCIAL)

Nosso publico nao tem cultura de acessibilidade.

- [ ] **Tutoriais in-app**
  - Tooltip educativo em cada tipo de violacao
  - Link para artigo detalhado
  - Exemplos de codigo correto
- [ ] **Learning paths**
  - Trilha para desenvolvedores
  - Trilha para designers
  - Trilha para gestores
  - Certificado de conclusao (gamificacao)
- [ ] **Base de conhecimento**
  - Artigos sobre eMAG
  - Guias de correcao por tipo de problema
  - FAQ

#### 3.3 Conformidade ABNT NBR 17060 (DIFERENCIAL BR)

Norma brasileira para apps mobile.

- [ ] **Expandir mapeamento para cobertura completa**
- [ ] **Relatorio especifico para apps mobile**
- [ ] **Checklist por secao da norma**

---

### FASE 4: Diferenciais Avancados

**Objetivo**: Funcionalidades que nenhum concorrente tem

#### 4.1 Assistente IA (DIFERENCIAL)

Inspirado em Axe Assistant e Access Accy.

- [ ] **Chatbot de acessibilidade**
  - Perguntas sobre violacoes especificas
  - Sugestoes de correcao contextualizadas
  - Citacoes para WCAG/eMAG
- [ ] **Correcao automatica de codigo**
  - Sugestao de HTML corrigido
  - Aplicar correcao com 1 clique (IDE integration)
  - Historico de sugestoes

#### 4.2 Simuladores de Deficiencia (DIFERENCIAL)

Nenhuma ferramenta faz isso bem.

- [ ] **Simulador de daltonismo**
  - Protanopia, deuteranopia, tritanopia
  - Aplicar filtro na pagina em tempo real
  - Screenshot com filtro no relatorio
- [ ] **Simulador de baixa visao**
  - Blur ajustavel
  - Verificar legibilidade
- [ ] **Verificacao de contraste em dark mode**
  - Testar ambos os modos
  - Relatorio comparativo

#### 4.3 Testes com Tecnologias Assistivas (FUTURO)

Validacao real com leitores de tela.

- [ ] **Integracao com NVDA** (via API)
- [ ] **Gravacao de navegacao por teclado**
- [ ] **Teste de VoiceOver** (via BrowserStack/Sauce Labs)

#### 4.4 Verificacao de Libras Funcional (DIFERENCIAL BR)

Verificar se VLibras/Hand Talk realmente funciona.

- [ ] **Verificacoes avancadas:**
  - Script carregou sem erro 404/500
  - Widget esta visivel (not display:none)
  - Botao acessivel por teclado
  - Avatar aparece ao ativar (screenshot comparison)

---

### FASE 5: Outras Melhorias

#### 5.1 Autenticacao de Sites (Expansao)

Seguindo modelo Postman:

- [ ] Basic Auth (username/password)
- [ ] API Key (header ou query param)
- [ ] JWT Bearer (com secret e payload)
- [ ] OAuth 2.0
- [ ] Digest Auth
- [ ] Captura de cookies via browser (para 2FA, CAPTCHA)
- [ ] Gravacao de fluxo de login

#### 5.2 Acessibilidade do Proprio Sistema

- [ ] Skip links na home (ir direto para auditorias)
- [ ] Modo alto contraste
- [ ] Tamanho de fonte ajustavel
- [ ] Suporte completo a navegacao por teclado
- [ ] Testar com NVDA/VoiceOver

#### 5.3 Testes E2E Pendentes

Modulos que requerem Playwright real:

- [ ] `syllables-pt-br.ts` - Refatorar regex ou criar testes E2E
- [ ] `custom-rules.ts` - Testes E2E com Playwright
- [ ] `coga-rules.ts` - Testes E2E com Playwright
- [ ] `auditor.ts` e `crawler.ts` - Testes de integracao

---

## Analise de Riscos

| Risco | Descricao | Mitigacao |
|-------|-----------|-----------|
| **Dependencia axe-core** | Se Deque mudar licenca/termos, somos afetados | Regras customizadas progressivamente; avaliar fork se necessario |
| **Trigger.dev limits** | 50k runs/mes gratis pode nao escalar | Planejar custos de infraestrutura; avaliar self-host |
| **Single-user** | Sem multi-tenancy, dificil vender B2B | Priorizar na Fase 2 |
| **Falta de testes E2E** | Regras customizadas sem cobertura automatizada | Criar suite E2E com Playwright |
| **Concorrentes internacionais** | Podem adicionar suporte a eMAG | Manter lideranca em contexto brasileiro |

---

## Mapeamento de Padroes

### eMAG 3.1 - Cobertura Atual

O eMAG 3.1 possui 45 recomendacoes em 6 secoes. Nossa cobertura atual com regras customizadas + axe-core:

| Secao            | Total  | Automatizavel | Coberto | Pendente |
| ---------------- | ------ | ------------- | ------- | -------- |
| 1. Marcacao      | 9      | 7             | 7       | 0        |
| 2. Comportamento | 7      | 5             | 4       | 1        |
| 3. Conteudo      | 12     | 8             | 6       | 2        |
| 4. Apresentacao  | 5      | 4             | 3       | 1        |
| 5. Multimidia    | 5      | 3             | 2       | 1        |
| 6. Formulario    | 8      | 5             | 3\*     | 2        |
| **Total**        | **46** | **32**        | **25**  | **7**    |

\*axe-core cobre parcialmente formularios

**Regras customizadas implementadas para eMAG:**
- `emag-skip-links` - eMAG 1.5 (links de saltar conteudo)
- `emag-atalhos-teclado` - eMAG 1.5 (atalhos Alt+1/2/3)
- `barra-acessibilidade-gov-br` - eMAG 1.5 (barra de acessibilidade em sites gov)
- `emag-tabela-layout` - eMAG 1.6 (tabelas de layout)
- `emag-links-adjacentes` - eMAG 1.7 (separacao de links)
- `refresh-automatico` - eMAG 2.3, 2.4 (refresh/redirect automatico)
- `autoplay-video-audio` - eMAG 2.7 (controle de midia com autoplay)
- `carrossel-sem-controles` - eMAG 2.7 (controle de carrosseis)
- `emag-breadcrumb` - eMAG 3.4 (breadcrumb)
- `emag-pdf-acessivel` - eMAG 3.8 (alternativas para PDF)

### WCAG 2.2 - Gaps que axe-core nao cobre bem

| Criterio | Descricao                                           | Status      |
| -------- | --------------------------------------------------- | ----------- |
| 1.4.8    | Apresentacao visual (texto justificado, maiusculas) | ✅ Coberto  |
| 2.4.4    | Proposito do link                                   | ✅ Coberto  |
| 3.1.4    | Abreviacoes                                         | ❌ Pendente |
| 3.1.5    | Nivel de leitura                                    | ❌ Pendente |
| 3.2.5    | Mudanca sob demanda (nova aba)                      | ✅ Coberto  |

### Regras Pendentes - Prioridade Baixa

| Regra                     | Descricao                                      | Padrao           |
| ------------------------- | ---------------------------------------------- | ---------------- |
| `touch-target-pequeno`    | Alvos de toque < 44x44px em mobile             | WCAG 2.5.5 (AAA) |
| `caracteres-decorativos`  | Uso de simbolos para decoracao (★★★, →→→, etc) | eMAG 4.4         |
| `emoji-excessivo`         | Muitos emojis que poluem leitura de tela       | Best practice    |
| `contraste-dark-mode`     | Contraste inadequado em modo escuro            | Best practice    |
| `iframe-sem-titulo`       | iframe sem title descritivo                    | WCAG 4.1.2       |
| `placeholder-como-label`  | Input com placeholder mas sem label            | WCAG 1.3.1       |

### Referencias

- eMAG 3.1: https://emag.governoeletronico.gov.br/
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- ABNT NBR 17060: Acessibilidade em aplicativos moveis
- W3C COGA: https://www.w3.org/WAI/cognitive/
- axe-core rules: https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md

---

## Boas Praticas

### Evitar waits com tempo fixo

NAO usar `waitForTimeout(3000)` ou similares. Problemas:

- Pagina rapida: desperdica tempo
- Pagina lenta: conteudo nao carregou ainda

**Solucao:** Usar `waitForPageStable()` com request tracker:

```typescript
// 1. Criar tracker ANTES do goto() para capturar todas requisicoes
const requestTracker = createRequestTracker(page);

// 2. Navegar
await page.goto(url, { waitUntil: "domcontentloaded" });

// 3. Esperar estabilidade (DOM + network + titulo sem "loading")
await waitForPageStable(page, requestTracker, { maxWait: 20000 });

// 4. Limpar listeners
requestTracker.cleanup();
```

### SPAs (React, Vue, Angular)

Para Single Page Applications:

1. `domcontentloaded` dispara antes do framework renderizar
2. Sempre esperar DOM estabilizar antes de extrair links/conteudo
3. Usar cookies para auth (nao headers) - maioria usa cookie-based auth
4. Verificar se titulo indica estado de "loading" antes de considerar pronto

### Politica de Subdominios

Configuravel por projeto em `subdomain_policy`:

- `main_only` - Apenas dominio principal (www.site.com, site.com)
- `all_subdomains` - Todos os subdominios (blog.site.com, docs.site.com, etc)
- `specific` - Lista de subdominios permitidos em `allowed_subdomains`

### Seguranca em APIs

**Validacao de entrada com Zod:**

```typescript
import { CreateAuditSchema, validateInput } from "@/lib/validations";

const validation = validateInput(CreateAuditSchema, body);
if (!validation.success) {
  return NextResponse.json({ error: validation.error }, { status: 400 });
}
```

**Protecao CSRF:**

```typescript
import { requireCsrfValid } from "@/lib/csrf";

const csrf = await requireCsrfValid();
if (!csrf.valid) {
  return NextResponse.json({ error: csrf.error }, { status: 403 });
}
```

**Verificacao de ownership:**

```typescript
// SEMPRE verificar se o recurso pertence ao usuario
if (project.user_id !== user.id) {
  return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
}
```

**Sanitizacao de erros:**

```typescript
// NAO expor detalhes internos ao cliente
const errorMessage = error instanceof Error ? error.message : "Erro generico";
console.error("[Context] Error:", { error: errorMessage }); // Log interno
return NextResponse.json(
  { error: "Erro ao processar. Tente novamente." },
  { status: 500 }
);
```

**Cleanup de recursos Playwright:**

```typescript
let browser = null;
let page = null;
try {
  browser = await chromium.launch();
  page = await browser.newPage();
  // ... operacoes
} finally {
  if (page) await page.close().catch(console.error);
  if (browser) await browser.close().catch(console.error);
}
```

### Internacionalizacao (i18n)

**Server Components:**

```typescript
import { getTranslations } from 'next-intl/server'

export default async function Page() {
  const t = await getTranslations('Namespace')
  return <h1>{t('title')}</h1>
}
```

**Client Components:**

```typescript
'use client'
import { useTranslations } from 'next-intl'

export function Component() {
  const t = useTranslations('Namespace')
  return <button>{t('action')}</button>
}
```

**Navegacao com locale:**

```typescript
import { Link } from '@/i18n/navigation'
import { useRouter } from '@/i18n/navigation'

// Link preserva locale automaticamente
<Link href="/projects">Projects</Link>

// Router com locale
const router = useRouter()
router.push('/projects') // Preserva locale atual
router.replace(pathname, { locale: 'en' }) // Troca idioma
```

**Pluralizacao e interpolacao:**

```json
{
  "items": "{count, plural, =0 {Nenhum item} =1 {1 item} other {# itens}}",
  "greeting": "Ola, {name}!"
}
```

```typescript
t('items', { count: 5 }) // "5 itens"
t('greeting', { name: 'Maria' }) // "Ola, Maria!"
```

**Adicionar nova traducao:**
1. Definir namespace no componente: `useTranslations('NewNamespace')`
2. Adicionar chaves em `src/messages/pt-BR.json`
3. Adicionar traducoes em `src/messages/en.json` e `src/messages/es.json`

### Trigger.dev Machine Presets

Para tasks que consomem muita memoria (ex: Playwright), configurar machine preset:

```typescript
export const runAuditTask = task({
  id: 'run-audit',
  machine: { preset: 'medium-2x' }, // 2 vCPU, 4 GB RAM
  // ...
})
```

**Presets disponiveis:**

| Preset | vCPU | RAM | Uso recomendado |
|--------|------|-----|-----------------|
| `micro` | 0.25 | 0.25 GB | Tasks simples |
| `small-1x` | 0.5 | 0.5 GB | Padrao |
| `small-2x` | 1 | 1 GB | Tasks medias |
| `medium-1x` | 1 | 2 GB | Playwright basico |
| `medium-2x` | 2 | 4 GB | **Auditoria (atual)** |
| `large-1x` | 4 | 8 GB | Sites grandes (100+ paginas) |
| `large-2x` | 8 | 16 GB | Processamento pesado |

**OOM (Out of Memory)**: Se o task morrer com OOM, aumentar o preset.
O plano free tem $5/mes de credito, maquinas maiores consomem mais rapido.

### Cancelamento de Tasks Trigger.dev

Para cancelar um task em execucao:

```typescript
import { runs } from '@trigger.dev/sdk/v3'

// Salvar o run ID ao iniciar
const handle = await runAuditTask.trigger(payload)
await supabase.from('audits').update({ trigger_run_id: handle.id })

// Para cancelar depois
await runs.cancel(triggerRunId)
```

**Importante**: O task deve verificar se foi cancelado antes de atualizar status final:

```typescript
// No final do task
const { data } = await supabase.from('audits').select('status').eq('id', auditId).single()
if (data?.status === 'CANCELLED') {
  return { cancelled: true } // NAO sobrescrever para COMPLETED
}
```

### Security Headers (next.config.ts)

Headers configurados para todas as rotas:

- `X-Frame-Options: DENY` - Previne clickjacking
- `X-Content-Type-Options: nosniff` - Previne MIME sniffing
- `Strict-Transport-Security` - Forca HTTPS (HSTS)
- `Content-Security-Policy` - Restringe origens de scripts/styles/conexoes
- `Permissions-Policy` - Desabilita camera/mic/geo
- `Referrer-Policy: strict-origin-when-cross-origin`

<!-- TRIGGER.DEV basic START -->

# Trigger.dev Basic Tasks (v4)

**MUST use `@trigger.dev/sdk` (v4), NEVER `client.defineJob`**

## Basic Task

```ts
import { task } from "@trigger.dev/sdk";

export const processData = task({
  id: "process-data",
  retry: {
    maxAttempts: 10,
    factor: 1.8,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: false,
  },
  run: async (payload: { userId: string; data: any[] }) => {
    // Task logic - runs for long time, no timeouts
    console.log(
      `Processing ${payload.data.length} items for user ${payload.userId}`
    );
    return { processed: payload.data.length };
  },
});
```

## Schema Task (with validation)

```ts
import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

export const validatedTask = schemaTask({
  id: "validated-task",
  schema: z.object({
    name: z.string(),
    age: z.number(),
    email: z.string().email(),
  }),
  run: async (payload) => {
    // Payload is automatically validated and typed
    return { message: `Hello ${payload.name}, age ${payload.age}` };
  },
});
```

## Scheduled Task

```ts
import { schedules } from "@trigger.dev/sdk";

const dailyReport = schedules.task({
  id: "daily-report",
  cron: "0 9 * * *", // Daily at 9:00 AM UTC
  // or with timezone: cron: { pattern: "0 9 * * *", timezone: "America/New_York" },
  run: async (payload) => {
    console.log("Scheduled run at:", payload.timestamp);
    console.log("Last run was:", payload.lastTimestamp);
    console.log("Next 5 runs:", payload.upcoming);

    // Generate daily report logic
    return { reportGenerated: true, date: payload.timestamp };
  },
});
```

## Triggering Tasks

### From Backend Code

```ts
import { tasks } from "@trigger.dev/sdk";
import type { processData } from "./trigger/tasks";

// Single trigger
const handle = await tasks.trigger<typeof processData>("process-data", {
  userId: "123",
  data: [{ id: 1 }, { id: 2 }],
});

// Batch trigger
const batchHandle = await tasks.batchTrigger<typeof processData>(
  "process-data",
  [
    { payload: { userId: "123", data: [{ id: 1 }] } },
    { payload: { userId: "456", data: [{ id: 2 }] } },
  ]
);
```

### From Inside Tasks (with Result handling)

```ts
export const parentTask = task({
  id: "parent-task",
  run: async (payload) => {
    // Trigger and continue
    const handle = await childTask.trigger({ data: "value" });

    // Trigger and wait - returns Result object, NOT task output
    const result = await childTask.triggerAndWait({ data: "value" });
    if (result.ok) {
      console.log("Task output:", result.output); // Actual task return value
    } else {
      console.error("Task failed:", result.error);
    }

    // Quick unwrap (throws on error)
    const output = await childTask.triggerAndWait({ data: "value" }).unwrap();

    // Batch trigger and wait
    const results = await childTask.batchTriggerAndWait([
      { payload: { data: "item1" } },
      { payload: { data: "item2" } },
    ]);

    for (const run of results) {
      if (run.ok) {
        console.log("Success:", run.output);
      } else {
        console.log("Failed:", run.error);
      }
    }
  },
});

export const childTask = task({
  id: "child-task",
  run: async (payload: { data: string }) => {
    return { processed: payload.data };
  },
});
```

> Never wrap triggerAndWait or batchTriggerAndWait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Waits

```ts
import { task, wait } from "@trigger.dev/sdk";

export const taskWithWaits = task({
  id: "task-with-waits",
  run: async (payload) => {
    console.log("Starting task");

    // Wait for specific duration
    await wait.for({ seconds: 30 });
    await wait.for({ minutes: 5 });
    await wait.for({ hours: 1 });
    await wait.for({ days: 1 });

    // Wait until specific date
    await wait.until({ date: new Date("2024-12-25") });

    // Wait for token (from external system)
    await wait.forToken({
      token: "user-approval-token",
      timeoutInSeconds: 3600, // 1 hour timeout
    });

    console.log("All waits completed");
    return { status: "completed" };
  },
});
```

> Never wrap wait calls in a Promise.all or Promise.allSettled as this is not supported in Trigger.dev tasks.

## Key Points

- **Result vs Output**: `triggerAndWait()` returns a `Result` object with `ok`, `output`, `error` properties - NOT the direct task output
- **Type safety**: Use `import type` for task references when triggering from backend
- **Waits > 5 seconds**: Automatically checkpointed, don't count toward compute usage

## NEVER Use (v2 deprecated)

```ts
// BREAKS APPLICATION
client.defineJob({
  id: "job-id",
  run: async (payload, io) => {
    /* ... */
  },
});
```

Use v4 SDK (`@trigger.dev/sdk`), check `result.ok` before accessing `result.output`

<!-- TRIGGER.DEV basic END -->

<!-- TRIGGER.DEV advanced-tasks START -->

# Trigger.dev Advanced Tasks (v4)

**Advanced patterns and features for writing tasks**

## Tags & Organization

```ts
import { task, tags } from "@trigger.dev/sdk";

export const processUser = task({
  id: "process-user",
  run: async (payload: { userId: string; orgId: string }, { ctx }) => {
    // Add tags during execution
    await tags.add(`user_${payload.userId}`);
    await tags.add(`org_${payload.orgId}`);

    return { processed: true };
  },
});

// Trigger with tags
await processUser.trigger(
  { userId: "123", orgId: "abc" },
  { tags: ["priority", "user_123", "org_abc"] } // Max 10 tags per run
);

// Subscribe to tagged runs
for await (const run of runs.subscribeToRunsWithTag("user_123")) {
  console.log(`User task ${run.id}: ${run.status}`);
}
```

**Tag Best Practices:**

- Use prefixes: `user_123`, `org_abc`, `video:456`
- Max 10 tags per run, 1-64 characters each
- Tags don't propagate to child tasks automatically

## Concurrency & Queues

```ts
import { task, queue } from "@trigger.dev/sdk";

// Shared queue for related tasks
const emailQueue = queue({
  name: "email-processing",
  concurrencyLimit: 5, // Max 5 emails processing simultaneously
});

// Task-level concurrency
export const oneAtATime = task({
  id: "sequential-task",
  queue: { concurrencyLimit: 1 }, // Process one at a time
  run: async (payload) => {
    // Critical section - only one instance runs
  },
});

// Per-user concurrency
export const processUserData = task({
  id: "process-user-data",
  run: async (payload: { userId: string }) => {
    // Override queue with user-specific concurrency
    await childTask.trigger(payload, {
      queue: {
        name: `user-${payload.userId}`,
        concurrencyLimit: 2,
      },
    });
  },
});

export const emailTask = task({
  id: "send-email",
  queue: emailQueue, // Use shared queue
  run: async (payload: { to: string }) => {
    // Send email logic
  },
});
```

## Error Handling & Retries

```ts
import { task, retry, AbortTaskRunError } from "@trigger.dev/sdk";

export const resilientTask = task({
  id: "resilient-task",
  retry: {
    maxAttempts: 10,
    factor: 1.8, // Exponential backoff multiplier
    minTimeoutInMs: 500,
    maxTimeoutInMs: 30_000,
    randomize: false,
  },
  catchError: async ({ error, ctx }) => {
    // Custom error handling
    if (error.code === "FATAL_ERROR") {
      throw new AbortTaskRunError("Cannot retry this error");
    }

    // Log error details
    console.error(`Task ${ctx.task.id} failed:`, error);

    // Allow retry by returning nothing
    return { retryAt: new Date(Date.now() + 60000) }; // Retry in 1 minute
  },
  run: async (payload) => {
    // Retry specific operations
    const result = await retry.onThrow(
      async () => {
        return await unstableApiCall(payload);
      },
      { maxAttempts: 3 }
    );

    // Conditional HTTP retries
    const response = await retry.fetch("https://api.example.com", {
      retry: {
        maxAttempts: 5,
        condition: (response, error) => {
          return response?.status === 429 || response?.status >= 500;
        },
      },
    });

    return result;
  },
});
```

## Machines & Performance

```ts
export const heavyTask = task({
  id: "heavy-computation",
  machine: { preset: "large-2x" }, // 8 vCPU, 16 GB RAM
  maxDuration: 1800, // 30 minutes timeout
  run: async (payload, { ctx }) => {
    // Resource-intensive computation
    if (ctx.machine.preset === "large-2x") {
      // Use all available cores
      return await parallelProcessing(payload);
    }

    return await standardProcessing(payload);
  },
});

// Override machine when triggering
await heavyTask.trigger(payload, {
  machine: { preset: "medium-1x" }, // Override for this run
});
```

**Machine Presets:**

- `micro`: 0.25 vCPU, 0.25 GB RAM
- `small-1x`: 0.5 vCPU, 0.5 GB RAM (default)
- `small-2x`: 1 vCPU, 1 GB RAM
- `medium-1x`: 1 vCPU, 2 GB RAM
- `medium-2x`: 2 vCPU, 4 GB RAM
- `large-1x`: 4 vCPU, 8 GB RAM
- `large-2x`: 8 vCPU, 16 GB RAM

## Idempotency

```ts
import { task, idempotencyKeys } from "@trigger.dev/sdk";

export const paymentTask = task({
  id: "process-payment",
  retry: {
    maxAttempts: 3,
  },
  run: async (payload: { orderId: string; amount: number }) => {
    // Automatically scoped to this task run, so if the task is retried, the idempotency key will be the same
    const idempotencyKey = await idempotencyKeys.create(
      `payment-${payload.orderId}`
    );

    // Ensure payment is processed only once
    await chargeCustomer.trigger(payload, {
      idempotencyKey,
      idempotencyKeyTTL: "24h", // Key expires in 24 hours
    });
  },
});

// Payload-based idempotency
import { createHash } from "node:crypto";

function createPayloadHash(payload: any): string {
  const hash = createHash("sha256");
  hash.update(JSON.stringify(payload));
  return hash.digest("hex");
}

export const deduplicatedTask = task({
  id: "deduplicated-task",
  run: async (payload) => {
    const payloadHash = createPayloadHash(payload);
    const idempotencyKey = await idempotencyKeys.create(payloadHash);

    await processData.trigger(payload, { idempotencyKey });
  },
});
```

## Metadata & Progress Tracking

```ts
import { task, metadata } from "@trigger.dev/sdk";

export const batchProcessor = task({
  id: "batch-processor",
  run: async (payload: { items: any[] }, { ctx }) => {
    const totalItems = payload.items.length;

    // Initialize progress metadata
    metadata
      .set("progress", 0)
      .set("totalItems", totalItems)
      .set("processedItems", 0)
      .set("status", "starting");

    const results = [];

    for (let i = 0; i < payload.items.length; i++) {
      const item = payload.items[i];

      // Process item
      const result = await processItem(item);
      results.push(result);

      // Update progress
      const progress = ((i + 1) / totalItems) * 100;
      metadata
        .set("progress", progress)
        .increment("processedItems", 1)
        .append("logs", `Processed item ${i + 1}/${totalItems}`)
        .set("currentItem", item.id);
    }

    // Final status
    metadata.set("status", "completed");

    return { results, totalProcessed: results.length };
  },
});

// Update parent metadata from child task
export const childTask = task({
  id: "child-task",
  run: async (payload, { ctx }) => {
    // Update parent task metadata
    metadata.parent.set("childStatus", "processing");
    metadata.root.increment("childrenCompleted", 1);

    return { processed: true };
  },
});
```

## Advanced Triggering

### Frontend Triggering (React)

```tsx
"use client";
import { useTaskTrigger } from "@trigger.dev/react-hooks";
import type { myTask } from "../trigger/tasks";

function TriggerButton({ accessToken }: { accessToken: string }) {
  const { submit, handle, isLoading } = useTaskTrigger<typeof myTask>(
    "my-task",
    { accessToken }
  );

  return (
    <button
      onClick={() => submit({ data: "from frontend" })}
      disabled={isLoading}
    >
      Trigger Task
    </button>
  );
}
```

### Large Payloads

```ts
// For payloads > 512KB (max 10MB)
export const largeDataTask = task({
  id: "large-data-task",
  run: async (payload: { dataUrl: string }) => {
    // Trigger.dev automatically handles large payloads
    // For > 10MB, use external storage
    const response = await fetch(payload.dataUrl);
    const largeData = await response.json();

    return { processed: largeData.length };
  },
});

// Best practice: Use presigned URLs for very large files
await largeDataTask.trigger({
  dataUrl: "https://s3.amazonaws.com/bucket/large-file.json?presigned=true",
});
```

### Advanced Options

```ts
await myTask.trigger(payload, {
  delay: "2h30m", // Delay execution
  ttl: "24h", // Expire if not started within 24 hours
  priority: 100, // Higher priority (time offset in seconds)
  tags: ["urgent", "user_123"],
  metadata: { source: "api", version: "v2" },
  queue: {
    name: "priority-queue",
    concurrencyLimit: 10,
  },
  idempotencyKey: "unique-operation-id",
  idempotencyKeyTTL: "1h",
  machine: { preset: "large-1x" },
  maxAttempts: 5,
});
```

## Hidden Tasks

```ts
// Hidden task - not exported, only used internally
const internalProcessor = task({
  id: "internal-processor",
  run: async (payload: { data: string }) => {
    return { processed: payload.data.toUpperCase() };
  },
});

// Public task that uses hidden task
export const publicWorkflow = task({
  id: "public-workflow",
  run: async (payload: { input: string }) => {
    // Use hidden task internally
    const result = await internalProcessor.triggerAndWait({
      data: payload.input,
    });

    if (result.ok) {
      return { output: result.output.processed };
    }

    throw new Error("Internal processing failed");
  },
});
```

## Logging & Tracing

```ts
import { task, logger } from "@trigger.dev/sdk";

export const tracedTask = task({
  id: "traced-task",
  run: async (payload, { ctx }) => {
    logger.info("Task started", { userId: payload.userId });

    // Custom trace with attributes
    const user = await logger.trace(
      "fetch-user",
      async (span) => {
        span.setAttribute("user.id", payload.userId);
        span.setAttribute("operation", "database-fetch");

        const userData = await database.findUser(payload.userId);
        span.setAttribute("user.found", !!userData);

        return userData;
      },
      { userId: payload.userId }
    );

    logger.debug("User fetched", { user: user.id });

    try {
      const result = await processUser(user);
      logger.info("Processing completed", { result });
      return result;
    } catch (error) {
      logger.error("Processing failed", {
        error: error.message,
        userId: payload.userId,
      });
      throw error;
    }
  },
});
```

## Usage Monitoring

```ts
import { task, usage } from "@trigger.dev/sdk";

export const monitoredTask = task({
  id: "monitored-task",
  run: async (payload) => {
    // Get current run cost
    const currentUsage = await usage.getCurrent();
    logger.info("Current cost", {
      costInCents: currentUsage.costInCents,
      durationMs: currentUsage.durationMs,
    });

    // Measure specific operation
    const { result, compute } = await usage.measure(async () => {
      return await expensiveOperation(payload);
    });

    logger.info("Operation cost", {
      costInCents: compute.costInCents,
      durationMs: compute.durationMs,
    });

    return result;
  },
});
```

## Run Management

```ts
// Cancel runs
await runs.cancel("run_123");

// Replay runs with same payload
await runs.replay("run_123");

// Retrieve run with cost details
const run = await runs.retrieve("run_123");
console.log(`Cost: ${run.costInCents} cents, Duration: ${run.durationMs}ms`);
```

## Best Practices

- **Concurrency**: Use queues to prevent overwhelming external services
- **Retries**: Configure exponential backoff for transient failures
- **Idempotency**: Always use for payment/critical operations
- **Metadata**: Track progress for long-running tasks
- **Machines**: Match machine size to computational requirements
- **Tags**: Use consistent naming patterns for filtering
- **Large Payloads**: Use external storage for files > 10MB
- **Error Handling**: Distinguish between retryable and fatal errors

Design tasks to be stateless, idempotent, and resilient to failures. Use metadata for state tracking and queues for resource management.

<!-- TRIGGER.DEV advanced-tasks END -->
