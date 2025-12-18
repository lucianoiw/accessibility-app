import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chromium, type Browser, type Page } from 'playwright'
import AxeBuilder from '@axe-core/playwright'
import type { AggregatedViolation, VerificationResult, ViolationStatus, AuthConfig } from '@/types'
import { requireCsrfValid } from '@/lib/csrf'

export const maxDuration = 120 // 2 minutos

/**
 * Espera a página estabilizar (DOM parar de mudar)
 */
async function waitForPageStable(page: Page, options: { maxWait?: number; checkInterval?: number; stableChecks?: number } = {}): Promise<void> {
  const { maxWait = 15000, checkInterval = 500, stableChecks = 3 } = options

  const startTime = Date.now()
  let lastElementCount = 0
  let stableCount = 0

  const loadingTitles = ['carregando', 'loading', 'aguarde', 'please wait']
  const isLoadingTitle = (title: string) =>
    loadingTitles.some(t => title.toLowerCase().includes(t))

  while (Date.now() - startTime < maxWait) {
    const state = await page.evaluate(() => ({
      elements: document.querySelectorAll('*').length,
      title: document.title,
    }))

    if (isLoadingTitle(state.title)) {
      stableCount = 0
      await page.waitForTimeout(checkInterval)
      continue
    }

    if (state.elements === lastElementCount) {
      stableCount++
      if (stableCount >= stableChecks) {
        return
      }
    } else {
      stableCount = 0
      lastElementCount = state.elements
    }

    await page.waitForTimeout(checkInterval)
  }
}

