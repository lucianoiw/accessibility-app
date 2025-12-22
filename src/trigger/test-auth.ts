import { task } from '@trigger.dev/sdk/v3'
import { chromium, type Page } from 'playwright'
import type { AuthConfig } from '@/types'

// Termos que indicam que a página ainda está carregando
const LOADING_INDICATORS = ['carregando', 'loading', 'aguarde', 'please wait']

/**
 * Espera a página estabilizar
 */
async function waitForPageStable(page: Page, options: { maxWait?: number } = {}): Promise<void> {
  const { maxWait = 10000 } = options
  const checkInterval = 300
  const stableChecksNeeded = 3

  const startTime = Date.now()
  let lastElementCount = 0
  let stableCount = 0

  while (Date.now() - startTime < maxWait) {
    const state = await page.evaluate(() => ({
      elements: document.querySelectorAll('*').length,
      title: document.title,
    }))

    // Verificar se título indica loading
    const isLoading = LOADING_INDICATORS.some(t => state.title.toLowerCase().includes(t))
    if (isLoading) {
      stableCount = 0
      await page.waitForTimeout(checkInterval)
      continue
    }

    // Verificar se DOM estabilizou
    if (state.elements === lastElementCount) {
      stableCount++
      if (stableCount >= stableChecksNeeded) {
        return
      }
    } else {
      stableCount = 0
      lastElementCount = state.elements
    }

    await page.waitForTimeout(checkInterval)
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

    try {
      console.log(`[Auth Test] Testing connection to ${baseUrl}`)
      console.log(`[Auth Test] Using auth: ${authConfig?.type || 'none'}`)

      // Usar Playwright para abrir o site com os headers
      browser = await chromium.launch({ headless: true })
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        extraHTTPHeaders,
        viewport: { width: 1280, height: 720 },
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

      // Esperar página estabilizar (adapta ao tempo real de carregamento)
      await waitForPageStable(page, { maxWait: 10000 })

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
      // SEMPRE fecha o browser, mesmo com erro
      if (browser) {
        await browser.close().catch(err => console.error('[Auth Test] Error closing browser:', err))
      }
    }
  },
})
