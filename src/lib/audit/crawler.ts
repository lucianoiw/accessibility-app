import { chromium, type Browser, type Page } from 'playwright'
import type { AuthConfig, SubdomainPolicy } from '@/types'

// Parâmetros de tracking que não afetam o conteúdo da página
const TRACKING_PARAMS = new Set([
  // Google Analytics / Ads
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'gclid', 'gclsrc', 'dclid',
  // Facebook
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source',
  // Microsoft / Bing
  'msclkid',
  // Hubspot
  'hsa_acc', 'hsa_cam', 'hsa_grp', 'hsa_ad', 'hsa_src', 'hsa_tgt', 'hsa_kw', 'hsa_mt', 'hsa_net', 'hsa_ver',
  // Mailchimp
  'mc_cid', 'mc_eid',
  // Outros trackers comuns
  '_ga', '_gl', 'ref', 'source', 'campaign',
])

/**
 * Normaliza uma URL para evitar duplicatas
 * - Remove trailing slash (exceto para root "/")
 * - Remove apenas parâmetros de tracking (utm_*, fbclid, etc)
 * - Mantém query strings que podem afetar conteúdo
 * - Normaliza para lowercase o hostname
 */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)
    // Normalizar hostname para lowercase
    let normalized = `${parsed.protocol}//${parsed.hostname.toLowerCase()}`
    if (parsed.port) {
      normalized += `:${parsed.port}`
    }
    // Adicionar pathname, removendo trailing slash (exceto para root)
    let pathname = parsed.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    normalized += pathname

    // Manter query strings, mas remover parâmetros de tracking
    const params = new URLSearchParams(parsed.search)
    const cleanParams = new URLSearchParams()
    for (const [key, value] of params) {
      if (!TRACKING_PARAMS.has(key.toLowerCase())) {
        cleanParams.append(key, value)
      }
    }
    const queryString = cleanParams.toString()
    if (queryString) {
      normalized += '?' + queryString
    }

    return normalized
  } catch {
    return url
  }
}

export interface CrawlResult {
  urls: string[]
  fromSitemap: number
  fromCrawl: number
}

// Termos que indicam que a página ainda está carregando
const LOADING_INDICATORS = [
  'carregando', 'loading', 'aguarde', 'please wait', 'cargando',
  'chargement', 'laden', '読み込み中', '加载中'
]

/**
 * Verifica se o título indica estado de loading
 */
function isLoadingState(title: string): boolean {
  const titleLower = title.toLowerCase()
  return LOADING_INDICATORS.some(indicator => titleLower.includes(indicator))
}

/**
 * Cria um tracker de requisições para monitorar network
 * IMPORTANTE: Deve ser chamado ANTES de page.goto()
 */
function createRequestTracker(page: Page) {
  let pendingRequests = 0
  const activeRequests = new Set<string>()

  const onRequest = (request: { url: () => string; resourceType: () => string }) => {
    const type = request.resourceType()
    // Rastrear XHR, Fetch e Document (navegação)
    if (type === 'xhr' || type === 'fetch' || type === 'document') {
      const url = request.url()
      activeRequests.add(url)
      pendingRequests++
    }
  }

  const onRequestDone = (requestOrResponse: { url: () => string }) => {
    const url = requestOrResponse.url()
    if (activeRequests.has(url)) {
      activeRequests.delete(url)
      pendingRequests = Math.max(0, pendingRequests - 1)
    }
  }

  // Adicionar listeners imediatamente
  page.on('request', onRequest)
  page.on('response', onRequestDone)
  page.on('requestfailed', onRequestDone)

  return {
    getPendingCount: () => pendingRequests,
    getPendingUrls: () => Array.from(activeRequests),
    cleanup: () => {
      page.off('request', onRequest)
      page.off('response', onRequestDone)
      page.off('requestfailed', onRequestDone)
    }
  }
}

/**
 * Espera a página estabilizar de forma universal (funciona para qualquer site, incluindo SPAs)
 *
 * Princípio: Não importa O QUE está na página, importa que PAROU de mudar E não está em loading state.
 *
 * Estratégia:
 * 1. Usa tracker de requisições que foi iniciado ANTES do goto()
 * 2. Espera até não ter requisições pendentes
 * 3. Confirma que o DOM parou de mudar
 * 4. Verifica se título não indica "loading" state
 */
