import { chromium, type Browser, type Page } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import type { ImpactLevel, AuthConfig, BrokenPageErrorType, ConfidenceLevel, ReviewReason, ConfidenceSignal } from '@/types'
import { getCustomViolations } from './custom-rules'
import { runWcagPartialRules } from './wcag-partial-rules'
import { ABNT_MAP } from './abnt-map'
import { extractLinksFromPage, type SubdomainConfig } from './crawler'
import { calculateConfidence, isExperimentalRule, type ElementContext } from './confidence'
import { filterFalsePositives } from './false-positive-filters'
import { isVisualRule } from './screenshot-rules'
import { captureScreenshotForRule, type ScreenshotResult } from './screenshot'

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
      console.log(`[Auditor] Página pronta em ${Date.now() - startTime}ms (${state.elements} elementos, ${state.links} links, título: "${state.title}")`)
      return
    }

    // Se ainda em loading state, log para debug
    if (stillLoading && stableCount >= 2) {
      console.log(`[Auditor] Aguardando SPA carregar... (título: "${state.title}", ${pendingRequests} requests pendentes)`)
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

  console.warn(`[Auditor] Timeout após ${maxWait}ms em ${currentUrl} (${finalState.elements} elementos, ${finalState.links} links)${reasonStr}`)
}

export interface AuditResult {
  url: string
  violations: ViolationResult[]
  loadTime: number
  screenshot?: Buffer
  error?: string
  errorType?: BrokenPageErrorType  // Tipo de erro para broken pages
  httpStatus?: number              // Status HTTP (para http_error)
  discoveredLinks?: string[]       // Links descobertos durante auditoria
  visualScreenshots?: Map<string, ScreenshotResult>  // Screenshots de regras visuais (1 por regra)
}

export interface ViolationResult {
  ruleId: string
  isCustomRule: boolean
  impact: ImpactLevel
  wcagLevel: string | null
  wcagVersion: string | null
  wcagCriteria: string[]
  wcagTags: string[]
  abntSection: string | null
  help: string
  description: string
  helpUrl: string | null
  selector: string
  fullPath: string | null  // Caminho CSS completo do elemento no DOM
  xpath: string | null     // XPath do elemento (mais estável para CSS-in-JS)
  html: string
  parentHtml: string | null
  failureSummary: string | null
  fingerprint: string
  // Confidence fields (Phase 1)
  confidenceLevel?: ConfidenceLevel
  confidenceScore?: number
  confidenceReason?: ReviewReason | null
  confidenceSignals?: ConfidenceSignal[]
  isExperimental?: boolean
}

export interface AuditorOptions {
  wcagLevels: string[]
  includeAbnt: boolean
  includeCoga?: boolean               // Incluir regras de acessibilidade cognitiva (COGA)
  includeWcagPartial?: boolean        // Incluir regras WCAG de detecção parcial
  timeout?: number
  takeScreenshot?: boolean
  authConfig?: AuthConfig | null
  extractLinks?: boolean              // Extrair links durante auditoria
  baseUrl?: string                    // URL base para extração de links
  subdomainConfig?: SubdomainConfig   // Configuração de subdomínios
}

/**
 * Injeta funções helper no contexto da página para uso pelos WCAG partial rules
 */
