import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { chromium, type Page } from 'playwright'
import type { Project, AuthConfig } from '@/types'
import { AuthConfigSchema, validateInput } from '@/lib/validations'
import { requireCsrfValid } from '@/lib/csrf'

interface Props {
  params: Promise<{ id: string }>
}

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

export async function POST(request: Request, { params }: Props) {
  // Validar CSRF
  const csrf = await requireCsrfValid()
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Buscar projeto
  const { data: project } = (await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()) as { data: Project | null }

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Obter e validar config do request
  const body = await request.json()
  const { authConfig } = body as { authConfig: AuthConfig | null }

  // Validar authConfig se fornecido
  if (authConfig !== null) {
    const validation = validateInput(AuthConfigSchema, authConfig)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      )
    }
  }

  // Build headers
  const extraHTTPHeaders: Record<string, string> = {}
  if (authConfig?.type === 'bearer' && authConfig.token) {
    extraHTTPHeaders['Authorization'] = `Bearer ${authConfig.token}`
  }

  let browser = null

  try {
    console.log(`[Auth Test] Testing connection to ${project.base_url}`)
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
    if (authConfig?.type === 'cookie' && authConfig.cookies) {
      const baseUrl = new URL(project.base_url)
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
      cookiesInjected = cookiesToSet.length
      console.log(`[Auth Test] Injected ${cookiesInjected} cookies (secure: ${isSecure})`)
    }

    const page = await context.newPage()

    // Capturar o status da resposta
    let responseStatus = 0
    page.on('response', (response) => {
      if (response.url() === project.base_url || response.request().isNavigationRequest()) {
        responseStatus = response.status()
      }
    })

    // Navegar para o site (domcontentloaded é mais rápido e confiável)
    const response = await page.goto(project.base_url, {
      timeout: 30000,
      waitUntil: 'domcontentloaded'
    })

    // Esperar página estabilizar (adapta ao tempo real de carregamento)
    await waitForPageStable(page, { maxWait: 10000 })

    // Pegar URL final (após redirects)
    const finalUrl = page.url()
    const wasRedirected = finalUrl !== project.base_url

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

    return NextResponse.json({
      success,
      statusCode,
      testedUrl: project.base_url,
      finalUrl,
      wasRedirected,
      pageTitle,
      hasLoginForm,
      authUsed: authConfig?.type || 'none',
      headersSent: extraHTTPHeaders,
      cookiesInjected,
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
    })
  } catch (error) {
    // Sanitize error - não expor detalhes internos
    const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar'
    console.error('[Auth Test] Error:', { error: errorMessage })

    return NextResponse.json({
      success: false,
      statusCode: 0,
      testedUrl: project.base_url,
      authUsed: authConfig?.type || 'none',
      message: errorMessage,
    })
  } finally {
    // SEMPRE fecha o browser, mesmo com erro
    if (browser) {
      await browser.close().catch(err => console.error('[Auth Test] Error closing browser:', err))
    }
  }
}