async function waitForPageStable(
  page: Page,
  requestTracker: { getPendingCount: () => number; getPendingUrls: () => string[] },
  options: { maxWait?: number; checkInterval?: number; stableChecks?: number } = {}
): Promise<void> {
  const { maxWait = 60000, checkInterval = 300, stableChecks = 3 } = options

  const startTime = Date.now()
  let lastElementCount = 0
  let lastContentLength = 0
  let lastTitle = ''
  let stableCount = 0
  let networkIdleCount = 0
  // Rastrear última variação para debug
  let lastDeltaElements = 0
  let lastDeltaContent = 0

  while (Date.now() - startTime < maxWait) {
    // Capturar estado atual do DOM
    const state = await page.evaluate(() => ({
      elements: document.querySelectorAll('*').length,
      contentLength: document.body?.innerText?.length || 0,
      title: document.title,
      links: document.querySelectorAll('a[href]').length,
    }))

    const pendingRequests = requestTracker.getPendingCount()

    // Verificar se network está idle (sem requisições pendentes)
    if (pendingRequests === 0) {
      networkIdleCount++
    } else {
      networkIdleCount = 0
    }

    // Verificar se DOM estabilizou (elementos, conteúdo E título pararam de mudar)
    const domStable = state.elements === lastElementCount &&
      state.contentLength === lastContentLength &&
      state.title === lastTitle

    if (domStable) {
      stableCount++
    } else {
      // Rastrear a variação para debug
      lastDeltaElements = state.elements - lastElementCount
      lastDeltaContent = state.contentLength - lastContentLength
      stableCount = 0
      lastElementCount = state.elements
      lastContentLength = state.contentLength
      lastTitle = state.title
    }

    // Verificar se ainda está em loading state
    const stillLoading = isLoadingState(state.title)

    // Página pronta quando:
    // - Network idle por 2+ checks (600ms sem requisições)
    // - E DOM estável por 3+ checks (900ms sem mudanças)
    // - E título NÃO indica loading state
    // OU
    // - DOM muito estável por 6+ checks (1.8s) mesmo com network ativa (polling/websocket)
    // - E título NÃO indica loading state
    const isReady = !stillLoading && (
      (networkIdleCount >= 2 && stableCount >= stableChecks) ||
      stableCount >= 6
    )

    if (isReady) {
      console.log(`[Crawler] Página pronta em ${Date.now() - startTime}ms (${state.elements} elementos, ${state.links} links, título: "${state.title}")`)
      return
    }

    // Se ainda em loading state, log para debug
    if (stillLoading && stableCount >= 2) {
      console.log(`[Crawler] Aguardando SPA carregar... (título: "${state.title}", ${pendingRequests} requests pendentes)`)
    }

    await page.waitForTimeout(checkInterval)
  }

  // Timeout - log estado final com motivo detalhado
  const finalState = await page.evaluate(() => ({
    title: document.title,
    elements: document.querySelectorAll('*').length,
    links: document.querySelectorAll('a[href]').length,
  }))
  const pendingRequests = requestTracker.getPendingCount()
  const stillLoading = isLoadingState(finalState.title)
  const currentUrl = page.url()

  // Determinar motivo do timeout
  const reasons: string[] = []
  if (stillLoading) {
    reasons.push(`título indica loading ("${finalState.title}")`)
  }
  if (pendingRequests > 0) {
    const pendingUrls = requestTracker.getPendingUrls()
    const urlsPreview = pendingUrls.slice(0, 3).map(u => {
      try {
        const parsed = new URL(u)
        return parsed.pathname.slice(0, 50) + (parsed.pathname.length > 50 ? '...' : '')
      } catch {
        return u.slice(0, 50)
      }
    }).join(', ')
    const moreCount = pendingUrls.length > 3 ? ` (+${pendingUrls.length - 3} mais)` : ''
    reasons.push(`${pendingRequests} requisições pendentes: [${urlsPreview}]${moreCount}`)
  }
  if (stableCount < stableChecks) {
    const deltaInfo = lastDeltaElements !== 0 || lastDeltaContent !== 0
      ? ` (última variação: ${lastDeltaElements >= 0 ? '+' : ''}${lastDeltaElements} elementos, ${lastDeltaContent >= 0 ? '+' : ''}${lastDeltaContent} chars)`
      : ''
    reasons.push(`DOM instável (${stableCount}/${stableChecks} checks estáveis)${deltaInfo}`)
  }
  if (networkIdleCount < 2) {
    reasons.push(`network não idle (${networkIdleCount}/2 checks)`)
  }

  const reasonStr = reasons.length > 0 ? ` - Motivo: ${reasons.join(', ')}` : ' - Página parece pronta mas timeout foi atingido'

  console.warn(`[Crawler] Timeout após ${maxWait}ms em ${currentUrl} (${finalState.elements} elementos, ${finalState.links} links)${reasonStr}`)
}

export interface SubdomainConfig {
  policy: SubdomainPolicy
  allowedSubdomains?: string[] | null
}

export interface CrawlerOptions {
  maxPages: number
  maxDepth?: number
  timeout?: number
  authConfig?: AuthConfig | null
  subdomainConfig?: SubdomainConfig
}

/**
 * Crawls a website starting from baseUrl to discover all pages
 */