/**
 * POST /api/violations/[id]/verify
 * Verifica se uma violação específica ainda existe nas páginas afetadas
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validar CSRF
  const csrf = await requireCsrfValid()
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 })
  }

  const { id: violationId } = await params
  const supabase = await createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Buscar a violação agregada
  const { data: violation } = await supabase
    .from('aggregated_violations')
    .select(`
      *,
      audits!inner (
        project_id,
        projects!inner (
          id,
          user_id,
          base_url,
          auth_config
        )
      )
    `)
    .eq('id', violationId)
    .single() as { data: AggregatedViolation & { audits: { project_id: string; projects: { id: string; user_id: string; base_url: string; auth_config: AuthConfig | null } } } | null }

  if (!violation) {
    return NextResponse.json({ error: 'Violação não encontrada' }, { status: 404 })
  }

  // Verificar se o usuário tem acesso ao projeto
  if (violation.audits.projects.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const authConfig = violation.audits.projects.auth_config
  const pagesToCheck = violation.affected_pages.slice(0, 10) // Limitar a 10 páginas
  const ruleId = violation.rule_id
  const isCustomRule = violation.is_custom_rule
  const originalOccurrences = violation.occurrences

  // Usar admin client para atualizações
  const adminSupabase = createAdminClient()

  // Marcar como em verificação
  await adminSupabase
    .from('aggregated_violations')
    .update({ status: 'in_progress' as ViolationStatus } as never)
    .eq('id', violationId)

  let browser: Browser | null = null
  let foundCount = 0
  const checkedPages: string[] = []

  try {
    // Configurar browser
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
    })

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
      const baseUrl = new URL(violation.audits.projects.base_url)
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
        }
      })
      await context.addCookies(cookiesToSet)
    }

    // Verificar cada página
    for (const pageUrl of pagesToCheck) {
      let page: Page | null = null
      try {
        console.log(`[Verify ${violationId}] Verificando ${pageUrl}...`)
        page = await context.newPage()

        await page.goto(pageUrl, { timeout: 30000, waitUntil: 'domcontentloaded' })
        await waitForPageStable(page)

        if (isCustomRule) {
          // Para regras customizadas, importar e rodar a regra específica
          const { getCustomViolations } = await import('@/lib/audit/custom-rules')
          const customViolations = await getCustomViolations(page)
          const matchingViolations = customViolations.filter(v => v.ruleId === ruleId)
          foundCount += matchingViolations.length
        } else {
          // Para regras axe-core, rodar axe com a regra específica usando @axe-core/playwright
          const axeResults = await new AxeBuilder({ page })
            .withRules([ruleId])
            .analyze()

          // Contar ocorrências nesta página
          for (const v of axeResults.violations) {
            foundCount += v.nodes.length
          }
        }

        checkedPages.push(pageUrl)
      } catch (error) {
        console.error(`[Verify ${violationId}] Erro em ${pageUrl}:`, error)
      } finally {
        // SEMPRE fecha a página, mesmo com erro
        if (page) {
          await page.close().catch(err => console.error(`[Verify] Error closing page:`, err))
        }
      }
    }

    // Calcular resultado
    const fixedCount = originalOccurrences - foundCount
    const newStatus: ViolationStatus = foundCount === 0 ? 'fixed' : 'open'

    const verificationResult: VerificationResult = {
      remaining: foundCount,
      fixed: fixedCount > 0 ? fixedCount : 0,
      pages_checked: checkedPages,
      checked_at: new Date().toISOString(),
    }

    // Atualizar a violação
    await adminSupabase
      .from('aggregated_violations')
      .update({
        status: newStatus,
        last_verified_at: new Date().toISOString(),
        verification_result: verificationResult,
        occurrences: foundCount > 0 ? foundCount : violation.occurrences,
        resolved_by: foundCount === 0 ? user.id : null,
      } as never)
      .eq('id', violationId)

    console.log(`[Verify ${violationId}] Concluído: ${foundCount} ocorrências encontradas (era ${originalOccurrences})`)

    return NextResponse.json({
      success: true,
      status: newStatus,
      result: verificationResult,
    })
  } catch (error) {
    // Sanitize error - não expor detalhes internos
    const errorMessage = error instanceof Error ? error.message : 'Erro ao verificar correção'
    console.error(`[Verify ${violationId}] Erro fatal:`, { error: errorMessage })

    // Reverter status para open em caso de erro
    await adminSupabase
      .from('aggregated_violations')
      .update({ status: 'open' as ViolationStatus } as never)
      .eq('id', violationId)

    return NextResponse.json(
      { error: 'Erro ao verificar correção. Tente novamente.' },
      { status: 500 }
    )
  } finally {
    // SEMPRE fecha o browser, mesmo com erro
    if (browser) {
      await browser.close().catch(err => console.error(`[Verify] Error closing browser:`, err))
    }
  }
}

/**
 * PATCH /api/violations/[id]/verify
 * Atualiza o status de uma violação manualmente
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Validar CSRF
  const csrf = await requireCsrfValid()
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 })
  }

  const { id: violationId } = await params
  const supabase = await createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const { status, resolution_notes } = body as { status: ViolationStatus; resolution_notes?: string }

  if (!status || !['open', 'in_progress', 'fixed', 'ignored', 'false_positive'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  // Verificar acesso via audit -> project
  const { data: violation } = await supabase
    .from('aggregated_violations')
    .select(`
      id,
      audits!inner (
        project_id,
        projects!inner (
          user_id
        )
      )
    `)
    .eq('id', violationId)
    .single() as { data: { id: string; audits: { project_id: string; projects: { user_id: string } } } | null }

  if (!violation) {
    return NextResponse.json({ error: 'Violação não encontrada' }, { status: 404 })
  }

  if (violation.audits.projects.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Atualizar status
  const adminSupabase = createAdminClient()
  const updateData: Record<string, unknown> = {
    status,
    resolved_by: ['fixed', 'ignored', 'false_positive'].includes(status) ? user.id : null,
  }

  if (resolution_notes !== undefined) {
    updateData.resolution_notes = resolution_notes
  }

  await adminSupabase
    .from('aggregated_violations')
    .update(updateData as never)
    .eq('id', violationId)

  return NextResponse.json({ success: true, status })
}
