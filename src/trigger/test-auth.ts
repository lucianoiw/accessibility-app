import { task } from '@trigger.dev/sdk/v3'
import { chromium, type Page } from 'playwright'
import type { AuthConfig } from '@/types'

// Termos que indicam que a página ainda está carregando
const LOADING_INDICATORS = ['carregando', 'loading', 'aguarde', 'please wait']

// Tipos de request que indicam carregamento de SPA
const SPA_REQUEST_TYPES = ['xhr', 'fetch', 'document'] as const

interface RequestTracker {
  getPendingCount: () => number
  getPendingUrls: () => string[]
  cleanup: () => void
}

/**
 * Cria um tracker de requisições para detectar quando SPA terminou de carregar
 * IMPORTANTE: Criar ANTES do goto() para capturar todas as requisições
 */
function createRequestTracker(page: Page): RequestTracker {
  const pendingRequests = new Map<string, string>()

  const onRequest = (request: { url: () => string; resourceType: () => string }) => {
    const type = request.resourceType()
    if (SPA_REQUEST_TYPES.includes(type as typeof SPA_REQUEST_TYPES[number])) {
      pendingRequests.set(request.url(), type)
    }
  }

  const onResponse = (response: { url: () => string }) => {
    pendingRequests.delete(response.url())
  }

  const onRequestFailed = (request: { url: () => string }) => {
    pendingRequests.delete(request.url())
  }

  page.on('request', onRequest)
  page.on('response', onResponse)
  page.on('requestfailed', onRequestFailed)

  return {
    getPendingCount: () => pendingRequests.size,
    getPendingUrls: () => Array.from(pendingRequests.keys()),
    cleanup: () => {
      page.off('request', onRequest)
      page.off('response', onResponse)
      page.off('requestfailed', onRequestFailed)
      pendingRequests.clear()
    },
  }
}

/**
 * Espera a página estabilizar (versão robusta com request tracking)
 * Alinhado com a implementação do auditor.ts
 */
async function waitForPageStable(
  page: Page,
  requestTracker: RequestTracker,
  options: { maxWait?: number } = {}
): Promise<void> {
  const { maxWait = 30000 } = options // 30s timeout (aumentado de 10s)
  const checkInterval = 300
  const stableChecksNeeded = 3

  const startTime = Date.now()
  let lastElementCount = 0
  let lastContentLength = 0
  let stableCount = 0
  let networkIdleCount = 0

  while (Date.now() - startTime < maxWait) {
    const state = await page.evaluate(() => ({
      elements: document.querySelectorAll('*').length,
      contentLength: document.body?.innerText?.length || 0,
      title: document.title,
    }))

    const pendingRequests = requestTracker.getPendingCount()

    // Verificar se título indica loading
    const isLoading = LOADING_INDICATORS.some(t => state.title.toLowerCase().includes(t))
    if (isLoading) {
      stableCount = 0
      networkIdleCount = 0
      await page.waitForTimeout(checkInterval)
      continue
    }

    // Verificar network idle
    if (pendingRequests === 0) {
      networkIdleCount++
    } else {
      networkIdleCount = 0
    }

    // Verificar se DOM estabilizou (elementos E conteúdo)
    const domStable = state.elements === lastElementCount &&
      state.contentLength === lastContentLength

    if (domStable) {
      stableCount++
    } else {
      stableCount = 0
      lastElementCount = state.elements
      lastContentLength = state.contentLength
    }

    // Página pronta quando:
    // - Network idle por 2+ checks (600ms) E DOM estável por 3+ checks
    // - OU DOM muito estável por 6+ checks (1.8s) mesmo com network ativa (para WebSockets/polling)
    const isReady = (networkIdleCount >= 2 && stableCount >= stableChecksNeeded) ||
      stableCount >= 6

    if (isReady) {
      console.log(`[Auth Test] Page stable after ${Date.now() - startTime}ms (network idle: ${networkIdleCount}, dom stable: ${stableCount})`)
      return
    }

    await page.waitForTimeout(checkInterval)
  }

  // Timeout - logar estado final
  const pendingUrls = requestTracker.getPendingUrls()
  console.log(`[Auth Test] Page stability timeout after ${maxWait}ms (pending requests: ${pendingUrls.length})`)
  if (pendingUrls.length > 0) {
    console.log(`[Auth Test] Pending URLs: ${pendingUrls.slice(0, 5).join(', ')}${pendingUrls.length > 5 ? '...' : ''}`)
  }
}

export interface TestAuthPayload {
  baseUrl: string
  authConfig: AuthConfig | null
}

export interface TestAuthResult {
  success: boolean
  statusCode: number
  testedUrl: string
  finalUrl?: string
  wasRedirected?: boolean
  pageTitle?: string
  hasLoginForm?: boolean
  authUsed: string
  headersSent?: Record<string, string>
  cookiesInjected?: number
  cookiesAfterLoad?: number  // Quantos cookies existem após carregar a página
  screenshot?: string
  message: string
  debug?: {
    cookieNames?: string[]
    cookieDomain?: string
  }
}