async function injectHelperFunctions(page: Page): Promise<void> {
  await page.evaluate(() => {
    // Função para obter seletor CSS de um elemento
    (window as unknown as Record<string, unknown>).getSelector = (el: Element): string => {
      if (el.id) return '#' + el.id
      const parts: string[] = []
      let current: Element | null = el
      while (current && current !== document.documentElement) {
        let part = current.tagName.toLowerCase()
        if (current.id) {
          parts.unshift('#' + current.id)
          break
        }
        const parentEl: Element | null = current.parentElement
        if (parentEl) {
          const siblings = Array.from(parentEl.children).filter((c: Element) => c.tagName === current!.tagName)
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1
            part += ':nth-of-type(' + index + ')'
          }
        }
        parts.unshift(part)
        current = parentEl
      }
      return parts.join(' > ')
    }

    // Função para obter XPath de um elemento
    (window as unknown as Record<string, unknown>).getXPath = (el: Element): string => {
      const parts: string[] = []
      let current: Element | null = el
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1
        let prevSibling = current.previousElementSibling
        while (prevSibling) {
          if (prevSibling.tagName === current.tagName) index++
          prevSibling = prevSibling.previousElementSibling
        }
        const tagName = current.tagName.toLowerCase()
        let hasMultipleSiblings = false
        let checkSibling: Element | null = current.parentElement?.firstElementChild || null
        while (checkSibling) {
          if (checkSibling !== current && checkSibling.tagName === current.tagName) {
            hasMultipleSiblings = true
            break
          }
          checkSibling = checkSibling.nextElementSibling
        }
        const part = hasMultipleSiblings ? tagName + '[' + index + ']' : tagName
        parts.unshift(part)
        current = current.parentElement
      }
      return '/' + parts.join('/')
    }
  })
}

/**
 * Runs accessibility audit on a single page
 */
