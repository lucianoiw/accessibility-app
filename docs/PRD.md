# PRD - Accessibility Audit Platform

## Product Requirements Document

**Versão:** 1.0
**Data:** 2024-12-10
**Autor:** Luciano
**Status:** Draft

---

## 1. Visão Geral

### 1.1 Problema

Desenvolvedores e empresas precisam garantir que seus sites sejam acessíveis, mas:
- Ferramentas atuais analisam página por página manualmente
- Não há agregação inteligente de problemas repetidos
- Difícil priorizar o que corrigir primeiro
- Falta integração com fluxos de desenvolvimento (IDEs, CI/CD)
- Padrões brasileiros (ABNT NBR 17060) não são bem suportados

### 1.2 Solução

Uma plataforma SaaS que:
1. Crawlea automaticamente todo o site a partir de uma URL
2. Executa auditoria de acessibilidade em cada página (axe-core + regras customizadas)
3. Agrega resultados inteligentemente (mesmo problema em múltiplas páginas = 1 tarefa)
4. Gera relatório priorizado com sugestões de correção via IA
5. Exporta contexto para IDEs (Claude Code, Cursor, Copilot)

### 1.3 Público-Alvo

- Desenvolvedores web
- Agências digitais
- Empresas com requisitos de compliance (governo, educação, saúde)
- Consultores de acessibilidade

---

## 2. Objetivos e Métricas

### 2.1 Objetivos

| Objetivo | Descrição |
|----------|-----------|
| **O1** | Permitir auditoria completa de um site com 1 clique |
| **O2** | Reduzir tempo de correção em 70% via agregação inteligente |
| **O3** | Suportar padrões WCAG 2.0/2.1/2.2 + ABNT NBR 17060 |
| **O4** | Gerar contexto exportável para assistentes de código IA |

### 2.2 Métricas de Sucesso (KPIs)

- Tempo médio de auditoria completa < 5 minutos para 100 páginas
- Taxa de falsos positivos < 5%
- NPS > 50
- Conversão free → paid > 5%

---

## 3. Stack Técnica

### 3.1 Core

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| Framework Full-stack | Next.js 15 | App Router, Server Actions, API Routes |
| Linguagem | TypeScript 5.x | Type safety |
| Monorepo | Turborepo + pnpm | Organização, builds incrementais |

### 3.2 Database & Cache

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| Database | Supabase (PostgreSQL) | Managed, Auth integrado, Realtime |
| Cache/Queue Backend | Redis (Upstash ou Supabase) | BullMQ, cache |
| ORM | Prisma | Type-safe, migrations |

### 3.3 Crawler & Audit

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| Browser Automation | Playwright | Renderiza JS, suporta SPAs |
| Accessibility Engine | @axe-core/playwright | Padrão da indústria, WCAG completo |
| Queue System | BullMQ | Redis-based, robusto, retry |

### 3.4 AI & Export

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| LLM | Claude API (Anthropic) | Melhor para código e instruções |
| PDF Export | @react-pdf/renderer | Relatórios profissionais |

### 3.5 Infra

| Componente | Tecnologia | Justificativa |
|------------|------------|---------------|
| Deploy Web | Vercel | Otimizado para Next.js |
| Deploy Workers | Railway ou Fly.io | Long-running processes |
| Storage | Supabase Storage | Screenshots, relatórios |

---

## 4. Arquitetura

