# Prompt: Implementar Suporte Multi-idiomas com next-intl

## Objetivo

Adicionar suporte a internacionalizacao (i18n) na aplicacao usando `next-intl`, preparando para multiplos idiomas mas iniciando apenas com portugues brasileiro (pt-BR).

---

## 1. Instalar dependencia

```bash
yarn add next-intl
```

---

## 2. Criar estrutura de arquivos i18n

```
src/
├── i18n/
│   ├── request.ts        # Config do servidor
│   ├── routing.ts        # Config de rotas
│   └── navigation.ts     # Helpers de navegacao
└── messages/
    ├── pt-BR.json        # Traducoes em portugues
    ├── en.json           # Placeholder (copia do pt-BR por enquanto)
    └── es.json           # Placeholder (copia do pt-BR por enquanto)
```

---

## 3. Criar arquivo `src/i18n/routing.ts`

```typescript
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt-BR', 'en', 'es'],
  defaultLocale: 'pt-BR',
  localePrefix: 'as-needed' // URL sem prefixo para locale default
})
```

---

## 4. Criar arquivo `src/i18n/request.ts`

```typescript
import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})
```

---

## 5. Criar arquivo `src/i18n/navigation.ts`

```typescript
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)
```

---

## 6. Criar arquivo `src/middleware.ts`

```typescript
import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware(routing)

export const config = {
  // Matcher ignora rotas de API, arquivos estaticos e auth callbacks
  matcher: [
    // Match all pathnames except:
    // - /api (API routes)
    // - /_next (Next.js internals)
    // - /_vercel (Vercel internals)
    // - /auth (auth callbacks - importante para Supabase)
    // - Arquivos estaticos (.*\\..*)
    '/((?!api|_next|_vercel|auth|.*\\..*).*)'
  ]
}
```

---

## 7. Atualizar `next.config.ts`

```typescript
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // ... manter todas as configs existentes (headers, etc)
}

export default withNextIntl(nextConfig)
```

---

## 8. Reestruturar rotas para suportar `[locale]`

### Estrutura atual:
```
src/app/
├── (dashboard)/
│   ├── layout.tsx
│   ├── projects/
│   └── ...
├── login/
├── auth/
├── api/
└── layout.tsx
```

### Nova estrutura:
```
src/app/
├── [locale]/
│   ├── (dashboard)/
│   │   ├── layout.tsx      # Manter como esta
│   │   ├── projects/
│   │   └── ...
│   ├── login/
│   │   └── page.tsx
│   ├── layout.tsx          # Novo layout com NextIntlClientProvider
│   └── page.tsx            # Redirect para /projects ou landing
├── api/                    # Manter FORA do [locale]
│   └── ...
├── auth/                   # Manter FORA do [locale] (callbacks Supabase)
│   └── ...
└── layout.tsx              # Root layout minimo (html, body, providers globais)
```

### Comandos para mover:
```bash
# Criar pasta [locale]
mkdir -p src/app/\[locale\]

# Mover (dashboard) para dentro de [locale]
mv src/app/\(dashboard\) src/app/\[locale\]/

# Mover login para dentro de [locale]
mv src/app/login src/app/\[locale\]/

# API e auth ficam onde estao (fora do [locale])
```

---

## 9. Criar/Atualizar layouts

### `src/app/layout.tsx` (Root - minimo)

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/ui/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Accessibility Audit Platform',
  description: 'Plataforma de auditoria de acessibilidade web',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### `src/app/[locale]/layout.tsx` (Locale layout)

```typescript
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'

interface Props {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params

  // Validar locale
  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  // Habilitar renderizacao estatica
  setRequestLocale(locale)

  // Carregar mensagens
  const messages = await getMessages()

  return (
    <NextIntlClientProvider messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
```

---

## 10. Criar arquivo de mensagens `src/messages/pt-BR.json`