export async function auditPage(
  url: string,
  options: AuditorOptions
): Promise<AuditResult> {
  const {
    wcagLevels,
    includeAbnt,
    includeCoga = false,
    includeWcagPartial = false,
    timeout = 60000,
    takeScreenshot = false,
    authConfig,
    extractLinks = false,
    baseUrl,
    subdomainConfig
  } = options

  let browser: Browser | null = null
  const startTime = Date.now()

  try {
    // Usar args para esconder características de headless
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })

    // Build extra HTTP headers based on auth config
    const extraHTTPHeaders: Record<string, string> = {}
    if (authConfig?.type === 'bearer' && authConfig.token) {
      extraHTTPHeaders['Authorization'] = `Bearer ${authConfig.token}`
      console.log(`[Auditor] Using Bearer token authentication`)
    }

    const context = await browser.newContext({
      // User-Agent real de Chrome para evitar bloqueio de bots
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders,
      // Esconder webdriver
      bypassCSP: true,
    })

    // Injetar cookies se configurado
    if (authConfig?.type === 'cookie' && authConfig.cookies) {
      const baseUrl = new URL(url)
      const isSecure = baseUrl.protocol === 'https:'
      const cookiePairs = authConfig.cookies.split(';').map(c => c.trim()).filter(Boolean)
      const cookiesToSet = cookiePairs.map(pair => {
        const eqIndex = pair.indexOf('=')
        const name = pair.substring(0, eqIndex).trim()
        const value = pair.substring(eqIndex + 1).trim()
        return {
          name,
          value,
          domain: baseUrl.hostname,
          path: '/',
          secure: isSecure,
          sameSite: 'Lax' as const,
        }
      })
      await context.addCookies(cookiesToSet)
      console.log(`[Auditor] Injected ${cookiesToSet.length} cookies (secure: ${isSecure})`)
    }

    const page = await context.newPage()

    // IMPORTANTE: Criar tracker de requests ANTES do goto() para capturar todas as requisições do SPA
    const requestTracker = createRequestTracker(page)

    let response
    try {
      // Usar 'domcontentloaded' em vez de 'networkidle' para ser mais rápido
      response = await page.goto(url, { timeout, waitUntil: 'domcontentloaded' })
      // Esperar página estabilizar (SPAs precisam de tempo para renderizar)
      await waitForPageStable(page, requestTracker)
    } finally {
      // SEMPRE limpar listeners do tracker, mesmo com erro
      requestTracker.cleanup()
    }

    const loadTime = Date.now() - startTime
    const httpStatus = response?.status() || 0

    // Verificar se a página retornou erro HTTP (4xx, 5xx)
    if (httpStatus >= 400) {
      console.error(`[Auditor] HTTP ${httpStatus} error for ${url}`)
      await browser.close()
      return {
        url,
        violations: [],
        loadTime,
        error: `HTTP ${httpStatus}`,
        errorType: 'http_error',
        httpStatus,
      }
    }

    // Configurar tags WCAG para axe
    const wcagTags = buildWcagTags(wcagLevels)

    // Rodar axe-core usando @axe-core/playwright (forma correta)
    console.log(`[Auditor] Running axe-core with tags: ${wcagTags.join(', ')}`)

    const axeResults = await new AxeBuilder({ page })
      .withTags(wcagTags)
      .analyze()

    // Enriquecer resultados com fullPath e xpath para cada elemento
    // (executado separadamente após o axe para manter o código limpo)
    for (const violation of axeResults.violations) {
      for (const node of violation.nodes) {
        try {
          const selector = node.target.join(' ')
          const paths = await page.evaluate((sel: string) => {
            const element = document.querySelector(sel)
            if (!element) return { fullPath: null, xpath: null }

            // getFullPath: CSS path com classes
            const getFullPath = (el: Element): string => {
              const parts: string[] = []
              let current: Element | null = el
              while (current && current !== document.documentElement) {
                let part = current.tagName.toLowerCase()
                if (current.id) {
                  part = '#' + current.id
                  parts.unshift(part)
                  break
                }
                const classes = Array.from(current.classList).slice(0, 3).join('.')
                if (classes) part += '.' + classes
                parts.unshift(part)
                current = current.parentElement
              }
              return parts.join(' > ')
            }

            // getXPath: XPath com índices
            const getXPath = (el: Element): string => {
              const parts: string[] = []
              let current: Element | null = el
              while (current && current.nodeType === Node.ELEMENT_NODE) {
                let index = 1
                let prevSibling = current.previousElementSibling
                while (prevSibling) {
                  if (prevSibling.tagName === current.tagName) index++
                  prevSibling = prevSibling.previousElementSibling
                }
                const tagName = current.tagName.toLowerCase()
                let hasMultipleSiblings = false
                let checkSibling: Element | null = current.parentElement?.firstElementChild || null
                while (checkSibling) {
                  if (checkSibling !== current && checkSibling.tagName === current.tagName) {
                    hasMultipleSiblings = true
                    break
                  }
                  checkSibling = checkSibling.nextElementSibling
                }
                const part = hasMultipleSiblings ? tagName + '[' + index + ']' : tagName
                parts.unshift(part)
                current = current.parentElement
              }
              return '/' + parts.join('/')
            }

            return { fullPath: getFullPath(element), xpath: getXPath(element) }
          }, selector)

          // Adicionar ao node (type assertion necessário pois axe-core não tem esses campos)
          ;(node as any).fullPath = paths.fullPath
          ;(node as any).xpath = paths.xpath
        } catch {
          ;(node as any).fullPath = null
          ;(node as any).xpath = null
        }
      }
    }

    // Cast para o tipo esperado pelo resto do código
    const typedAxeResults = axeResults as unknown as {
      violations: Array<{
        id: string
        impact: string
        tags: string[]
        help: string
        description: string
        helpUrl: string
        nodes: Array<{
          target: string[]
          html: string
          failureSummary: string
          fullPath?: string | null
          xpath?: string | null
        }>
      }>
    }

    console.log(`[Auditor] axe-core found ${typedAxeResults.violations.length} violation types`)

    // Converter violações do axe para nosso formato
    const violations: ViolationResult[] = []

    for (const violation of typedAxeResults.violations) {
      for (const node of violation.nodes) {
        violations.push({
          ruleId: violation.id,
          isCustomRule: false,
          impact: (violation.impact || 'moderate') as ImpactLevel,
          wcagLevel: extractWcagLevel(violation.tags),
          wcagVersion: extractWcagVersion(violation.tags),
          wcagCriteria: extractWcagCriteria(violation.tags),
          wcagTags: violation.tags,
          abntSection: includeAbnt ? mapToAbnt(violation.tags) : null,
          help: violation.help,
          description: violation.description,
          helpUrl: violation.helpUrl || null,
          selector: node.target.join(' '),
          fullPath: node.fullPath || null,
          xpath: node.xpath || null,
          html: node.html,
          parentHtml: null,
          failureSummary: node.failureSummary || null,
          fingerprint: generateFingerprint(violation.id, node.target.join(' ')),
        })
      }
    }

    // Adicionar regras customizadas brasileiras
    console.log(`[Auditor] Running custom Brazilian rules... (includeCoga: ${includeCoga})`)
    try {
      const customViolations = await getCustomViolations(page, { includeCoga })
      console.log(`[Auditor] Custom rules found ${customViolations.length} violations`)
      for (const cv of customViolations) {
        violations.push({
          ruleId: cv.ruleId,
          isCustomRule: true,
          impact: cv.impact,
          wcagLevel: cv.wcagLevel,
          wcagVersion: cv.wcagVersion,
          wcagCriteria: cv.wcagCriteria,
          wcagTags: cv.wcagTags,
          abntSection: cv.abntSection,
          help: cv.help,
          description: cv.description,
          helpUrl: cv.helpUrl,
          selector: cv.selector,
          fullPath: cv.fullPath,
          xpath: cv.xpath,
          html: cv.html,
          parentHtml: cv.parentHtml,
          failureSummary: cv.failureSummary,
          fingerprint: generateFingerprint(cv.ruleId, cv.selector),
        })
      }
    } catch (customError) {
      console.error(`[Auditor] Error running custom rules:`, customError)
    }

    // Adicionar regras WCAG de detecção parcial (se habilitado)
    if (includeWcagPartial) {
      console.log(`[Auditor] Running WCAG partial detection rules...`)
      try {
        // Injetar funções helper necessárias para as regras
        await injectHelperFunctions(page)

        const wcagPartialViolations = await runWcagPartialRules(page)
        console.log(`[Auditor] WCAG partial rules found ${wcagPartialViolations.length} potential issues`)

        for (const wpv of wcagPartialViolations) {
          violations.push({
            ruleId: wpv.ruleId,
            isCustomRule: true, // Marcamos como custom para diferenciação
            impact: wpv.impact,
            wcagLevel: wpv.wcagLevel,
            wcagVersion: '2.2', // Assumimos WCAG 2.2 para regras parciais
            wcagCriteria: [wpv.wcagSC],
            wcagTags: [`wcag${wpv.wcagSC.replace(/\./g, '')}`, `wcag2${wpv.wcagLevel.toLowerCase()}`],
            abntSection: includeAbnt ? mapToAbnt([`wcag${wpv.wcagSC.replace(/\./g, '')}`]) : null,
            help: wpv.messageKey, // Usamos messageKey como help (será traduzido na UI)
            description: wpv.messageKey, // Usamos messageKey como description
            helpUrl: `https://www.w3.org/WAI/WCAG22/Understanding/${wpv.wcagSC.replace(/\./g, '')}`,
            selector: wpv.element,
            fullPath: null, // Será preenchido se necessário
            xpath: wpv.xpath,
            html: wpv.html,
            parentHtml: null,
            failureSummary: wpv.messageParams ? JSON.stringify(wpv.messageParams) : null,
            fingerprint: generateFingerprint(wpv.ruleId, wpv.element),
          })
        }
      } catch (wcagPartialError) {
        console.error(`[Auditor] Error running WCAG partial rules:`, wcagPartialError)
      }
    }

    // Screenshot opcional
    let screenshot: Buffer | undefined
    if (takeScreenshot) {
      screenshot = await page.screenshot({ fullPage: true })
    }

    // Extrair links se solicitado
    let discoveredLinks: string[] | undefined
    if (extractLinks && baseUrl) {
      try {
        discoveredLinks = await extractLinksFromPage(page, baseUrl, subdomainConfig)
        console.log(`[Auditor] Extracted ${discoveredLinks.length} links from ${url}`)
      } catch (linkError) {
        console.error(`[Auditor] Error extracting links:`, linkError)
      }
    }

    // PHASE 1: Filter false positives
    const { violations: filteredViolations, filtered } = filterFalsePositives(violations)

    if (filtered.length > 0) {
      console.log(`[Auditor] Filtered ${filtered.length} likely false positives for ${url}`)
    }

    // PHASE 1: Enrich with confidence data
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

    // Capturar screenshots de violações visuais (1 por regra, do primeiro elemento)
    // O primeiro elemento será o mesmo mostrado no card de violação
    const visualScreenshots = new Map<string, ScreenshotResult>()

    // Agrupar violações por regra para pegar apenas o primeiro de cada
    const violationsByRule = new Map<string, ViolationResult>()
    for (const v of enrichedViolations) {
      if (!violationsByRule.has(v.ruleId)) {
        violationsByRule.set(v.ruleId, v)
      }
    }

    // Timeout total para captura de screenshots (previne race condition com browser.close)
    const SCREENSHOT_TIMEOUT_MS = 15000 // 15 segundos total para todos os screenshots
    const screenshotStartTime = Date.now()

    // Capturar screenshot apenas de regras visuais
    for (const [ruleId, violation] of violationsByRule) {
      if (isVisualRule(ruleId)) {
        // Verificar timeout antes de tentar captura
        const elapsed = Date.now() - screenshotStartTime
        if (elapsed > SCREENSHOT_TIMEOUT_MS) {
          console.warn(`[Auditor] Screenshot timeout reached (${elapsed}ms), skipping remaining rules`)
          break
        }

        // Verificar se browser ainda está conectado (previne race condition)
        if (!browser.isConnected()) {
          console.warn(`[Auditor] Browser disconnected, stopping screenshot capture`)
          break
        }

        try {
          // Usar XPath se disponível (mais estável), senão selector CSS
          const selectorToUse = violation.xpath || violation.selector
          const result = await captureScreenshotForRule(page, selectorToUse, ruleId)

          if (result) {
            visualScreenshots.set(ruleId, result)
            console.log(`[Auditor] Screenshot captured for ${ruleId} (${result.width}x${result.height})`)
          }
        } catch (screenshotError) {
          console.warn(`[Auditor] Failed to capture screenshot for ${ruleId}:`, screenshotError)
        }
      }
    }

    if (visualScreenshots.size > 0) {
      console.log(`[Auditor] Captured ${visualScreenshots.size} visual screenshots`)
    }

    await browser.close()

    console.log(`[Auditor] Total violations for ${url}: ${enrichedViolations.length} (${violations.length - enrichedViolations.length} filtered)`)
    return {
      url,
      violations: enrichedViolations,
      loadTime,
      screenshot,
      discoveredLinks,
      visualScreenshots,
    }
  } catch (error) {
    if (browser) {
      await browser.close()
    }

    // Classificar tipo de erro
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const { errorType, httpStatus } = classifyError(error)

    console.error(`[Auditor] Error auditing ${url} (${errorType}):`, errorMessage)
    return {
      url,
      violations: [],
      loadTime: Date.now() - startTime,
      error: errorMessage,
      errorType,
      httpStatus,
    }
  }
}