export const testAuthTask = task({
  id: 'test-auth',
  // Machine pequena, teste é rápido
  machine: { preset: 'small-2x' },
  // Timeout de 60 segundos (teste deve ser rápido)
  maxDuration: 60,
  retry: {
    maxAttempts: 1, // Sem retry - teste de auth deve ser imediato
  },
  run: async (payload: TestAuthPayload): Promise<TestAuthResult> => {
    const { baseUrl, authConfig } = payload

    // Build headers
    const extraHTTPHeaders: Record<string, string> = {}
    if (authConfig?.type === 'bearer' && authConfig.token) {
      extraHTTPHeaders['Authorization'] = `Bearer ${authConfig.token}`
    }

    let browser = null
    let requestTracker: RequestTracker | null = null

    try {
      console.log(`[Auth Test] Testing connection to ${baseUrl}`)
      console.log(`[Auth Test] Using auth: ${authConfig?.type || 'none'}`)

      // Usar Playwright para abrir o site com os headers
      // Args anti-detecção (alinhado com auditor.ts)
      browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      })
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders,
        viewport: { width: 1280, height: 720 },
        bypassCSP: true, // Alinhado com auditor.ts
      })

      // Injetar cookies se configurado
      let cookiesInjected = 0
      let cookieDomain = ''
      const cookieNames: string[] = []

      if (authConfig?.type === 'cookie' && authConfig.cookies) {
        const parsedUrl = new URL(baseUrl)
        const isSecure = parsedUrl.protocol === 'https:'

        // Usar domínio exato do hostname (mais compatível)
        // Alguns sites não aceitam cookies de domínio pai
        cookieDomain = parsedUrl.hostname

        console.log(`[Auth Test] Cookie domain: ${cookieDomain}`)

        const cookiePairs = authConfig.cookies.split(';').map(c => c.trim()).filter(Boolean)
        const cookiesToSet = cookiePairs.map(pair => {
          const eqIndex = pair.indexOf('=')
          const name = pair.substring(0, eqIndex).trim()
          const value = pair.substring(eqIndex + 1).trim()
          cookieNames.push(name)
          return {
            name,
            value,
            domain: cookieDomain,
            path: '/',
            secure: isSecure,
            sameSite: 'Lax' as const,
          }
        })

        console.log(`[Auth Test] Setting cookies: ${cookieNames.join(', ')}`)
        await context.addCookies(cookiesToSet)
        cookiesInjected = cookiesToSet.length
        console.log(`[Auth Test] Injected ${cookiesInjected} cookies (secure: ${isSecure}, domain: ${cookieDomain})`)
      }

      const page = await context.newPage()

      // IMPORTANTE: Criar tracker ANTES do goto() para capturar todas as requisições do SPA
      requestTracker = createRequestTracker(page)

      // Capturar o status da resposta
      let responseStatus = 0
      page.on('response', (response) => {
        if (response.url() === baseUrl || response.request().isNavigationRequest()) {
          responseStatus = response.status()
        }
      })

      // Navegar para o site (domcontentloaded é mais rápido e confiável)
      const response = await page.goto(baseUrl, {
        timeout: 30000,
        waitUntil: 'domcontentloaded'
      })

      // Esperar página estabilizar (versão robusta com network tracking)
      await waitForPageStable(page, requestTracker, { maxWait: 30000 })

      // Pegar URL final (após redirects)
      const finalUrl = page.url()
      const wasRedirected = finalUrl !== baseUrl

      // Verificar cookies após carregar a página
      const cookiesAfterLoad = await context.cookies()
      console.log(`[Auth Test] Cookies after load: ${cookiesAfterLoad.length}`)
      console.log(`[Auth Test] Cookie names: ${cookiesAfterLoad.map(c => c.name).join(', ')}`)

      // Verificar se tem formulário de login
      const pageContent = await page.content()
      const hasLoginForm = pageContent.toLowerCase().includes('login') ||
                           pageContent.toLowerCase().includes('signin') ||
                           pageContent.toLowerCase().includes('password') ||
                           pageContent.toLowerCase().includes('entrar')

      // Tirar screenshot
      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false // só a parte visível
      })
      const screenshotBase64 = screenshot.toString('base64')

      // Pegar título da página
      const pageTitle = await page.title()

      const statusCode = response?.status() || responseStatus
      const success = statusCode >= 200 && statusCode < 400

      console.log(`[Auth Test] Result: status=${statusCode}, success=${success}, redirected=${wasRedirected}, hasLogin=${hasLoginForm}`)
      console.log(`[Auth Test] Final URL: ${finalUrl}`)
      console.log(`[Auth Test] Page title: ${pageTitle}`)

      return {
        success,
        statusCode,
        testedUrl: baseUrl,
        finalUrl,
        wasRedirected,
        pageTitle,
        hasLoginForm,
        authUsed: authConfig?.type || 'none',
        headersSent: extraHTTPHeaders,
        cookiesInjected,
        cookiesAfterLoad: cookiesAfterLoad.length,
        screenshot: screenshotBase64,
        message: success
          ? wasRedirected && hasLoginForm
            ? 'Redirecionado para página de login. A autenticação pode não estar funcionando.'
            : hasLoginForm
              ? 'Página carregou mas parece ter formulário de login.'
              : 'Conexão bem sucedida!'
          : statusCode === 401
            ? 'Não autorizado (401). Verifique o token.'
            : statusCode === 403
              ? 'Acesso negado (403). O token pode não ter permissão.'
              : statusCode === 404
                ? 'Página não encontrada (404). Verifique se a URL base está correta.'
                : `Erro: ${statusCode}`,
        debug: {
          cookieNames,
          cookieDomain,
        },
      }
    } catch (error) {
      // Sanitize error - não expor detalhes internos
      const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar'
      console.error('[Auth Test] Error:', { error: errorMessage })

      return {
        success: false,
        statusCode: 0,
        testedUrl: baseUrl,
        authUsed: authConfig?.type || 'none',
        message: errorMessage,
      }
    } finally {
      // SEMPRE limpar listeners e fechar browser, mesmo com erro
      if (requestTracker) {
        requestTracker.cleanup()
      }
      if (browser) {
        await browser.close().catch(err => console.error('[Auth Test] Error closing browser:', err))
      }
    }
  },
})