```json
{
  "Common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "edit": "Editar",
    "back": "Voltar",
    "loading": "Carregando...",
    "error": "Erro",
    "success": "Sucesso",
    "confirm": "Confirmar",
    "close": "Fechar",
    "search": "Buscar",
    "filter": "Filtrar",
    "export": "Exportar",
    "import": "Importar",
    "create": "Criar",
    "update": "Atualizar",
    "view": "Ver",
    "viewAll": "Ver todos",
    "viewDetails": "Ver detalhes",
    "noResults": "Nenhum resultado encontrado",
    "yes": "Sim",
    "no": "Nao"
  },
  "Auth": {
    "login": "Entrar",
    "logout": "Sair",
    "email": "E-mail",
    "password": "Senha",
    "forgotPassword": "Esqueceu a senha?",
    "signUp": "Criar conta",
    "signIn": "Entrar",
    "signOut": "Sair"
  },
  "Navigation": {
    "dashboard": "Dashboard",
    "projects": "Projetos",
    "settings": "Configuracoes",
    "profile": "Perfil",
    "billing": "Faturamento",
    "help": "Ajuda"
  },
  "Dashboard": {
    "title": "Dashboard",
    "welcome": "Bem-vindo de volta",
    "recentAudits": "Auditorias Recentes",
    "quickStats": "Estatisticas Rapidas",
    "noProjects": "Voce ainda nao tem projetos",
    "createFirst": "Criar primeiro projeto"
  },
  "Project": {
    "title": "Projeto",
    "projects": "Projetos",
    "newProject": "Novo Projeto",
    "createProject": "Criar Projeto",
    "editProject": "Editar Projeto",
    "deleteProject": "Excluir Projeto",
    "name": "Nome",
    "description": "Descricao",
    "baseUrl": "URL Base",
    "createdAt": "Criado em",
    "updatedAt": "Atualizado em",
    "noDescription": "Sem descricao",
    "manageProjects": "Gerencie seus sites para auditoria de acessibilidade"
  },
  "ProjectSettings": {
    "title": "Configuracoes do Projeto",
    "general": "Geral",
    "authentication": "Autenticacao",
    "domains": "Dominios",
    "defaults": "Padroes de Auditoria",
    "discovery": "Descoberta de Paginas",
    "dangerZone": "Zona de Perigo"
  },
  "ProjectInfo": {
    "title": "Informacoes do Projeto",
    "totalAudits": "Total de Auditorias",
    "completed": "concluidas",
    "lastAudit": "Ultima Auditoria",
    "pagesAudited": "paginas auditadas",
    "noAudit": "Nenhuma auditoria",
    "currentViolations": "Violacoes Atuais",
    "critical": "criticas",
    "trend": "Tendencia",
    "improving": "Melhorando",
    "worsening": "Piorando"
  },
  "Audit": {
    "title": "Auditoria",
    "audits": "Auditorias",
    "newAudit": "Nova Auditoria",
    "startAudit": "Iniciar Auditoria",
    "results": "Resultados da Auditoria",
    "recentAudits": "Auditorias Recentes",
    "noAudits": "Nenhuma auditoria realizada ainda",
    "violations": "Violacoes",
    "uniqueTypes": "tipos unicos",
    "pages": "Paginas",
    "pagesAudited": "paginas auditadas",
    "pagesRequested": "Paginas solicitadas",
    "pagesWithViolations": "Paginas com violacoes",
    "pagesWithProblems": "Paginas com problema",
    "discoveryIterations": "Iteracoes de descoberta",
    "lessAccessiblePages": "site possui menos paginas acessiveis",
    "brokenPages": "Paginas Quebradas",
    "technicalDetails": "Detalhes Tecnicos",
    "lastAuditSummary": "Resumo da Ultima Auditoria",
    "backToProject": "Voltar ao projeto"
  },
  "AuditStatus": {
    "pending": "Pendente",
    "crawling": "Descobrindo paginas...",
    "auditing": "Auditando paginas...",
    "aggregating": "Agregando resultados...",
    "generating": "Gerando sugestoes...",
    "completed": "Concluida",
    "failed": "Falhou",
    "cancelled": "Cancelada",
    "waitingStart": "Aguardando inicio...",
    "pagesProcessed": "{processed} de {total} paginas processadas"
  },
  "AuditFailed": {
    "title": "A auditoria falhou",
    "description": "Possiveis causas: site inacessivel, timeout, ou erro de configuracao. Verifique a URL e tente novamente."
  },
  "AuditConfig": {
    "wcagLevels": "Niveis WCAG",
    "maxPages": "Maximo de Paginas",
    "includeAbnt": "Incluir ABNT",
    "includeEmag": "Incluir eMAG",
    "includeCoga": "Incluir COGA",
    "startedAt": "Iniciada em",
    "completedAt": "Concluida em"
  },
  "Severity": {
    "critical": "Critico",
    "criticalPlural": "Criticas",
    "serious": "Serio",
    "seriousPlural": "Serias",
    "moderate": "Moderado",
    "moderatePlural": "Moderadas",
    "minor": "Menor",
    "minorPlural": "Menores"
  },
  "Violations": {
    "title": "Violacoes",
    "groupedByType": "Problemas de acessibilidade agrupados por tipo",
    "occurrences": "ocorrencias",
    "affectedPages": "paginas afetadas",
    "priority": "Prioridade",
    "learnMore": "Saiba mais",
    "verifyFix": "Verificar correcao",
    "generateSuggestion": "Gerar sugestao (IA)",
    "copySelector": "Copiar seletor",
    "viewAffectedElements": "Ver elementos afetados",
    "viewAffectedPages": "Ver paginas afetadas"
  },
  "Discovery": {
    "method": "Metodo de Descoberta",
    "manual": "Manual",
    "sitemap": "Sitemap",
    "crawler": "Rastreamento",
    "manualDescription": "Especifique URLs manualmente",
    "sitemapDescription": "Extrair URLs do sitemap.xml",
    "crawlerDescription": "Rastrear links automaticamente"
  },
  "Authentication": {
    "title": "Autenticacao",
    "type": "Tipo",
    "none": "Sem autenticacao",
    "bearer": "Bearer Token",
    "cookie": "Cookies",
    "testConnection": "Testar Conexao"
  },
  "SubdomainPolicy": {
    "title": "Politica de Subdominios",
    "mainOnly": "Apenas dominio principal",
    "allSubdomains": "Todos os subdominios",
    "specific": "Subdominios especificos"
  },
  "Standards": {
    "wcag": "WCAG",
    "emag": "eMAG",
    "abnt": "ABNT",
    "coga": "COGA",
    "enabledStandards": "Padroes Habilitados",
    "none": "Nenhum"
  },
  "UserMenu": {
    "profile": "Perfil",
    "settings": "Configuracoes",
    "billing": "Faturamento",
    "help": "Ajuda",
    "logout": "Sair",
    "darkMode": "Modo Escuro",
    "lightMode": "Modo Claro",
    "language": "Idioma"
  },
  "Plan": {
    "free": "Gratuito",
    "pro": "Pro",
    "enterprise": "Enterprise"
  },
  "Errors": {
    "generic": "Ocorreu um erro. Tente novamente.",
    "notFound": "Pagina nao encontrada",
    "unauthorized": "Acesso nao autorizado",
    "forbidden": "Acesso negado",
    "serverError": "Erro no servidor"
  }
}
```