export async function crawlWebsite(
  baseUrl: string,
  options: CrawlerOptions
): Promise<CrawlResult> {
  const { maxPages, maxDepth = 3, timeout = 30000, authConfig, subdomainConfig } = options

  const visited = new Set<string>()
  const toVisit: Array<{ url: string; depth: number }> = []
  const discovered: string[] = []

  let fromSitemap = 0
  let fromCrawl = 0

  // Build auth headers
  const authHeaders: Record<string, string> = {}
  if (authConfig?.type === 'bearer' && authConfig.token) {
    authHeaders['Authorization'] = `Bearer ${authConfig.token}`
    console.log(`[Crawler] Using Bearer token authentication`)
  }

  // Normalizar URL base
  const base = new URL(baseUrl)
  const baseOrigin = base.origin

  // 1. Tentar descobrir URLs do sitemap primeiro
  const sitemapUrls = await fetchSitemap(baseUrl, authHeaders)
  for (const url of sitemapUrls) {
    if (discovered.length >= maxPages) break
    const normalized = normalizeUrl(url)
    if (!visited.has(normalized)) {
      visited.add(normalized)
      discovered.push(normalized)
      fromSitemap++
    }
  }

  // 2. Se não encontrou suficiente no sitemap, fazer crawl
  if (discovered.length < maxPages) {
    const normalizedBase = normalizeUrl(baseUrl)
    toVisit.push({ url: normalizedBase, depth: 0 })

    let browser: Browser | null = null

    try {
      // Usar headless: 'new' para novo modo headless (menos detectável)
      // Adicionar args para esconder características de headless
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      })
      const context = await browser.newContext({
        // User-Agent real de Chrome para evitar bloqueio de bots
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders: authHeaders,
        // Esconder webdriver
        bypassCSP: true,
      })

      // Injetar cookies se configurado
      if (authConfig?.type === 'cookie' && authConfig.cookies) {
        const isSecure = base.protocol === 'https:'
        const cookiePairs = authConfig.cookies.split(';').map(c => c.trim()).filter(Boolean)
        const cookiesToSet = cookiePairs.map(pair => {
          const eqIndex = pair.indexOf('=')
          const name = pair.substring(0, eqIndex).trim()
          const value = pair.substring(eqIndex + 1).trim()
          return {
            name,
            value,
            domain: base.hostname,
            path: '/',
            secure: isSecure,
            sameSite: 'Lax' as const,
          }
        })
        await context.addCookies(cookiesToSet)
        console.log(`[Crawler] Injected ${cookiesToSet.length} cookies (secure: ${isSecure})`)
      }

      while (toVisit.length > 0 && discovered.length < maxPages) {
        const { url, depth } = toVisit.shift()!
        const normalizedUrl = normalizeUrl(url)

        if (visited.has(normalizedUrl) || depth > maxDepth) continue
        visited.add(normalizedUrl)

        let page: Page | null = null
        let requestTracker: ReturnType<typeof createRequestTracker> | null = null

        try {
          page = await context.newPage()

          // IMPORTANTE: Criar tracker de requests ANTES do goto() para capturar todas as requisições
          requestTracker = createRequestTracker(page)

          // Capturar erros do console e requests que falham
          page.on('console', msg => {
            if (msg.type() === 'error') {
              console.log(`[Crawler] Console Error: ${msg.text()}`)
            }
          })
          page.on('requestfailed', request => {
            console.log(`[Crawler] Request Failed: ${request.url()} - ${request.failure()?.errorText}`)
          })
          page.on('response', response => {
            if (response.status() >= 400) {
              console.log(`[Crawler] HTTP ${response.status()}: ${response.url()}`)
            }
          })

          const response = await page.goto(normalizedUrl, { timeout, waitUntil: 'domcontentloaded' })

          // Log do status HTTP
          const status = response?.status() || 0
          const finalUrl = page.url()
          const pageTitle = await page.title()
          console.log(`[Crawler] HTTP ${status} - ${normalizedUrl}${finalUrl !== normalizedUrl ? ` -> ${finalUrl}` : ''}`)
          console.log(`[Crawler] Título: "${pageTitle}"`)

          // Esperar página estabilizar (adapta ao tempo real de carregamento)
          // Usa o tracker que foi criado ANTES do goto()
          await waitForPageStable(page, requestTracker)

          // Adicionar à lista de descobertos
          if (!discovered.includes(normalizedUrl)) {
            discovered.push(normalizedUrl)
            fromCrawl++
            console.log(`[Crawler] Descoberto: ${normalizedUrl} (depth: ${depth})`)
          }

          // Extrair links da página
          if (depth < maxDepth) {
            const links = await extractLinks(page, baseOrigin, subdomainConfig)
            console.log(`[Crawler] Encontrados ${links.length} links em ${normalizedUrl}`)
            for (const link of links) {
              const normalizedLink = normalizeUrl(link)
              if (!visited.has(normalizedLink) && discovered.length < maxPages) {
                toVisit.push({ url: normalizedLink, depth: depth + 1 })
              }
            }
          }
        } catch (error) {
          console.error(`Erro ao crawlear ${normalizedUrl}:`, error)
        } finally {
          // SEMPRE limpa listeners e fecha página, mesmo com erro
          if (requestTracker) {
            requestTracker.cleanup()
          }
          if (page) {
            await page.close().catch(err => console.error(`[Crawler] Error closing page:`, err))
          }
        }
      }
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  return {
    urls: discovered,
    fromSitemap,
    fromCrawl,
  }
}

/**
 * Fetches URLs from sitemap.xml
 */