/**
 * Classifica o tipo de erro para broken pages
 * Exportada para uso pelo trigger/audit.ts
 */
export function classifyError(error: unknown): { errorType: BrokenPageErrorType; httpStatus?: number } {
  if (!(error instanceof Error)) {
    return { errorType: 'other' }
  }

  const message = error.message.toLowerCase()

  // Timeout errors
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('navigation timeout') ||
    message.includes('waiting for') && message.includes('exceeded')
  ) {
    return { errorType: 'timeout' }
  }

  // SSL/Certificate errors
  if (
    message.includes('ssl') ||
    message.includes('certificate') ||
    message.includes('cert_') ||
    message.includes('https') && message.includes('secure') ||
    message.includes('err_cert')
  ) {
    return { errorType: 'ssl_error' }
  }

  // Connection errors
  if (
    message.includes('econnrefused') ||
    message.includes('enotfound') ||
    message.includes('econnreset') ||
    message.includes('connection refused') ||
    message.includes('network') ||
    message.includes('dns') ||
    message.includes('unreachable') ||
    message.includes('err_connection') ||
    message.includes('net::err_')
  ) {
    return { errorType: 'connection_error' }
  }

  // HTTP errors - extract status code if available
  const httpMatch = message.match(/(\d{3})/) ||
    message.match(/http[s]?\s*(\d{3})/) ||
    message.match(/status[:\s]*(\d{3})/i)

  if (httpMatch) {
    const status = parseInt(httpMatch[1], 10)
    if (status >= 400 && status < 600) {
      return { errorType: 'http_error', httpStatus: status }
    }
  }

  // Check for specific HTTP error patterns
  if (
    message.includes('404') ||
    message.includes('not found')
  ) {
    return { errorType: 'http_error', httpStatus: 404 }
  }

  if (message.includes('500') || message.includes('internal server error')) {
    return { errorType: 'http_error', httpStatus: 500 }
  }

  if (message.includes('502') || message.includes('bad gateway')) {
    return { errorType: 'http_error', httpStatus: 502 }
  }

  if (message.includes('503') || message.includes('service unavailable')) {
    return { errorType: 'http_error', httpStatus: 503 }
  }

  if (message.includes('403') || message.includes('forbidden')) {
    return { errorType: 'http_error', httpStatus: 403 }
  }

  return { errorType: 'other' }
}