---

## 11. Criar placeholders para outros idiomas

### `src/messages/en.json`
```json
{
  "_comment": "TODO: Traduzir para ingles. Por enquanto, copia do pt-BR."
}
```

### `src/messages/es.json`
```json
{
  "_comment": "TODO: Traduzir para espanhol. Por enquanto, copia do pt-BR."
}
```

---

## 12. Atualizar componentes para usar traducoes

### Server Components - usar `getTranslations`

```typescript
import { getTranslations } from 'next-intl/server'

export default async function ProjectsPage() {
  const t = await getTranslations('Project')

  return (
    <div>
      <h1>{t('projects')}</h1>
      <p>{t('manageProjects')}</p>
    </div>
  )
}
```

### Client Components - usar `useTranslations`

```typescript
'use client'
import { useTranslations } from 'next-intl'

export function SaveButton() {
  const t = useTranslations('Common')

  return <button>{t('save')}</button>
}
```

### Interpolacao de variaveis

```typescript
// No JSON:
// "pagesProcessed": "{processed} de {total} paginas processadas"

// No componente:
t('AuditStatus.pagesProcessed', { processed: 10, total: 100 })
```

---

## 13. Atualizar navegacao

### Trocar imports de `next/link` e `next/navigation`

```typescript
// ANTES
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

// DEPOIS
import { Link, useRouter, usePathname } from '@/i18n/navigation'
```