async function fetchSitemap(
  baseUrl: string,
  authHeaders: Record<string, string> = {}
): Promise<string[]> {
  const urls: string[] = []
  const base = new URL(baseUrl)

  const sitemapUrls = [
    `${base.origin}/sitemap.xml`,
    `${base.origin}/sitemap_index.xml`,
    `${base.origin}/sitemap/sitemap.xml`,
  ]

  for (const sitemapUrl of sitemapUrls) {
    try {
      const response = await fetch(sitemapUrl, {
        headers: {
          'User-Agent': 'AccessibilityAuditBot/1.0',
          ...authHeaders,
        },
      })

      if (!response.ok) continue

      const text = await response.text()

      // Extrair URLs do XML (regex simples para <loc>)
      const locRegex = /<loc>(.*?)<\/loc>/g
      let match
      while ((match = locRegex.exec(text)) !== null) {
        const url = match[1].trim()
        // Verificar se é do mesmo domínio
        if (url.startsWith(base.origin)) {
          urls.push(url)
        }
      }

      if (urls.length > 0) break
    } catch {
      // Sitemap não encontrado, continuar
    }
  }

  return urls
}

/**
 * Extrai o domínio base (sem www e subdomínios comuns)
 * Ex: www.b3.com.br -> b3.com.br
 *     api.b3.com.br -> b3.com.br
 */
function getBaseDomain(hostname: string): string {
  // Remover www. e outros prefixos comuns
  const cleaned = hostname.replace(/^(www\.|m\.|mobile\.|api\.|cdn\.|static\.|assets\.)/, '')
  return cleaned.toLowerCase()
}

/**
 * Extracts internal links from a page
 * NOTA: Usamos string template para evitar que o bundler do Trigger.dev
 * adicione helpers como "__name" que não existem no contexto do browser
 */
async function extractLinks(page: Page, baseOrigin: string, subdomainConfig?: SubdomainConfig): Promise<string[]> {
  // Extrair hostname base para comparação
  const baseHostname = new URL(baseOrigin).hostname
  const baseDomain = getBaseDomain(baseHostname)

  // Preparar configuração de subdomínios para o browser
  const policy = subdomainConfig?.policy || 'main_only'
  const allowedSubdomains = subdomainConfig?.allowedSubdomains || []
  const allowedSubdomainsJson = JSON.stringify(allowedSubdomains)

  const extractLinksCode = `
    (function(baseDomain, policy, allowedSubdomains) {
      var anchors = document.querySelectorAll('a[href]');
      var urls = [];

      // Estatísticas para debug
      var total = 0;
      var emptyHref = 0;
      var hashOnly = 0;
      var externalDomain = 0;
      var blockedSubdomain = 0;
      var staticFile = 0;
      var valid = 0;
      var externalSamples = [];

      // Função para extrair domínio base (sem www, etc)
      var getBaseDomainInner = function(hostname) {
        return hostname.replace(/^(www\\.|m\\.|mobile\\.|api\\.|cdn\\.|static\\.|assets\\.)/, '').toLowerCase();
      };

      // Função para extrair subdomínio
      var getSubdomain = function(hostname, baseDom) {
        var hostLower = hostname.toLowerCase();
        // Se o hostname termina com o domínio base
        if (hostLower === baseDom || hostLower === 'www.' + baseDom) {
          return null; // É o domínio principal
        }
        // Extrair subdomínio
        var suffix = '.' + baseDom;
        if (hostLower.endsWith(suffix)) {
          return hostLower.slice(0, -suffix.length);
        }
        return null;
      };

      // Função para verificar se link é permitido pela política
      var isLinkAllowed = function(hostname, baseDom) {
        var linkDomain = getBaseDomainInner(hostname);

        // Domínio completamente diferente - sempre bloquear
        if (linkDomain !== baseDom) {
          return { allowed: false, reason: 'external' };
        }

        // Extrair subdomínio do link
        var subdomain = getSubdomain(hostname, baseDom);

        // Se é domínio principal ou www, sempre permitido
        if (subdomain === null || subdomain === 'www' || subdomain === 'm' || subdomain === 'mobile') {
          return { allowed: true, reason: 'main' };
        }

        // Aplicar política
        if (policy === 'main_only') {
          return { allowed: false, reason: 'subdomain_blocked' };
        }

        if (policy === 'all_subdomains') {
          return { allowed: true, reason: 'all_allowed' };
        }

        if (policy === 'specific') {
          // Verificar se subdomínio está na lista permitida
          if (allowedSubdomains.indexOf(subdomain) !== -1) {
            return { allowed: true, reason: 'in_allowlist' };
          }
          return { allowed: false, reason: 'not_in_allowlist' };
        }

        return { allowed: false, reason: 'unknown' };
      };

      anchors.forEach(function(anchor) {
        total++;
        try {
          var href = anchor.getAttribute('href');
          if (!href) {
            emptyHref++;
            return;
          }

          // Ignorar links que são apenas âncoras na mesma página (#section)
          if (href.startsWith('#')) {
            hashOnly++;
            return;
          }

          // Ignorar javascript: e mailto: links
          if (href.startsWith('javascript:') || href.startsWith('mailto:') || href.startsWith('tel:')) {
            emptyHref++;
            return;
          }

          // Resolver URL relativa
          var url = new URL(href, window.location.href);

          // Verificar se link é permitido pela política de subdomínios
          var check = isLinkAllowed(url.hostname, baseDomain);
          if (!check.allowed) {
            if (check.reason === 'external') {
              externalDomain++;
              if (externalSamples.length < 5) {
                externalSamples.push(url.hostname + ' (' + href.substring(0, 50) + ')');
              }
            } else {
              blockedSubdomain++;
            }
            return;
          }

          // Filtrar arquivos estáticos
          if (url.pathname.match(/\\.(pdf|zip|png|jpg|jpeg|gif|svg|css|js|ico|xml|json|woff|woff2|ttf|eot)$/i)) {
            staticFile++;
            return;
          }

          // URL válida - manter origin original e pathname
          var cleanUrl = url.origin + url.pathname;
          urls.push(cleanUrl);
          valid++;
        } catch (e) {
          // URL inválida - ignorar silenciosamente
        }
      });

      // Remover duplicatas
      var unique = urls.filter(function(url, index, self) {
        return self.indexOf(url) === index;
      });

      return {
        filtered: unique,
        stats: { total: total, emptyHref: emptyHref, hashOnly: hashOnly, externalDomain: externalDomain, blockedSubdomain: blockedSubdomain, staticFile: staticFile, valid: valid, unique: unique.length },
        externalSamples: externalSamples,
      };
    })('${baseDomain}', '${policy}', ${allowedSubdomainsJson})
  `

  const result = await page.evaluate(extractLinksCode) as {
    filtered: string[]
    stats: { total: number; emptyHref: number; hashOnly: number; externalDomain: number; blockedSubdomain: number; staticFile: number; valid: number; unique: number }
    externalSamples: string[]
  }

  console.log(`[Crawler] Link stats: total=${result.stats.total}, hashOnly=${result.stats.hashOnly}, external=${result.stats.externalDomain}, blockedSubdomain=${result.stats.blockedSubdomain}, staticFile=${result.stats.staticFile}, valid=${result.stats.valid}, unique=${result.stats.unique}`)
  console.log(`[Crawler] Subdomain policy: ${policy}${policy === 'specific' ? ` (allowed: ${allowedSubdomains.join(', ')})` : ''}`)

  if (result.externalSamples.length > 0) {
    console.log(`[Crawler] External samples: ${result.externalSamples.join(', ')}`)
  }

  return result.filtered
}

