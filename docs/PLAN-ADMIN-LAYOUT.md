# Plano: Reestruturar para Layout Admin Profissional

## Contexto

A aplicacao cresceu e precisa de um layout de admin profissional inspirado no Metronic, usando shadcn/ui, para comportar melhor:
- Multiplos projetos (webapp, site, landing page)
- Configuracoes por projeto (auth, subdomain policy)
- Lista de auditorias por projeto
- Resultados complexos de auditoria (score, conformance, issues, categorias)
- Futuras paginas (settings, members, dashboard geral)

## Estrutura Atual vs Proposta

### Atual
```
src/app/(dashboard)/
├── layout.tsx              # Header simples + container
├── projects/
│   ├── page.tsx            # Lista de projetos (grid)
│   ├── new/page.tsx        # Form novo projeto
│   └── [id]/
│       ├── page.tsx        # Detalhe projeto + auditorias
│       └── audits/[auditId]/
│           ├── page.tsx    # Resultados auditoria
│           └── emag/       # Relatorio eMAG
```

### Proposta (Inspirado Metronic)
```
src/app/(dashboard)/
├── layout.tsx              # Layout master com sidebar + header
├── page.tsx                # Dashboard home (resumo projetos)
├── projects/
│   ├── page.tsx            # Lista de projetos
│   ├── new/page.tsx        # Criar projeto
│   └── [id]/
│       ├── layout.tsx      # Sub-layout do projeto (tabs/sub-nav)
│       ├── page.tsx        # Overview do projeto (ultima auditoria)
│       ├── settings/       # Config do projeto
│       │   ├── page.tsx    # General settings
│       │   ├── auth/       # Autenticacao
│       │   └── domains/    # Politica subdominios
│       └── audits/
│           ├── page.tsx    # Lista auditorias (table)
│           ├── new/        # Iniciar nova auditoria
│           └── [auditId]/
│               ├── page.tsx     # Resultados
│               ├── issues/      # Lista de issues
│               └── reports/     # Relatorios (eMAG, PDF)
├── settings/               # Settings globais do usuario
│   ├── page.tsx            # Profile
│   └── billing/            # Plano/billing
└── team/                   # Futuro: membros
```

---

## Fase 1: Componentes de Layout Base

### 1.1 Instalar componentes shadcn necessarios

```bash
npx shadcn@latest add sidebar
npx shadcn@latest add sheet
npx shadcn@latest add avatar
npx shadcn@latest add breadcrumb
npx shadcn@latest add command
npx shadcn@latest add navigation-menu
```

### 1.2 Criar estrutura de layout

**Arquivo: `src/components/layout/sidebar.tsx`**
- Logo + nome do app
- Menu principal:
  - Dashboard (icone Home)
  - Projetos (icone Folder) - com sub-menu dos projetos
  - Configuracoes (icone Settings)
- Menu secundario (bottom):
  - Ajuda/Docs
  - Dark mode toggle

**Arquivo: `src/components/layout/header.tsx`**
- Breadcrumb dinamico
- Project switcher (dropdown com projetos)
- Search (command palette - Cmd+K)
- Notifications (futuro)
- User menu (avatar + dropdown)
  - Profile
  - Settings
  - Billing
  - Logout

**Arquivo: `src/components/layout/project-switcher.tsx`**
- Dropdown estilizado
- Lista projetos do usuario
- Opcao "Criar novo projeto"
- Indicador do projeto atual

**Arquivo: `src/components/layout/user-nav.tsx`**
- Avatar do usuario
- Dropdown com opcoes
- Badge de plano (Free/Pro)

**Arquivo: `src/components/layout/breadcrumb-nav.tsx`**
- Breadcrumb automatico baseado na rota
- Links clicaveis
- Truncate em nomes longos

---

## Fase 2: Dashboard Principal

### 2.1 Dashboard Home (`/`)

**Componentes:**

1. **ProjectsOverviewCard**
   - Total de projetos
   - Projetos com auditorias recentes
   - Quick actions

2. **RecentAuditsCard**
   - Lista das 5 ultimas auditorias (todos projetos)
   - Status, score, data
   - Link para resultado

3. **QuickStats**
   - Total de issues abertas
   - Issues criticas pendentes
   - Projetos sem auditoria recente

4. **GettingStartedCard** (para novos usuarios)
   - Steps para comecar
   - Criar primeiro projeto
   - Rodar primeira auditoria

---

## Fase 3: Pagina do Projeto Reestruturada

### 3.1 Layout do Projeto (`/projects/[id]/layout.tsx`)

**Sub-navegacao horizontal (tabs):**
- Overview
- Audits
- Settings

