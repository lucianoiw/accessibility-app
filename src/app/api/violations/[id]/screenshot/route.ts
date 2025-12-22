import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireCsrfValid } from '@/lib/csrf'
import { chromium } from 'playwright'
import { captureElementScreenshot, uploadScreenshot, getScreenshotConfig } from '@/lib/audit'
import type { AggregatedViolation, Project, AuthConfig } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/violations/[id]/screenshot
 *
 * Captura screenshot de um elemento de violação sob demanda.
 * Útil para violações não-visuais ou quando o usuário quer capturar manualmente.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Validar CSRF
  const csrf = await requireCsrfValid()
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 })
  }

  const { id: violationId } = await params

  // Autenticar usuário
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Buscar violação com dados do projeto
  const { data: violation, error: violationError } = await supabase
    .from('aggregated_violations')
    .select(`
      *,
      audits!inner(
        id,
        project_id,
        projects!inner(
          id,
          user_id,
          base_url,
          auth_config
        )
      )
    `)
    .eq('id', violationId)
    .single()

  if (violationError || !violation) {
    return NextResponse.json(
      { error: 'Violação não encontrada' },
      { status: 404 }
    )
  }

  // Verificar ownership do projeto
  const typedViolation = violation as AggregatedViolation & {
    audits: {
      id: string
      project_id: string
      projects: Project
    }
  }

  if (typedViolation.audits.projects.user_id !== user.id) {
    return NextResponse.json(
      { error: 'Acesso negado' },
      { status: 403 }
    )
  }

  // Se já tem screenshot, retornar URL existente
  if (typedViolation.screenshot_url) {
    return NextResponse.json({
      screenshotUrl: typedViolation.screenshot_url,
      cached: true,
    })
  }

  // Pegar URL e selector do primeiro elemento
  const firstElement = typedViolation.unique_elements?.[0]
  if (!firstElement) {
    return NextResponse.json(
      { error: 'Violação não tem elementos para capturar' },
      { status: 400 }
    )
  }

  const pageUrl = firstElement.pages?.[0] || typedViolation.sample_page_url
  const selector = firstElement.xpath || firstElement.selector || typedViolation.sample_selector

  if (!pageUrl || !selector) {
    return NextResponse.json(
      { error: 'URL ou seletor não disponíveis' },
      { status: 400 }
    )
  }

  // Preparar autenticação
  const authConfig = typedViolation.audits.projects.auth_config as AuthConfig | null

  let browser = null

  try {
    // Abrir browser
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })

    // Configurar headers de auth
    const extraHTTPHeaders: Record<string, string> = {}
    if (authConfig?.type === 'bearer' && authConfig.token) {
      extraHTTPHeaders['Authorization'] = `Bearer ${authConfig.token}`
    }

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders,
      bypassCSP: true,
    })

    // Injetar cookies se configurado
    if (authConfig?.type === 'cookie' && authConfig.cookies) {
      const baseUrl = new URL(pageUrl)
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
    }

    const page = await context.newPage()

    // Navegar para a página
    const response = await page.goto(pageUrl, {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    })

    // Verificar se carregou
    if (!response || response.status() >= 400) {
      await browser.close()
      return NextResponse.json(
        { error: 'Não foi possível acessar a página. Ela pode ter mudado ou estar indisponível.' },
        { status: 502 }
      )
    }

    // Esperar DOM estabilizar
    await page.waitForTimeout(2000)

    // Capturar screenshot
    const config = getScreenshotConfig(typedViolation.rule_id)
    const result = await captureElementScreenshot(page, selector, {
      padding: config.padding,
      maxWidth: config.maxWidth,
      maxHeight: config.maxHeight,
      timeout: 10000,
    })

    await browser.close()

    if (!result) {
      return NextResponse.json(
        { error: 'Elemento não encontrado na página. O código pode ter mudado.' },
        { status: 404 }
      )
    }

    // Upload para Storage
    const adminSupabase = createAdminClient()
    const screenshotUrl = await uploadScreenshot(
      adminSupabase,
      typedViolation.audits.id,
      violationId,
      result.buffer
    )

    // Atualizar violação com URL
    await adminSupabase
      .from('aggregated_violations')
      .update({ screenshot_url: screenshotUrl } as never)
      .eq('id', violationId)

    return NextResponse.json({
      screenshotUrl,
      width: result.width,
      height: result.height,
      cached: false,
    })
  } catch (error) {
    if (browser) {
      await browser.close().catch(() => {})
    }

    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    console.error('[Screenshot API] Error:', errorMessage)

    return NextResponse.json(
      { error: 'Erro ao capturar screenshot. Tente novamente.' },
      { status: 500 }
    )
  }
}