/**
 * Extracts the path from a URL
 */
export function getPathFromUrl(url: string, baseUrl: string): string {
  try {
    const urlObj = new URL(url)
    const baseObj = new URL(baseUrl)

    if (urlObj.origin !== baseObj.origin) {
      return url
    }

    return urlObj.pathname || '/'
  } catch {
    return '/'
  }
}

// ============================================
// DISCOVERY FUNCTIONS (para auditoria iterativa)
// ============================================

export interface DiscoveryOptions {
  targetCount: number           // Quantidade desejada de URLs
  margin?: number               // Margem extra (padrão: 1.5 = 50% a mais)
  maxDepth?: number             // Profundidade máxima de crawl
  timeout?: number              // Timeout por página
  authConfig?: AuthConfig | null
  subdomainConfig?: SubdomainConfig
}

export interface DiscoveryResult {
  urls: string[]                // URLs descobertas
  fromSitemap: number           // Quantas vieram do sitemap
  fromCrawl: number             // Quantas vieram do crawl
  pagesVisited: number          // Páginas visitadas para descobrir
}

/**
 * Descobre URLs iniciais até atingir targetCount * margin
 *
 * Estratégia:
 * 1. Buscar no sitemap primeiro (rápido, sem browser)
 * 2. Se não suficiente, abrir browser e crawlear
 * 3. Parar assim que atingir a quantidade alvo + margem
 */