### 4.1 Diagrama de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP (Vercel)                     │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Dashboard   │  │   Reports    │  │   Settings   │          │
│  │  /projects   │  │   /reports   │  │   /settings  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                     API ROUTES                            │  │
│  │  /api/projects    /api/audits    /api/reports            │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    Supabase     │  │     Redis       │  │    Storage      │
│   PostgreSQL    │  │    (Upstash)    │  │   (Supabase)    │
│                 │  │                 │  │                 │
│  - projects     │  │  - BullMQ       │  │  - screenshots  │
│  - audits       │  │  - job queues   │  │  - pdf reports  │
│  - violations   │  │  - cache        │  │                 │
│  - users        │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   WORKER SERVICE (Railway/Fly.io)               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Crawler    │  │   Auditor    │  │  Aggregator  │          │
│  │   Worker     │  │   Worker     │  │   Worker     │          │
│  │              │  │              │  │              │          │
│  │ - sitemap    │  │ - Playwright │  │ - agrupa     │          │
│  │ - links      │  │ - axe-core   │  │ - IA fixes   │          │
│  │ - discovery  │  │ - custom     │  │ - relatório  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Estrutura de Pastas

```
accessibility-audit/
├── apps/
│   ├── web/                          # Next.js 15 App
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── register/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── page.tsx              # Dashboard home
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx          # Lista projetos
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx      # Criar projeto
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── page.tsx      # Detalhes projeto
│   │   │   │   │       └── audits/
│   │   │   │   │           └── [auditId]/
│   │   │   │   │               └── page.tsx  # Resultado auditoria
│   │   │   │   └── settings/
│   │   │   │       └── page.tsx
│   │   │   ├── api/
│   │   │   │   ├── projects/
│   │   │   │   │   ├── route.ts          # GET, POST
│   │   │   │   │   └── [id]/
│   │   │   │   │       └── route.ts      # GET, PUT, DELETE
│   │   │   │   ├── audits/
│   │   │   │   │   ├── route.ts          # POST (start audit)
│   │   │   │   │   └── [id]/
│   │   │   │   │       ├── route.ts      # GET status
│   │   │   │   │       └── export/
│   │   │   │   │           └── route.ts  # GET (export MD/PDF)
│   │   │   │   └── webhooks/
│   │   │   │       └── stripe/
│   │   │   │           └── route.ts
│   │   │   ├── layout.tsx
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── ui/                       # shadcn/ui components
│   │   │   ├── dashboard/
│   │   │   │   ├── sidebar.tsx
│   │   │   │   ├── header.tsx
│   │   │   │   └── stats-cards.tsx
│   │   │   ├── projects/
│   │   │   │   ├── project-card.tsx
│   │   │   │   ├── project-form.tsx
│   │   │   │   └── project-list.tsx
│   │   │   ├── audits/
│   │   │   │   ├── audit-progress.tsx
│   │   │   │   ├── audit-summary.tsx
│   │   │   │   ├── violation-card.tsx
│   │   │   │   ├── violation-table.tsx
│   │   │   │   └── export-button.tsx
│   │   │   └── charts/
│   │   │       ├── impact-chart.tsx
│   │   │       └── wcag-coverage.tsx
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts
│   │   │   │   ├── server.ts
│   │   │   │   └── middleware.ts
│   │   │   ├── queue/
│   │   │   │   └── client.ts             # BullMQ client
│   │   │   └── utils.ts
│   │   ├── hooks/
│   │   │   ├── use-audit-status.ts
│   │   │   └── use-realtime-violations.ts
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── worker/                           # BullMQ Workers
│       ├── src/
│       │   ├── config/
│       │   │   ├── redis.ts
│       │   │   └── playwright.ts
│       │   ├── queues/
│       │   │   ├── index.ts
│       │   │   ├── crawler.queue.ts
│       │   │   ├── auditor.queue.ts
│       │   │   └── aggregator.queue.ts
│       │   ├── workers/
│       │   │   ├── crawler.worker.ts
│       │   │   ├── auditor.worker.ts
│       │   │   └── aggregator.worker.ts
│       │   ├── services/
│       │   │   ├── sitemap.service.ts
│       │   │   ├── link-extractor.service.ts
│       │   │   ├── axe-runner.service.ts
│       │   │   ├── screenshot.service.ts
│       │   │   └── ai-suggestion.service.ts
│       │   └── index.ts                  # Entry point
│       ├── Dockerfile
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── database/                         # Prisma Schema & Client
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   ├── src/
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── axe-config/                       # Configuração axe-core
│   │   ├── src/
│   │   │   ├── custom-rules/
│   │   │   │   ├── index.ts
│   │   │   │   ├── link-texto-generico.ts
│   │   │   │   ├── link-nova-aba-sem-aviso.ts
│   │   │   │   ├── imagem-alt-nome-arquivo.ts
│   │   │   │   ├── texto-justificado.ts
│   │   │   │   ├── texto-maiusculo-css.ts
│   │   │   │   ├── br-excessivo-layout.ts
│   │   │   │   ├── atributo-title-redundante.ts
│   │   │   │   ├── rotulo-curto-ambiguo.ts
│   │   │   │   ├── conteudo-lorem-ipsum.ts
│   │   │   │   ├── fonte-muito-pequena.ts
│   │   │   │   └── brasil-libras-plugin.ts
│   │   │   ├── locales/
│   │   │   │   ├── pt-BR.json
│   │   │   │   └── en.json
│   │   │   ├── abnt-map.json
│   │   │   ├── axe-config.ts
│   │   │   └── index.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── shared/                           # Tipos e utils compartilhados
│       ├── src/
│       │   ├── types/
│       │   │   ├── audit.ts
│       │   │   ├── violation.ts
│       │   │   ├── project.ts
│       │   │   └── index.ts
│       │   ├── utils/
│       │   │   ├── fingerprint.ts        # Gera hash para agrupar violations
│       │   │   ├── wcag-parser.ts        # Extrai info WCAG das tags
│       │   │   └── index.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
│
├── .env.example
├── .gitignore
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── README.md
└── PRD.md
```