/**
 * Builds WCAG tags for axe-core based on selected levels
 */
function buildWcagTags(levels: string[]): string[] {
  const tags: string[] = ['best-practice']

  for (const level of levels) {
    switch (level.toUpperCase()) {
      case 'A':
        tags.push('wcag2a', 'wcag21a', 'wcag22a')
        break
      case 'AA':
        tags.push('wcag2aa', 'wcag21aa', 'wcag22aa')
        break
      case 'AAA':
        tags.push('wcag2aaa', 'wcag21aaa')
        break
    }
  }

  return tags
}

/**
 * Extracts WCAG level from tags
 */
function extractWcagLevel(tags: string[]): string | null {
  if (tags.some((t) => t.includes('aaa'))) return 'AAA'
  if (tags.some((t) => t.includes('aa'))) return 'AA'
  if (tags.some((t) => t.includes('2a') || t.includes('21a') || t.includes('22a'))) return 'A'
  return null
}

/**
 * Extracts WCAG version from tags
 */
function extractWcagVersion(tags: string[]): string | null {
  if (tags.some((t) => t.includes('wcag22'))) return '2.2'
  if (tags.some((t) => t.includes('wcag21'))) return '2.1'
  if (tags.some((t) => t.includes('wcag2'))) return '2.0'
  return null
}