export async function discoverInitialUrls(
  baseUrl: string,
  options: DiscoveryOptions
): Promise<DiscoveryResult> {
  const {
    targetCount,
    margin = 1.5,
    maxDepth = 3,
    timeout = 30000,
    authConfig,
    subdomainConfig
  } = options

  const targetWithMargin = Math.ceil(targetCount * margin)
  const visited = new Set<string>()
  const discovered: string[] = []
  const toVisit: Array<{ url: string; depth: number }> = []

  let fromSitemap = 0
  let fromCrawl = 0
  let pagesVisited = 0

  // Build auth headers
  const authHeaders: Record<string, string> = {}
  if (authConfig?.type === 'bearer' && authConfig.token) {
    authHeaders['Authorization'] = `Bearer ${authConfig.token}`
    console.log(`[Discovery] Using Bearer token authentication`)
  }

  // Normalizar URL base
  const base = new URL(baseUrl)
  const baseOrigin = base.origin
  const normalizedBase = normalizeUrl(baseUrl)

  console.log(`[Discovery] Target: ${targetCount} páginas, buscando ${targetWithMargin} candidatos (margem ${margin}x)`)

  // 1. Buscar no sitemap primeiro (rápido)
  const sitemapUrls = await fetchSitemap(baseUrl, authHeaders)
  for (const url of sitemapUrls) {
    if (discovered.length >= targetWithMargin) break
    const normalized = normalizeUrl(url)
    if (!visited.has(normalized)) {
      visited.add(normalized)
      discovered.push(normalized)
      fromSitemap++
    }
  }

  console.log(`[Discovery] Sitemap: ${fromSitemap} URLs encontradas`)

  // Se já temos suficiente do sitemap, retornar
  if (discovered.length >= targetWithMargin) {
    console.log(`[Discovery] Completo via sitemap: ${discovered.length} URLs`)
    return { urls: discovered, fromSitemap, fromCrawl, pagesVisited }
  }

  // 2. Crawlear para encontrar mais URLs
  // Adicionar URL base à fila se ainda não descoberta
  if (!visited.has(normalizedBase)) {
    toVisit.push({ url: normalizedBase, depth: 0 })
  }

  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: authHeaders,
      bypassCSP: true,
    })

    // Injetar cookies se configurado
    if (authConfig?.type === 'cookie' && authConfig.cookies) {
      const isSecure = base.protocol === 'https:'
      const cookiePairs = authConfig.cookies.split(';').map(c => c.trim()).filter(Boolean)
      const cookiesToSet = cookiePairs.map(pair => {
        const eqIndex = pair.indexOf('=')
        const name = pair.substring(0, eqIndex).trim()
        const value = pair.substring(eqIndex + 1).trim()
        return {
          name,
          value,
          domain: base.hostname,
          path: '/',
          secure: isSecure,
          sameSite: 'Lax' as const,
        }
      })
      await context.addCookies(cookiesToSet)
      console.log(`[Discovery] Injected ${cookiesToSet.length} cookies`)
    }

    while (toVisit.length > 0 && discovered.length < targetWithMargin) {
      const { url, depth } = toVisit.shift()!
      const normalizedUrl = normalizeUrl(url)

      if (visited.has(normalizedUrl) || depth > maxDepth) continue
      visited.add(normalizedUrl)

      let page: Page | null = null
      let requestTracker: ReturnType<typeof createRequestTracker> | null = null

      try {
        page = await context.newPage()
        requestTracker = createRequestTracker(page)
        pagesVisited++

        const response = await page.goto(normalizedUrl, { timeout, waitUntil: 'domcontentloaded' })
        const status = response?.status() || 0

        console.log(`[Discovery] HTTP ${status} - ${normalizedUrl}`)

        // Se página com erro, pular
        if (status >= 400) {
          console.log(`[Discovery] Pulando página com erro: ${normalizedUrl}`)
          continue
        }

        // Esperar página estabilizar
        await waitForPageStable(page, requestTracker, { maxWait: 30000 })

        // Adicionar à lista de descobertos se não estiver
        if (!discovered.includes(normalizedUrl)) {
          discovered.push(normalizedUrl)
          fromCrawl++
          console.log(`[Discovery] Descoberto: ${normalizedUrl} (total: ${discovered.length}/${targetWithMargin})`)
        }

        // Extrair links para mais candidatos
        if (depth < maxDepth && discovered.length < targetWithMargin) {
          const links = await extractLinks(page, baseOrigin, subdomainConfig)
          console.log(`[Discovery] ${links.length} links encontrados em ${normalizedUrl}`)

          for (const link of links) {
            const normalizedLink = normalizeUrl(link)
            if (!visited.has(normalizedLink)) {
              // Adicionar como candidato se ainda não descoberto
              if (!discovered.includes(normalizedLink)) {
                discovered.push(normalizedLink)
                fromCrawl++

                // Se atingiu o alvo, parar
                if (discovered.length >= targetWithMargin) {
                  console.log(`[Discovery] Target atingido: ${discovered.length} URLs`)
                  break
                }
              }
              // Ainda assim adicionar à fila para explorar mais
              toVisit.push({ url: normalizedLink, depth: depth + 1 })
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[Discovery] Erro ao visitar ${normalizedUrl}:`, errorMessage)
      } finally {
        if (requestTracker) requestTracker.cleanup()
        if (page) await page.close().catch(() => {})
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }

  console.log(`[Discovery] Completo: ${discovered.length} URLs (sitemap: ${fromSitemap}, crawl: ${fromCrawl}, páginas visitadas: ${pagesVisited})`)

  return { urls: discovered, fromSitemap, fromCrawl, pagesVisited }
}

/**
 * Extrai links de uma página já aberta
 * Exportada para uso pelo auditor durante auditoria iterativa
 */
export async function extractLinksFromPage(
  page: Page,
  baseUrl: string,
  subdomainConfig?: SubdomainConfig
): Promise<string[]> {
  const base = new URL(baseUrl)
  const baseOrigin = base.origin
  return extractLinks(page, baseOrigin, subdomainConfig)
}

/**
 * Re-exportar funções auxiliares para uso externo
 */
export { createRequestTracker, waitForPageStable }

// ============================================
// NOVAS FUNÇÕES DE DISCOVERY (para discoveryMethod)
// ============================================

export interface SitemapDiscoveryOptions {
  maxPages: number
  authConfig?: AuthConfig | null
}

export interface SitemapDiscoveryResult {
  urls: string[]
  fromSitemap: number
}

/**
 * Descobre URLs de um sitemap específico fornecido pelo usuário
 * Diferente de fetchSitemap que tenta adivinhar a URL do sitemap
 */
export async function discoverFromSitemap(
  sitemapUrl: string,
  options: SitemapDiscoveryOptions
): Promise<SitemapDiscoveryResult> {
  const { maxPages, authConfig } = options
  const urls: string[] = []

  // Build auth headers
  const authHeaders: Record<string, string> = {}
  if (authConfig?.type === 'bearer' && authConfig.token) {
    authHeaders['Authorization'] = `Bearer ${authConfig.token}`
    console.log(`[SitemapDiscovery] Using Bearer token authentication`)
  }

  console.log(`[SitemapDiscovery] Fetching sitemap from: ${sitemapUrl}`)

  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        'User-Agent': 'AccessibilityAuditBot/1.0',
        ...authHeaders,
      },
    })

    if (!response.ok) {
      console.error(`[SitemapDiscovery] Failed to fetch sitemap: HTTP ${response.status}`)
      return { urls: [], fromSitemap: 0 }
    }

    const text = await response.text()

    // Extrair URLs do XML (regex simples para <loc>)
    const locRegex = /<loc>(.*?)<\/loc>/g
    let match
    while ((match = locRegex.exec(text)) !== null && urls.length < maxPages) {
      const url = match[1].trim()
      const normalized = normalizeUrl(url)
      if (!urls.includes(normalized)) {
        urls.push(normalized)
      }
    }

    console.log(`[SitemapDiscovery] Found ${urls.length} URLs (max: ${maxPages})`)
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(`[SitemapDiscovery] Error fetching sitemap:`, errorMessage)
  }

  return { urls, fromSitemap: urls.length }
}

export interface PathScopedDiscoveryOptions {
  maxPages: number
  depth: 1 | 2 | 3
  excludePaths: string[]
  margin?: number
  timeout?: number
  authConfig?: AuthConfig | null
  subdomainConfig?: SubdomainConfig
}

export interface PathScopedDiscoveryResult {
  urls: string[]
  fromCrawl: number
  pagesVisited: number
}

/**
 * Verifica se uma URL está dentro do escopo do path base
 * Ex: se startUrl = "https://example.com/blog/posts/"
 *     então "/blog/posts/article-1" está dentro do escopo
 *     mas "/about" não está
 */
function isWithinPathScope(url: string, basePath: string): boolean {
  try {
    const urlPath = new URL(url).pathname
    // Normalizar paths (remover trailing slash para comparação)
    const normalizedUrlPath = urlPath.endsWith('/') && urlPath.length > 1
      ? urlPath.slice(0, -1)
      : urlPath
    const normalizedBasePath = basePath.endsWith('/') && basePath.length > 1
      ? basePath.slice(0, -1)
      : basePath

    // URL está no escopo se começa com o basePath
    return normalizedUrlPath.startsWith(normalizedBasePath)
  } catch {
    return false
  }
}

/**
 * Verifica se uma URL corresponde a algum padrão de exclusão
 * Suporta wildcards simples: /admin/* exclui tudo dentro de /admin/
 */
function matchesExcludePath(urlPath: string, excludePatterns: string[]): boolean {
  for (const pattern of excludePatterns) {
    // Converter padrão glob simples para regex
    // /admin/* -> ^/admin/.*
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special chars
      .replace(/\*/g, '.*') // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`)
    if (regex.test(urlPath)) {
      return true
    }
  }
  return false
}

/**
 * Descobre URLs com escopo de path
 * - Começa de startUrl e só segue links dentro desse path
 * - depth é relativo ao startUrl (0 = página inicial, 1 = links dela, etc)
 * - excludePaths permite excluir certos caminhos (ex: /admin/*)
 */
export async function discoverWithPathScope(
  startUrl: string,
  options: PathScopedDiscoveryOptions
): Promise<PathScopedDiscoveryResult> {
  const {
    maxPages,
    depth,
    excludePaths,
    margin = 1.5,
    timeout = 30000,
    authConfig,
    subdomainConfig
  } = options

  const targetWithMargin = Math.ceil(maxPages * margin)
  const visited = new Set<string>()
  const discovered: string[] = []
  const toVisit: Array<{ url: string; depth: number }> = []

  let pagesVisited = 0

  // Build auth headers
  const authHeaders: Record<string, string> = {}
  if (authConfig?.type === 'bearer' && authConfig.token) {
    authHeaders['Authorization'] = `Bearer ${authConfig.token}`
    console.log(`[PathScopedCrawl] Using Bearer token authentication`)
  }

  // Extrair informações da URL inicial
  const startUrlObj = new URL(startUrl)
  const baseOrigin = startUrlObj.origin
  const basePath = startUrlObj.pathname

  const normalizedStart = normalizeUrl(startUrl)
  toVisit.push({ url: normalizedStart, depth: 0 })

  console.log(`[PathScopedCrawl] Starting from: ${startUrl}`)
  console.log(`[PathScopedCrawl] Path scope: ${basePath}`)
  console.log(`[PathScopedCrawl] Max depth: ${depth}`)
  console.log(`[PathScopedCrawl] Exclude paths: ${excludePaths.join(', ') || 'none'}`)
  console.log(`[PathScopedCrawl] Target: ${maxPages} páginas, buscando ${targetWithMargin} candidatos`)

  let browser: Browser | null = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: authHeaders,
      bypassCSP: true,
    })

    // Injetar cookies se configurado
    if (authConfig?.type === 'cookie' && authConfig.cookies) {
      const isSecure = startUrlObj.protocol === 'https:'
      const cookiePairs = authConfig.cookies.split(';').map(c => c.trim()).filter(Boolean)
      const cookiesToSet = cookiePairs.map(pair => {
        const eqIndex = pair.indexOf('=')
        const name = pair.substring(0, eqIndex).trim()
        const value = pair.substring(eqIndex + 1).trim()
        return {
          name,
          value,
          domain: startUrlObj.hostname,
          path: '/',
          secure: isSecure,
          sameSite: 'Lax' as const,
        }
      })
      await context.addCookies(cookiesToSet)
      console.log(`[PathScopedCrawl] Injected ${cookiesToSet.length} cookies`)
    }

    while (toVisit.length > 0 && discovered.length < targetWithMargin) {
      const { url, depth: currentDepth } = toVisit.shift()!
      const normalizedUrl = normalizeUrl(url)

      // Pular se já visitado ou excede profundidade
      if (visited.has(normalizedUrl) || currentDepth > depth) continue

      // Verificar se está dentro do escopo de path
      if (!isWithinPathScope(normalizedUrl, basePath)) {
        console.log(`[PathScopedCrawl] Fora do escopo: ${normalizedUrl}`)
        continue
      }

      // Verificar se corresponde a um excludePath
      const urlPath = new URL(normalizedUrl).pathname
      if (matchesExcludePath(urlPath, excludePaths)) {
        console.log(`[PathScopedCrawl] Excluído por padrão: ${normalizedUrl}`)
        continue
      }

      visited.add(normalizedUrl)

      let page: Page | null = null
      let requestTracker: ReturnType<typeof createRequestTracker> | null = null

      try {
        page = await context.newPage()
        requestTracker = createRequestTracker(page)
        pagesVisited++

        const response = await page.goto(normalizedUrl, { timeout, waitUntil: 'domcontentloaded' })
        const status = response?.status() || 0

        console.log(`[PathScopedCrawl] HTTP ${status} - ${normalizedUrl} (depth: ${currentDepth})`)

        // Se página com erro, pular
        if (status >= 400) {
          console.log(`[PathScopedCrawl] Pulando página com erro: ${normalizedUrl}`)
          continue
        }

        // Esperar página estabilizar
        await waitForPageStable(page, requestTracker, { maxWait: 30000 })

        // Adicionar à lista de descobertos se não estiver
        if (!discovered.includes(normalizedUrl)) {
          discovered.push(normalizedUrl)
          console.log(`[PathScopedCrawl] Descoberto: ${normalizedUrl} (total: ${discovered.length}/${targetWithMargin})`)
        }

        // Extrair links para mais candidatos (se ainda não atingiu profundidade máxima)
        if (currentDepth < depth && discovered.length < targetWithMargin) {
          const links = await extractLinks(page, baseOrigin, subdomainConfig)
          console.log(`[PathScopedCrawl] ${links.length} links encontrados em ${normalizedUrl}`)

          for (const link of links) {
            const normalizedLink = normalizeUrl(link)

            // Verificar se está no escopo antes de adicionar
            if (!isWithinPathScope(normalizedLink, basePath)) {
              continue
            }

            // Verificar excludePaths
            const linkPath = new URL(normalizedLink).pathname
            if (matchesExcludePath(linkPath, excludePaths)) {
              continue
            }

            if (!visited.has(normalizedLink)) {
              // Adicionar como candidato se ainda não descoberto
              if (!discovered.includes(normalizedLink)) {
                discovered.push(normalizedLink)

                // Se atingiu o alvo, parar
                if (discovered.length >= targetWithMargin) {
                  console.log(`[PathScopedCrawl] Target atingido: ${discovered.length} URLs`)
                  break
                }
              }
              // Ainda assim adicionar à fila para explorar mais
              toVisit.push({ url: normalizedLink, depth: currentDepth + 1 })
            }
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error(`[PathScopedCrawl] Erro ao visitar ${normalizedUrl}:`, errorMessage)
      } finally {
        if (requestTracker) requestTracker.cleanup()
        if (page) await page.close().catch(() => {})
      }
    }
  } finally {
    if (browser) await browser.close().catch(() => {})
  }

  console.log(`[PathScopedCrawl] Completo: ${discovered.length} URLs (páginas visitadas: ${pagesVisited})`)

  return { urls: discovered, fromCrawl: discovered.length, pagesVisited }
}