---

## 5. Database Schema

### 5.1 Prisma Schema

```prisma
// packages/database/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================
// AUTH (Supabase Auth - tabelas gerenciadas)
// ============================================

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String?
  avatarUrl     String?
  plan          Plan      @default(FREE)
  stripeCustomerId String?

  projects      Project[]

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

enum Plan {
  FREE
  PRO
  ENTERPRISE
}

// ============================================
// PROJECTS
// ============================================

model Project {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String
  baseUrl     String
  description String?

  // Configurações padrão para auditorias
  defaultMaxPages    Int      @default(100)
  defaultWcagLevels  String[] @default(["A", "AA"])
  defaultIncludeAbnt Boolean  @default(true)

  audits      Audit[]
  pages       Page[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
}

// ============================================
// AUDITS
// ============================================

model Audit {
  id          String      @id @default(cuid())
  projectId   String
  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)

  status      AuditStatus @default(PENDING)

  // Configurações desta auditoria
  maxPages    Int         @default(100)
  wcagLevels  String[]    @default(["A", "AA"])  // ["A", "AA", "AAA"]
  includeAbnt Boolean     @default(true)

  // Progresso
  totalPages     Int      @default(0)
  processedPages Int      @default(0)
  failedPages    Int      @default(0)

  // Timestamps
  startedAt   DateTime?
  completedAt DateTime?

  // Resultado agregado (cache)
  summary     Json?       // { critical: 0, serious: 42, moderate: 1, minor: 0, total: 43 }

  // Relações
  auditPages           AuditPage[]
  violations           Violation[]
  aggregatedViolations AggregatedViolation[]

  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([projectId])
  @@index([status])
}

enum AuditStatus {
  PENDING       // Aguardando início
  CRAWLING      // Descobrindo URLs
  AUDITING      // Executando axe-core
  AGGREGATING   // Agrupando resultados
  GENERATING    // Gerando sugestões IA
  COMPLETED     // Finalizado
  FAILED        // Falhou
  CANCELLED     // Cancelado pelo usuário
}

// ============================================
// PAGES
// ============================================

model Page {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  url         String
  path        String   // /about, /contact, etc.
  title       String?

  // Metadados descobertos
  foundVia    PageFoundVia @default(CRAWL)
  depth       Int          @default(0)  // Profundidade a partir da URL base

  auditPages  AuditPage[]

  createdAt   DateTime @default(now())

  @@unique([projectId, url])
  @@index([projectId])
}

enum PageFoundVia {
  SITEMAP    // Encontrada via sitemap.xml
  CRAWL      // Encontrada via crawling de links
  MANUAL     // Adicionada manualmente
}

// ============================================
// AUDIT PAGES (junção Audit <-> Page)
// ============================================

model AuditPage {
  id          String   @id @default(cuid())
  auditId     String
  audit       Audit    @relation(fields: [auditId], references: [id], onDelete: Cascade)
  pageId      String
  page        Page     @relation(fields: [pageId], references: [id], onDelete: Cascade)

  status      PageAuditStatus @default(PENDING)

  // Resultados
  screenshotUrl  String?     // URL no Supabase Storage
  rawResults     Json?       // Resultado bruto do axe-core (para debug)
  errorMessage   String?     // Se falhou, qual erro

  // Métricas
  violationCount Int         @default(0)
  loadTime       Int?        // ms para carregar a página

  violations     Violation[]

  processedAt    DateTime?
  createdAt      DateTime    @default(now())

  @@unique([auditId, pageId])
  @@index([auditId])
  @@index([status])
}

enum PageAuditStatus {
  PENDING     // Na fila
  PROCESSING  // Sendo processada
  COMPLETED   // Sucesso
  FAILED      // Erro (timeout, crash, etc.)
  SKIPPED     // Pulada (robots.txt, login required, etc.)
}

// ============================================
// VIOLATIONS (problemas individuais)
// ============================================

model Violation {
  id            String    @id @default(cuid())
  auditId       String
  audit         Audit     @relation(fields: [auditId], references: [id], onDelete: Cascade)
  auditPageId   String
  auditPage     AuditPage @relation(fields: [auditPageId], references: [id], onDelete: Cascade)

  // Identificação da regra
  ruleId        String    // ex: "color-contrast", "link-texto-generico"
  isCustomRule  Boolean   @default(false)  // true se for regra customizada

  // Impacto
  impact        Impact

  // WCAG info
  wcagLevel     String?   // "A", "AA", "AAA"
  wcagVersion   String?   // "2.0", "2.1", "2.2"
  wcagCriteria  String[]  // ["1.4.3", "1.4.6"]
  wcagTags      String[]  // ["wcag2aa", "wcag21aa", "cat.color"]

  // ABNT info
  abntSection   String?   // "ABNT 5.11.3"

  // Descrição
  help          String    // Mensagem curta
  description   String    // Descrição completa
  helpUrl       String?   // Link para documentação

  // Elemento afetado
  selector      String    // CSS selector único
  html          String    // HTML do elemento (truncado se necessário)
  parentHtml    String?   // HTML do pai (para contexto)

  // Dados técnicos (do axe-core)
  failureSummary String?
  technicalData  Json?    // any[], all[], none[] do axe

  // Para agregação
  fingerprint   String    // Hash: ruleId + selector normalizado

  createdAt     DateTime  @default(now())

  @@index([auditId])
  @@index([auditPageId])
  @@index([ruleId])
  @@index([fingerprint])
  @@index([impact])
}

enum Impact {
  critical
  serious
  moderate
  minor
}

// ============================================
// AGGREGATED VIOLATIONS (problemas agrupados)
// ============================================

model AggregatedViolation {
  id            String   @id @default(cuid())
  auditId       String
  audit         Audit    @relation(fields: [auditId], references: [id], onDelete: Cascade)

  // Identificação
  ruleId        String
  isCustomRule  Boolean  @default(false)
  fingerprint   String   // Hash para agrupar

  // Impacto
  impact        Impact

  // WCAG/ABNT
  wcagLevel     String?
  wcagVersion   String?
  wcagCriteria  String[]
  abntSection   String?

  // Descrição
  help          String
  description   String
  helpUrl       String?

  // Estatísticas
  occurrences   Int      // Total de ocorrências
  pageCount     Int      // Quantas páginas afetadas
  affectedPages String[] // Lista de URLs afetadas (limitado a 50)

  // Exemplo representativo
  sampleSelector  String
  sampleHtml      String
  sampleParentHtml String?
  samplePageUrl   String

  // Sugestão de correção (gerada por IA)
  aiSuggestion    String?
  aiSuggestedHtml String?  // HTML corrigido sugerido
  aiGeneratedAt   DateTime?

  // Prioridade calculada
  priority        Int      @default(0)  // 0-100, maior = mais urgente

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([auditId, fingerprint])
  @@index([auditId])
  @@index([impact])
  @@index([priority])
}

// ============================================
// EXPORT TEMPLATES (futuro)
// ============================================

model ExportTemplate {
  id          String   @id @default(cuid())
  userId      String

  name        String
  format      ExportFormat
  template    String   // Template customizado

  createdAt   DateTime @default(now())

  @@index([userId])
}

enum ExportFormat {
  MARKDOWN    // Para Claude Code, Cursor
  PDF         // Relatório formal
  CSV         // Para Excel
  JSON        // Para integrações
  JIRA        // Tickets Jira
}
```