/**
 * Extracts WCAG criteria from tags
 */
function extractWcagCriteria(tags: string[]): string[] {
  const criteria: string[] = []
  const regex = /wcag(\d)(\d)(\d)/

  for (const tag of tags) {
    const match = tag.match(regex)
    if (match) {
      criteria.push(`${match[1]}.${match[2]}.${match[3]}`)
    }
  }

  return [...new Set(criteria)]
}

/**
 * Maps WCAG criteria to ABNT NBR 17060 sections
 */
function mapToAbnt(tags: string[]): string | null {
  const criteria = extractWcagCriteria(tags)

  for (const criterion of criteria) {
    if (ABNT_MAP[criterion]) {
      return ABNT_MAP[criterion]
    }
  }

  return null
}

/**
 * Generates a fingerprint for violation grouping
 * Agora agrupa apenas por ruleId - elementos únicos são rastreados separadamente
 */
function generateFingerprint(ruleId: string, _selector: string): string {
  // Agrupar apenas por regra - elementos únicos vão para unique_elements
  return ruleId
}

// Tipo para elementos únicos dentro de uma violação agregada
export interface UniqueElementData {
  html: string
  selector: string
  fullPath: string | null
  xpath: string | null
  count: number
  pages: string[]
}

/**
 * Normaliza URL removendo trailing slash para evitar duplicatas
 */