### 3.2 Overview (`/projects/[id]/page.tsx`)

**Conteudo:**
- Header com nome + URL + descricao
- **Card: Ultima Auditoria**
  - Score grande
  - Resumo issues (critical, serious, etc)
  - Link para detalhes
  - Botao "Nova Auditoria"
- **Card: Configuracao Atual**
  - Auth type configurado
  - Subdomain policy
  - WCAG levels padrao
- **Card: Proximos Passos** (se nao tiver auditoria)

### 3.3 Audits List (`/projects/[id]/audits/page.tsx`)

**Tabela de auditorias:**
- Data/hora
- Status
- Paginas auditadas
- Issues total
- Score
- WCAG levels
- Actions (ver, excluir)

**Filtros:**
- Status (completed, failed, in_progress)
- Periodo

**Botao: Nova Auditoria**

### 3.4 Settings (`/projects/[id]/settings/`)

**Tabs ou paginas separadas:**

1. **General** (`/settings`)
   - Nome do projeto
   - Descricao
   - URL base
   - Excluir projeto

2. **Authentication** (`/settings/auth`)
   - Tipo de auth (none, bearer, cookie)
   - Config especifica
   - Testar conexao (screenshot)

3. **Domains** (`/settings/domains`)
   - Politica de subdominios
   - Lista de subdominios permitidos

4. **Defaults** (`/settings/defaults`)
   - WCAG levels padrao
   - Max pages padrao
   - Include ABNT/eMAG/COGA padrao

---

## Fase 4: Pagina de Resultados da Auditoria

### 4.1 Layout melhorado

**Header:**
- Breadcrumb: Projetos > [Nome] > Auditorias > [Data]
- Status badge
- Actions (exportar, reaudit)

**Grid 2 colunas no topo:**
- Score Card (lado esquerdo)
- Issue Summary (lado direito)

**Tabs para organizar conteudo:**
- **Overview**: Score + Summary + Categories chart
- **Issues**: Lista filtrada de violacoes (atual)
- **Conformance**: WCAG + eMAG (se habilitado)
- **Pages**: Lista de paginas auditadas + broken pages
- **Reports**: Links para exports (PDF, eMAG, CSV)

---

## Fase 5: Fluxo de Nova Auditoria

### 5.1 Modal ou pagina dedicada

**Opcao A: Dialog/Modal** (manter atual, melhorar UI)
- Steps wizard: Config > Confirm > Running

**Opcao B: Pagina dedicada** (`/projects/[id]/audits/new`)
- Mais espaco para explicar opcoes
- Preview de config
- Historico de configs usadas

**Formulario:**
- WCAG levels (checkboxes visuais)
- Max pages (slider + input)
- Include ABNT/eMAG/COGA (cards selecionaveis)
- Resumo do que sera auditado
- Botao "Iniciar Auditoria"

**Pagina de progresso** (`/projects/[id]/audits/[auditId]` com status != COMPLETED)
- Progress bar animada
- Status atual (crawling, auditing, etc)
- Paginas processadas / total
- Log de atividade (tempo real se possivel)
- Botao "Cancelar" (se implementado)

---

## Fase 6: Settings Globais do Usuario

### 6.1 Profile (`/settings`)
- Nome
- Email (read-only)
- Avatar
- Timezone/locale (futuro)

### 6.2 Billing (`/settings/billing`)
- Plano atual
- Limites usados (projetos, auditorias/mes)
- Upgrade (link Stripe)

### 6.3 Account (`/settings/account`)
- Alterar senha
- Excluir conta

---

## Implementacao Tecnica

### Componentes a criar:

```
src/components/
├── layout/
│   ├── app-header.tsx        # Header principal (logo + nav + user)
│   ├── main-nav.tsx          # Menu horizontal (Dashboard, Projects, Settings)
│   ├── project-switcher.tsx  # Dropdown de projetos no header
│   ├── user-nav.tsx          # Avatar + dropdown (profile, settings, logout)
│   ├── breadcrumb-nav.tsx    # Breadcrumb abaixo do header
│   ├── mobile-nav.tsx        # Menu mobile (hamburger + sheet)
│   └── theme-toggle.tsx      # Toggle dark/light mode
├── dashboard/
│   ├── projects-overview.tsx # Cards com resumo dos projetos
│   ├── recent-audits.tsx     # Lista ultimas auditorias
│   ├── quick-stats.tsx       # Metricas gerais
│   └── getting-started.tsx   # Onboarding para novos usuarios
├── project/
│   ├── project-header.tsx    # Header do projeto (nome, url, actions)
│   ├── project-nav.tsx       # Sub-navegacao (Overview, Audits, Settings)
│   ├── last-audit-card.tsx   # Card com ultima auditoria
│   └── config-summary.tsx    # Resumo das configs do projeto
└── audit/
    ├── audit-header.tsx      # Header da auditoria
    ├── audit-nav.tsx         # Tabs (Overview, Issues, Conformance, Pages)
    └── (existentes movidos para ca)
```