---

## 6. Features por Fase

### Fase 1: MVP (4-6 semanas)

#### 6.1.1 Autenticação
- [ ] Login com email/senha (Supabase Auth)
- [ ] Login com Google OAuth
- [ ] Página de registro
- [ ] Recuperação de senha

#### 6.1.2 Projetos
- [ ] Criar projeto (nome + URL base)
- [ ] Listar projetos do usuário
- [ ] Editar projeto
- [ ] Excluir projeto

#### 6.1.3 Crawler
- [ ] Parser de sitemap.xml
- [ ] Crawling de links internos
- [ ] Respeitar robots.txt
- [ ] Limite de páginas configurável
- [ ] Deduplicação de URLs

#### 6.1.4 Auditoria
- [ ] Integração Playwright + axe-core
- [ ] 11 regras customizadas brasileiras
- [ ] Captura de screenshots
- [ ] Timeout por página (60s)
- [ ] Retry em caso de falha

#### 6.1.5 Resultados
- [ ] Página de status em tempo real (polling)
- [ ] Tabela de violações
- [ ] Filtros por impacto, regra, página
- [ ] Detalhes de cada violação

#### 6.1.6 Export
- [ ] Export Markdown (básico)
- [ ] Export JSON

### Fase 2: Agregação Inteligente (2-3 semanas)