function normalizeUrl(url: string): string {
  return url.endsWith('/') && url.length > 1 ? url.slice(0, -1) : url
}

/**
 * Aggregates violations by fingerprint (ruleId)
 * Also tracks unique elements within each rule group
 */
export function aggregateViolations(
  allViolations: Array<{ pageUrl: string; violations: ViolationResult[] }>
): Map<string, {
  violation: ViolationResult
  occurrences: number
  pageUrls: string[]
  uniqueElements: UniqueElementData[]
}> {
  const aggregated = new Map<string, {
    violation: ViolationResult
    occurrences: number
    pageUrls: string[]
    uniqueElements: Map<string, UniqueElementData>
  }>()

  for (const { pageUrl: rawPageUrl, violations } of allViolations) {
    const pageUrl = normalizeUrl(rawPageUrl)
    for (const violation of violations) {
      const existing = aggregated.get(violation.fingerprint)

      if (existing) {
        existing.occurrences++
        if (!existing.pageUrls.includes(pageUrl)) {
          existing.pageUrls.push(pageUrl)
        }

        // Rastrear elemento único baseado no HTML (primeiros 500 chars)
        const htmlKey = violation.html.substring(0, 500)
        const existingElement = existing.uniqueElements.get(htmlKey)

        if (existingElement) {
          existingElement.count++
          if (!existingElement.pages.includes(pageUrl)) {
            existingElement.pages.push(pageUrl)
          }
        } else {
          existing.uniqueElements.set(htmlKey, {
            html: violation.html.substring(0, 500),
            selector: violation.selector,
            fullPath: violation.fullPath,
            xpath: violation.xpath,
            count: 1,
            pages: [pageUrl],
          })
        }
      } else {
        const htmlKey = violation.html.substring(0, 500)
        const uniqueElements = new Map<string, UniqueElementData>()
        uniqueElements.set(htmlKey, {
          html: violation.html.substring(0, 500),
          selector: violation.selector,
          fullPath: violation.fullPath,
          xpath: violation.xpath,
          count: 1,
          pages: [pageUrl],
        })

        aggregated.set(violation.fingerprint, {
          violation,
          occurrences: 1,
          pageUrls: [pageUrl],
          uniqueElements,
        })
      }
    }
  }

  // Converter Map de uniqueElements para array antes de retornar
  const result = new Map<string, {
    violation: ViolationResult
    occurrences: number
    pageUrls: string[]
    uniqueElements: UniqueElementData[]
  }>()

  for (const [key, data] of aggregated) {
    result.set(key, {
      violation: data.violation,
      occurrences: data.occurrences,
      pageUrls: data.pageUrls,
      // Manter ordem de descoberta (primeiro encontrado = primeiro na lista)
      // Isso garante que o screenshot automático corresponda ao elemento mostrado no card
      uniqueElements: Array.from(data.uniqueElements.values())
        .slice(0, 20), // Limitar a 20 elementos únicos
    })
  }

  return result
}

/**
 * Calculates priority score (0-100) based on impact and frequency
 */
export function calculatePriority(
  impact: ImpactLevel,
  occurrences: number,
  pageCount: number
): number {
  const impactScore: Record<ImpactLevel, number> = {
    critical: 40,
    serious: 30,
    moderate: 20,
    minor: 10,
  }

  const base = impactScore[impact]
  const frequencyBonus = Math.min(occurrences * 2, 30)
  const spreadBonus = Math.min(pageCount * 3, 30)

  return Math.min(base + frequencyBonus + spreadBonus, 100)
}