### Rotas a modificar/criar:

1. `src/app/(dashboard)/layout.tsx` - Header horizontal + breadcrumb
2. `src/app/(dashboard)/page.tsx` - Dashboard home (novo)
3. `src/app/(dashboard)/projects/[id]/layout.tsx` - Sub-layout projeto com nav
4. `src/app/(dashboard)/projects/[id]/page.tsx` - Overview (refatorar)
5. `src/app/(dashboard)/projects/[id]/settings/page.tsx` - Settings geral
6. `src/app/(dashboard)/projects/[id]/settings/auth/page.tsx` - Autenticacao
7. `src/app/(dashboard)/projects/[id]/settings/domains/page.tsx` - Subdominios
8. `src/app/(dashboard)/projects/[id]/settings/defaults/page.tsx` - Defaults auditoria
9. `src/app/(dashboard)/projects/[id]/audits/page.tsx` - Lista auditorias (tabela)
10. `src/app/(dashboard)/settings/page.tsx` - Profile usuario
11. `src/app/(dashboard)/settings/billing/page.tsx` - Plano/billing

### Ordem de implementacao:

1. **Fase 1: Layout base**
   - Instalar componentes shadcn (sheet, avatar, navigation-menu, breadcrumb)
   - Criar app-header.tsx com menu horizontal
   - Criar project-switcher.tsx (dropdown)
   - Criar user-nav.tsx (avatar + dropdown)
   - Criar mobile-nav.tsx (hamburger + sheet)
   - Refatorar layout.tsx principal
   - Testar responsividade

2. **Fase 2: Dashboard + Projeto**
   - Criar dashboard home com cards
   - Criar project layout com sub-nav horizontal
   - Refatorar overview do projeto
   - Mover auth-config e subdomain-policy para /settings/*

3. **Fase 3: Auditorias**
   - Criar lista de auditorias em tabela
   - Adicionar tabs na pagina de resultados
   - Ajustar dialog de nova auditoria (max 1000, warning)

4. **Fase 4: Polish**
   - Settings do usuario (profile, billing)
   - Breadcrumbs dinamicos em todas as paginas
   - Dark mode toggle no user menu
   - Mobile responsivo completo

---

## Referencias Visuais (Metronic)

Baseado nas screenshots:

1. **Header escuro** com:
   - Logo (canto esquerdo)
   - Menu horizontal (Profiles, Projects, Works, Teams...)
   - Breadcrumb abaixo do menu
   - User menu (canto direito) com avatar, dropdown

2. **Dropdown do usuario** com:
   - Nome + email
   - Badge "Pro"
   - Links: Public Profile, My Profile, My Account, Dev Forum
   - Language selector
   - Dark Mode toggle
   - Logout

3. **Dropdown "More"** no menu:
   - Sub-items agrupados

4. **Estilo geral:**
   - Fundo escuro (dark mode)
   - Cards com bordas sutis
   - Tipografia clara
   - Espacamento consistente

---

## Decisoes Definidas

1. **Layout: Header horizontal** (como Metronic)
   - Menu principal no header
   - Sem sidebar lateral
   - Mobile: hamburger menu com sheet

2. **Project Switcher: No header** (dropdown)
   - Proximo ao logo/nome do app
   - Lista projetos do usuario
   - Link para criar novo

3. **Settings do projeto: Paginas separadas**
   - URLs distintas para cada secao
   - Mais escalavel para futuro

4. **Nova auditoria: Dialog**
   - Manter dialog atual
   - Melhorar UI/UX

5. **Max pages: 1-1000 com aviso**
   - Slider ate 1000
   - Warning para valores > 500 sobre tempo de execucao

---

## Proximos Passos

1. [ ] Instalar componentes shadcn necessarios
2. [ ] Criar branch `feature/admin-layout`
3. [ ] Implementar header horizontal com menu
4. [ ] Implementar project switcher
5. [ ] Implementar user menu (dropdown)
6. [ ] Criar dashboard home
7. [ ] Refatorar projeto com sub-navegacao
8. [ ] Separar settings em paginas
9. [ ] Ajustar max pages para 1-1000
10. [ ] Testar responsividade mobile
11. [ ] Polish e dark mode