- [ ] Algoritmo de fingerprinting
- [ ] Agrupamento de violações idênticas
- [ ] Cálculo de prioridade (impacto × frequência)
- [ ] View de "tarefas" ao invés de "violações"
- [ ] Estatísticas agregadas no dashboard

### Fase 3: IA e Export Avançado (2-3 semanas)

- [ ] Integração Claude API
- [ ] Sugestões de correção por violação
- [ ] HTML corrigido sugerido
- [ ] Export para Claude Code (.claude/context/)
- [ ] Export PDF profissional
- [ ] Export CSV

### Fase 4: Pro Features (2-3 semanas)

- [ ] Plano Pro (Stripe)
- [ ] Histórico de auditorias
- [ ] Comparação entre auditorias (regressão)
- [ ] Webhooks (notificação quando terminar)
- [ ] API pública
- [ ] White-label reports

### Fase 5: Integrações (futuro)

- [ ] GitHub Action
- [ ] GitLab CI
- [ ] VS Code Extension
- [ ] Slack notifications
- [ ] Jira integration

---

## 7. API Endpoints

### 7.1 Projetos

```
GET    /api/projects              # Lista projetos do usuário
POST   /api/projects              # Cria projeto
GET    /api/projects/:id          # Detalhes do projeto
PUT    /api/projects/:id          # Atualiza projeto
DELETE /api/projects/:id          # Exclui projeto
```