### Para Server Components, usar redirect do next-intl

```typescript
import { redirect } from '@/i18n/navigation'

// Em vez de
import { redirect } from 'next/navigation'
```

---

## 14. Arquivos principais a modificar

Lista de arquivos que precisam ser atualizados para usar traducoes:

### Layouts
- [ ] `src/app/layout.tsx` - Simplificar (mover providers para [locale])
- [ ] `src/app/[locale]/layout.tsx` - Criar com NextIntlClientProvider
- [ ] `src/app/[locale]/(dashboard)/layout.tsx` - Atualizar imports

### Componentes de Layout
- [ ] `src/components/layout/app-header.tsx`
- [ ] `src/components/layout/user-nav.tsx`
- [ ] `src/components/layout/main-nav.tsx`
- [ ] `src/components/layout/project-switcher.tsx`
- [ ] `src/components/layout/breadcrumb-nav.tsx`

### Pages
- [ ] `src/app/[locale]/(dashboard)/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/projects/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/projects/new/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/projects/[id]/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/projects/[id]/audits/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/projects/[id]/audits/[auditId]/page.tsx`
- [ ] `src/app/[locale]/(dashboard)/projects/[id]/settings/**`
- [ ] `src/app/[locale]/login/page.tsx`

### Componentes de Audit
- [ ] `src/components/audit/score-card.tsx`
- [ ] `src/components/audit/issue-summary-chart.tsx`
- [ ] `src/components/audit/conformance-tabs.tsx`
- [ ] `src/components/audit/category-chart.tsx`
- [ ] `src/components/audit/scan-logs.tsx`

---

## 15. Ordem de execucao sugerida

1. [ ] Instalar next-intl (`yarn add next-intl`)
2. [ ] Criar pasta `src/i18n/` com arquivos de config
3. [ ] Criar `src/middleware.ts`
4. [ ] Atualizar `next.config.ts`
5. [ ] Criar `src/messages/pt-BR.json` com estrutura completa
6. [ ] Criar pastas `[locale]` e mover arquivos
7. [ ] Criar/atualizar layouts (`src/app/layout.tsx` e `src/app/[locale]/layout.tsx`)
8. [ ] Criar `src/i18n/navigation.ts`
9. [ ] Testar se app carrega sem erros
10. [ ] Atualizar componentes de layout para usar traducoes
11. [ ] Atualizar pages gradualmente
12. [ ] Testar todas as rotas
13. [ ] Verificar se APIs continuam funcionando

---

## 16. Importante

- NAO traduzir ainda para en/es, apenas criar estrutura
- Focar em fazer funcionar primeiro, depois refinar traducoes
- Manter `src/app/api/` FORA do `[locale]` - APIs nao precisam de i18n
- Manter `src/app/auth/` FORA do `[locale]` - callbacks do Supabase
- Testar se todas as rotas continuam funcionando apos migracao
- O middleware deve ignorar rotas de API e auth

---

## 17. Troubleshooting

### Erro: "Unable to find next-intl locale"
- Verificar se o middleware esta configurado corretamente
- Verificar se o matcher nao esta bloqueando rotas necessarias

### Erro: "Missing message"
- Verificar se a chave existe no arquivo JSON
- Verificar se o namespace esta correto

### Links nao funcionam
- Trocar `next/link` por `@/i18n/navigation`
- Verificar se o Link esta importado corretamente

### Auth callback falha
- Garantir que `/auth` esta FORA do `[locale]`
- Verificar matcher no middleware