### 7.2 Auditorias

```
POST   /api/audits                # Inicia nova auditoria
GET    /api/audits/:id            # Status e resultados
POST   /api/audits/:id/cancel     # Cancela auditoria em andamento
DELETE /api/audits/:id            # Exclui auditoria

GET    /api/audits/:id/violations          # Lista violações (paginado)
GET    /api/audits/:id/aggregated          # Lista violações agregadas
GET    /api/audits/:id/pages               # Lista páginas auditadas

GET    /api/audits/:id/export/markdown     # Export Markdown
GET    /api/audits/:id/export/pdf          # Export PDF
GET    /api/audits/:id/export/json         # Export JSON
GET    /api/audits/:id/export/csv          # Export CSV
GET    /api/audits/:id/export/claude       # Export para Claude Code
```

### 7.3 Webhooks

```
POST   /api/webhooks/stripe       # Webhook Stripe
POST   /api/webhooks/audit-complete/:id    # Callback interno
```

---

## 8. Filas BullMQ

### 8.1 Crawler Queue

```typescript
interface CrawlerJobData {
  auditId: string;
  projectId: string;
  baseUrl: string;
  maxPages: number;
}

interface CrawlerJobResult {
  discoveredUrls: string[];
  fromSitemap: number;
  fromCrawl: number;
}
```

### 8.2 Auditor Queue

```typescript
interface AuditorJobData {
  auditId: string;
  auditPageId: string;
  pageId: string;
  url: string;
  wcagLevels: string[];
  includeAbnt: boolean;
}

interface AuditorJobResult {
  violationCount: number;
  screenshotUrl?: string;
  loadTime: number;
}
```

### 8.3 Aggregator Queue

```typescript
interface AggregatorJobData {
  auditId: string;
  generateAiSuggestions: boolean;
}

interface AggregatorJobResult {
  aggregatedCount: number;
  aiSuggestionsGenerated: number;
}
```

---

## 9. Regras Customizadas (ABNT/Brasil)

### 9.1 Lista de Regras

| ID | Nome | Impacto | WCAG | ABNT |
|----|------|---------|------|------|
| link-texto-generico | Links com texto genérico | serious | 2.4.4 | 5.7.10 |
| link-nova-aba-sem-aviso | Links que abrem nova aba sem aviso | moderate | 3.2.5 | 5.12.9 |
| imagem-alt-nome-arquivo | Alt text com nome de arquivo | moderate | 1.1.1 | 5.2.6 |
| texto-justificado | Texto com alinhamento justificado | minor | 1.4.8 | 5.11.7 |
| texto-maiusculo-css | Texto longo em maiúsculas | minor | 1.4.8 | 5.11.7 |
| br-excessivo-layout | BRs excessivos para layout | minor | 1.3.1 | 5.3.1 |
| atributo-title-redundante | Atributo title redundante | minor | 4.1.2 | 5.13.13 |
| rotulo-curto-ambiguo | Rótulos curtos e ambíguos | serious | 2.4.4, 2.5.4 | 5.7.10 |
| conteudo-lorem-ipsum | Conteúdo lorem ipsum | moderate | 1.1.1 | 5.2.6 |
| fonte-muito-pequena | Fonte menor que 12px | minor | 1.4.4 | 5.11.5 |
| brasil-libras-plugin | Ausência de VLibras/Hand Talk | moderate | 1.2.6 | 5.4.7 |

### 9.2 Mapeamento WCAG → ABNT

Arquivo `abnt-map.json` com 89+ mapeamentos:

```json
{
  "1.1.1": "ABNT 5.2.6",
  "1.2.1": "ABNT 5.4.1",
  "1.2.2": "ABNT 5.4.2",
  "1.2.3": "ABNT 5.4.3",
  "1.2.4": "ABNT 5.4.4",
  "1.2.5": "ABNT 5.4.5",
  "1.3.1": "ABNT 5.3.1",
  "1.3.2": "ABNT 5.3.2",
  "1.3.3": "ABNT 5.3.3",
  "1.4.1": "ABNT 5.11.1",
  "1.4.2": "ABNT 5.11.2",
  "1.4.3": "ABNT 5.11.3",
  "1.4.4": "ABNT 5.11.5",
  "1.4.5": "ABNT 5.11.6",
  "2.1.1": "ABNT 5.5.1",
  "2.1.2": "ABNT 5.5.2",
  "2.2.1": "ABNT 5.6.1",
  "2.2.2": "ABNT 5.6.2",
  "2.3.1": "ABNT 5.10.1",
  "2.4.1": "ABNT 5.7.1",
  "2.4.2": "ABNT 5.7.2",
  "2.4.3": "ABNT 5.7.3",
  "2.4.4": "ABNT 5.7.10",
  "3.1.1": "ABNT 5.13.2",
  "3.1.2": "ABNT 5.13.3",
  "3.2.1": "ABNT 5.12.1",
  "3.2.2": "ABNT 5.12.2",
  "3.3.1": "ABNT 5.14.1",
  "3.3.2": "ABNT 5.14.2",
  "4.1.1": "ABNT 5.13.11",
  "4.1.2": "ABNT 5.13.13"
}
```

---

## 10. Export para Claude Code

### 10.1 Formato do Arquivo

Gera `.claude/context/accessibility-audit.md`:

```markdown
# Accessibility Audit Report

**Site:** https://example.com
**Date:** 2024-12-10
**Pages Audited:** 47
**Total Issues:** 156 (42 unique after aggregation)

---

## Summary

| Impact | Count | % |
|--------|-------|---|
| Critical | 0 | 0% |
| Serious | 23 | 55% |
| Moderate | 12 | 29% |
| Minor | 7 | 17% |

---

## Priority Tasks

### 1. [SERIOUS] Color contrast insufficient (23 occurrences, 15 pages)

**Rule:** color-contrast
**WCAG:** 1.4.3 (Level AA), 1.4.6 (Level AAA)
**ABNT:** 5.11.3

**Problem:** Elements have insufficient color contrast ratio.

**Affected selectors:**
- `.btn-primary` (8 pages)
- `.nav-link.active` (12 pages)
- `.card-subtitle` (5 pages)

**Example HTML:**
```html
<button class="btn-primary" style="color: #888; background: #eee;">
  Submit
</button>
```

**Suggested Fix:**
```html
<button class="btn-primary" style="color: #333; background: #fff;">
  Submit
</button>
```

**Pages affected:**
- /home
- /about
- /contact
- /products
- ... (11 more)

---

### 2. [SERIOUS] Links with generic text (18 occurrences, 12 pages)

**Rule:** link-texto-generico (custom)
**WCAG:** 2.4.4 (Level A)
**ABNT:** 5.7.10

**Problem:** Links use generic text like "click here", "read more" that don't describe the destination.

**Affected selectors:**
- `a.read-more` (10 pages)
- `.card a:last-child` (8 pages)

**Example HTML:**
```html
<a href="/products/123" class="read-more">Clique aqui</a>
```

**Suggested Fix:**
```html
<a href="/products/123" class="read-more">Ver detalhes do Produto X</a>
```

---

## Full Violation List

[... detailed list continues ...]

---

## How to Use This Report

1. **Start with Serious issues** - they have the highest impact on users
2. **Fix by selector** - same selector across pages = one code fix
3. **Test after fixing** - re-run audit to verify
4. **Check AAA optionally** - AAA is not required but recommended

## Resources

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [axe-core Rules](https://dequeuniversity.com/rules/axe/)
- [ABNT NBR 17060](https://www.abntcatalogo.com.br/)
```

---

## 11. UI/UX Guidelines

### 11.1 Design System

- **Framework:** shadcn/ui (Radix + Tailwind)
- **Theme:** Light/Dark mode
- **Typography:** Inter ou Geist
- **Colors:**
  - Critical: `red-500`
  - Serious: `orange-500`
  - Moderate: `yellow-500`
  - Minor: `blue-500`

### 11.2 Páginas Principais

1. **Dashboard** - Overview de todos os projetos
2. **Projeto** - Detalhes + histórico de auditorias
3. **Auditoria em andamento** - Progresso em tempo real
4. **Resultados** - Tabela + filtros + export

### 11.3 Componentes Chave

- `AuditProgress` - Barra de progresso com páginas processadas
- `ViolationCard` - Card de violação com código e sugestão
- `ImpactBadge` - Badge colorido por impacto
- `WcagTag` - Tag com nível e versão WCAG
- `ExportMenu` - Dropdown com opções de export

---

## 12. Limites e Quotas

### 12.1 Plano Free

| Recurso | Limite |
|---------|--------|
| Projetos | 3 |
| Páginas por auditoria | 25 |
| Auditorias por mês | 10 |
| Histórico | 30 dias |
| Export | Markdown, JSON |
| Sugestões IA | Não |

### 12.2 Plano Pro ($29/mês)

| Recurso | Limite |
|---------|--------|
| Projetos | Ilimitado |
| Páginas por auditoria | 500 |
| Auditorias por mês | Ilimitado |
| Histórico | Ilimitado |
| Export | Todos os formatos |
| Sugestões IA | Sim |
| Webhooks | Sim |
| API | Sim |

### 12.3 Enterprise (sob consulta)

- Self-hosted
- SSO/SAML
- SLA
- Suporte prioritário

---

## 13. Segurança

### 13.1 Autenticação

- Supabase Auth (JWT)
- Row Level Security (RLS) no PostgreSQL
- Refresh tokens com rotação

### 13.2 Rate Limiting

- API: 100 req/min por usuário
- Auditorias: 1 concurrent por usuário (Free), 3 (Pro)

### 13.3 Crawler

- Respeitar robots.txt
- User-Agent identificável
- Rate limit: 2 req/s por domínio
- Não seguir links externos

### 13.4 Dados

- Criptografia em trânsito (HTTPS)
- Criptografia em repouso (Supabase)
- Retenção: 30 dias (Free), ilimitado (Pro)
- LGPD compliant

---

## 14. Monitoramento

### 14.1 Métricas

- Tempo médio de auditoria
- Taxa de falha por página
- Filas (jobs pendentes, processando)
- Uso de recursos (CPU, memória workers)

### 14.2 Logs

- Structured logging (JSON)
- Níveis: error, warn, info, debug
- Retenção: 7 dias

### 14.3 Alertas

- Fila > 1000 jobs pendentes
- Taxa de erro > 10%
- Worker down

---

## 15. Próximos Passos

1. **Setup inicial**
   - Criar monorepo com Turborepo
   - Configurar Supabase (DB + Auth + Storage)
   - Configurar Redis (Upstash)
   - Deploy básico Vercel + Railway

2. **Implementar core**
   - Schema Prisma + migrations
   - API routes básicas
   - Workers BullMQ
   - Integração axe-core

3. **Frontend MVP**
   - Auth pages
   - Dashboard
   - Criar projeto
   - Visualizar resultados

4. **Iterar**
   - Feedback de usuários
   - Agregação inteligente
   - Sugestões IA
   - Export avançado

---

## Changelog

| Versão | Data | Mudanças |
|--------|------|----------|
| 1.0 | 2024-12-10 | Versão inicial do PRD |
