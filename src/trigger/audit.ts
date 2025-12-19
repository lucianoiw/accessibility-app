import { task, logger } from '@trigger.dev/sdk/v3'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  discoverFromSitemap,
  discoverWithPathScope,
  getPathFromUrl,
  normalizeUrl,
  auditPage,
  aggregateViolations,
  calculatePriority,
  type ViolationResult,
  type SubdomainConfig,
} from '@/lib/audit'
import { AXE_TO_EMAG, CUSTOM_TO_EMAG } from '@/lib/audit/emag-map'
import { calculateAccessibilityScore, calculateRulesFromAudit } from '@/lib/audit/score-calculator'
import { calculateSeverityPatternSummary } from '@/lib/audit/pattern-grouping'
import type {
  AuditSummary,
  ImpactLevel,
  AuthConfig,
  SubdomainPolicy,
  BrokenPageErrorType,
  DiscoveryMethod,
  DiscoveryConfig,
  ManualDiscoveryConfig,
  SitemapDiscoveryConfig,
  CrawlerDiscoveryConfig,
} from '@/types'

// ========================================
// CONFIGURAÇÃO DO LOOP ITERATIVO
// ========================================
const AUDIT_CONFIG = {
  BATCH_SIZE: 5,           // Páginas em paralelo por iteração
  MAX_ITERATIONS: 50,      // Limite de segurança para evitar loop infinito
  PAGE_TIMEOUT: 60000,     // 60s por página
  CANDIDATE_MARGIN: 1.5,   // Buscar 50% a mais de candidatos (15 pedidas → 22 candidatos)
}

// Tipo para payload da task
interface AuditPayload {
  auditId: string
  projectId: string
  // Discovery config
  discoveryMethod: DiscoveryMethod
  discoveryConfig: DiscoveryConfig
  // Analysis config
  wcagLevels: string[]
  includeAbnt: boolean
  includeEmag: boolean
  includeCoga: boolean
  includeWcagPartial: boolean
  // Project config
  authConfig: AuthConfig | null
  subdomainPolicy?: SubdomainPolicy
  allowedSubdomains?: string[] | null
}

// Tipo para estado do loop iterativo
interface IterationState {
  candidateUrls: string[]       // URLs candidatas a auditar
  triedUrls: Set<string>        // URLs já tentadas (evita repetição)
  successfulAudits: number      // Contagem de auditorias bem sucedidas
  brokenPages: BrokenPageInfo[] // Páginas que falharam
  currentIteration: number      // Iteração atual
}

// Info de página quebrada
interface BrokenPageInfo {
  url: string
  errorType: BrokenPageErrorType
  httpStatus: number | null
  errorMessage: string
  discoveredFrom: string | null
}

// Tipo para resultado do batch de auditoria
interface BatchResult {
  url: string
  success: boolean
  error?: string
  errorType?: BrokenPageErrorType
  httpStatus?: number | null
  pageId?: string
  auditPageId?: string
  violations?: ViolationResult[]
  discoveredLinks?: string[]
}

// Extensões de arquivos não-HTML
const NON_HTML_EXTENSIONS = ['.xml', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.css', '.js', '.json', '.ico', '.woff', '.woff2', '.ttf', '.eot']

/**
 * Verifica se URL é uma página HTML
 */
function isHtmlUrl(url: string): boolean {
  const urlLower = url.toLowerCase()
  return !NON_HTML_EXTENSIONS.some((ext) => urlLower.endsWith(ext)) && !urlLower.includes('sitemap')
}

/**
 * Mapeia um ruleId para recomendações eMAG
 */
function mapRuleToEmag(ruleId: string, isCustomRule: boolean): string[] {
  if (isCustomRule) {
    return CUSTOM_TO_EMAG[ruleId] || []
  }
  return AXE_TO_EMAG[ruleId] || []
}

// Tipo para violação com join
type ViolationWithPage = {
  rule_id: string
  is_custom_rule: boolean
  impact: ImpactLevel
  wcag_level: string | null
  wcag_version: string | null
  wcag_criteria: string[]
  wcag_tags: string[]
  abnt_section: string | null
  help: string
  description: string
  help_url: string | null
  selector: string
  html: string
  parent_html: string | null
  failure_summary: string | null
  fingerprint: string
  audit_pages: { pages: { url: string } }
}

// ========================================
// TASK PRINCIPAL: Auditoria Iterativa
// ========================================
export const runAuditTask = task({
  id: 'run-audit',
  // Máquina com mais memória para Playwright (4 GB RAM)
  machine: { preset: 'medium-2x' },
  // Retry automático
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  // Timeout máximo de 30 minutos
  maxDuration: 1800,
  run: async (payload: AuditPayload) => {
    const { auditId, projectId, discoveryMethod, discoveryConfig, wcagLevels, includeAbnt, includeEmag, includeCoga, includeWcagPartial, authConfig, subdomainPolicy, allowedSubdomains } = payload
    const supabase = createAdminClient()

    // Verificar se Playwright está disponível
    try {
      const { chromium } = await import('playwright')
      const executablePath = chromium.executablePath()
      logger.info('Playwright disponível', { executablePath })
    } catch (playwrightError) {
      logger.error('Playwright NÃO disponível', { error: String(playwrightError) })
      throw new Error(`Playwright não está instalado: ${playwrightError}`)
    }

    // Extrair maxPages do discovery config
    const maxPages = discoveryMethod === 'manual'
      ? (discoveryConfig as ManualDiscoveryConfig).urls.length
      : (discoveryConfig as SitemapDiscoveryConfig | CrawlerDiscoveryConfig).maxPages

    // Extrair baseUrl do discovery config para uso em getPathFromUrl
    const baseUrl = discoveryMethod === 'manual'
      ? (discoveryConfig as ManualDiscoveryConfig).urls[0] || ''
      : discoveryMethod === 'sitemap'
        ? new URL((discoveryConfig as SitemapDiscoveryConfig).sitemapUrl).origin
        : (discoveryConfig as CrawlerDiscoveryConfig).startUrl

    logger.info('Iniciando auditoria iterativa', { auditId, discoveryMethod, maxPages, includeCoga, includeEmag, includeAbnt })

    // Helper para verificar cancelamento
    const checkCancelled = async (): Promise<boolean> => {
      const { data } = await supabase
        .from('audits')
        .select('status')
        .eq('id', auditId)
        .single()
      return !!(data && (data as { status: string }).status === 'CANCELLED')
    }

    // Preparar configuração de subdomínios
    const subdomainConfig: SubdomainConfig = {
      policy: subdomainPolicy || 'main_only',
      allowedSubdomains: allowedSubdomains || null,
    }

    logger.info('Configuração de subdomínios', {
      policy: subdomainConfig.policy,
      allowedSubdomains: subdomainConfig.allowedSubdomains,
    })

    // ========================================
    // STEP 1: Descoberta inicial de URLs
    // ========================================
    logger.info('Step 1: Descobrindo URLs iniciais', { discoveryMethod, maxPages })

    await supabase
      .from('audits')
      .update({ status: 'CRAWLING' } as never)
      .eq('id', auditId)

    let htmlUrls: string[] = []

    // Descoberta baseada no método escolhido
    if (discoveryMethod === 'manual') {
      // Modo manual: usar URLs fornecidas diretamente
      const manualConfig = discoveryConfig as ManualDiscoveryConfig
      htmlUrls = manualConfig.urls.filter(isHtmlUrl).map(normalizeUrl)
      logger.info('Modo manual: URLs fornecidas', { count: htmlUrls.length })

    } else if (discoveryMethod === 'sitemap') {
      // Modo sitemap: buscar URLs do sitemap especificado
      const sitemapConfig = discoveryConfig as SitemapDiscoveryConfig
      const sitemapResult = await discoverFromSitemap(sitemapConfig.sitemapUrl, {
        maxPages: sitemapConfig.maxPages,
        authConfig,
      })
      htmlUrls = sitemapResult.urls.filter(isHtmlUrl)
      logger.info('Modo sitemap: URLs descobertas', {
        count: htmlUrls.length,
        sitemapUrl: sitemapConfig.sitemapUrl,
      })

    } else {
      // Modo crawler/rastreamento: crawlear com path scope
      const crawlerConfig = discoveryConfig as CrawlerDiscoveryConfig
      const crawlResult = await discoverWithPathScope(crawlerConfig.startUrl, {
        maxPages: crawlerConfig.maxPages,
        depth: crawlerConfig.depth,
        excludePaths: crawlerConfig.excludePaths || [],
        margin: AUDIT_CONFIG.CANDIDATE_MARGIN,
        timeout: 30000,
        authConfig,
        subdomainConfig,
      })
      htmlUrls = crawlResult.urls.filter(isHtmlUrl)
      logger.info('Modo rastreamento: URLs descobertas', {
        count: htmlUrls.length,
        startUrl: crawlerConfig.startUrl,
        depth: crawlerConfig.depth,
        pagesVisited: crawlResult.pagesVisited,
      })
    }

    logger.info('Descoberta inicial concluída', {
      htmlUrls: htmlUrls.length,
      method: discoveryMethod,
    })

    // Atualizar status
    await supabase
      .from('audits')
      .update({
        status: 'AUDITING',
        total_pages: maxPages,
        crawl_iterations: 1,
      } as never)
      .eq('id', auditId)

    // ========================================
    // STEP 2: Loop iterativo de auditoria
    // ========================================
    logger.info('Step 2: Iniciando loop iterativo de auditoria')

    // Inicializar estado
    const state: IterationState = {
      candidateUrls: [...htmlUrls],
      triedUrls: new Set<string>(),
      successfulAudits: 0,
      brokenPages: [],
      currentIteration: 0,
    }

    // Map para rastrear páginas e audit_pages criadas
    const pageMap: Array<{ url: string; pageId: string; auditPageId: string }> = []

    // Coletar todas as violações para agregação
    const allViolations: Array<{ pageUrl: string; violations: ViolationResult[] }> = []

    // Loop principal
    while (
      state.successfulAudits < maxPages &&
      state.currentIteration < AUDIT_CONFIG.MAX_ITERATIONS &&
      state.candidateUrls.length > 0
    ) {
      state.currentIteration++

      // Verificar se foi cancelado
      if (await checkCancelled()) {
        logger.info('Auditoria foi cancelada pelo usuário (início da iteração)')
        return {
          auditId,
          summary: { total: 0, critical: 0, serious: 0, moderate: 0, minor: 0 },
          pagesAudited: state.successfulAudits,
          pagesRequested: maxPages,
          brokenPages: state.brokenPages.length,
          targetReached: false,
          cancelled: true,
        }
      }

      // Pegar próximo batch de URLs candidatas
      const batchUrls: string[] = []
      while (batchUrls.length < AUDIT_CONFIG.BATCH_SIZE && state.candidateUrls.length > 0) {
        const url = state.candidateUrls.shift()!
        const normalized = normalizeUrl(url)

        // Pular se já tentou esta URL
        if (state.triedUrls.has(normalized)) {
          continue
        }

        state.triedUrls.add(normalized)
        batchUrls.push(normalized)
      }

      if (batchUrls.length === 0) {
        logger.info('Sem mais URLs candidatas')
        break
      }

      logger.info(`Iteração ${state.currentIteration}: Processando batch`, {
        batchSize: batchUrls.length,
        successfulSoFar: state.successfulAudits,
        target: maxPages,
        remainingCandidates: state.candidateUrls.length,
      })

      // Processar batch em paralelo com Promise.allSettled para maior resiliência
      const batchPromises = batchUrls.map(async (url): Promise<BatchResult> => {
          // Criar página e audit_page no banco
          const path = getPathFromUrl(url, baseUrl)

          const { data: pageData } = await supabase
            .from('pages')
            .upsert(
              {
                project_id: projectId,
                url,
                path,
                found_via: 'CRAWL',
              } as never,
              { onConflict: 'project_id,url' }
            )
            .select()
            .single()

          if (!pageData) {
            logger.error('Falha ao criar página', { url })
            return { url, success: false, error: 'Falha ao criar página no banco' }
          }

          const pageId = (pageData as { id: string }).id

          const { data: auditPageData } = await supabase
            .from('audit_pages')
            .insert({
              audit_id: auditId,
              page_id: pageId,
              status: 'PROCESSING',
            } as never)
            .select()
            .single()

          if (!auditPageData) {
            logger.error('Falha ao criar audit_page', { url })
            return { url, success: false, error: 'Falha ao criar audit_page no banco' }
          }

          const auditPageId = (auditPageData as { id: string }).id

          try {
            // Auditar a página com extração de links
            logger.info('Auditando página', { url })
            const result = await auditPage(url, {
              wcagLevels,
              includeAbnt,
              includeCoga,
              includeWcagPartial,
              timeout: AUDIT_CONFIG.PAGE_TIMEOUT,
              authConfig,
              extractLinks: true,
              baseUrl,
              subdomainConfig,
            })

            if (result.error) {
              // Página falhou - registrar como broken page
              await supabase
                .from('audit_pages')
                .update({
                  status: 'FAILED',
                  error_message: result.error,
                  load_time: result.loadTime,
                  processed_at: new Date().toISOString(),
                } as never)
                .eq('id', auditPageId)

              logger.warn('Página falhou', {
                url,
                error: result.error,
                errorType: result.errorType,
                httpStatus: result.httpStatus,
              })

              return {
                url,
                success: false,
                errorType: result.errorType || 'other',
                httpStatus: result.httpStatus || null,
                error: result.error,
                pageId,
                auditPageId,
              }
            }

            // Página auditada com sucesso
            await supabase
              .from('audit_pages')
              .update({
                status: 'COMPLETED',
                violation_count: result.violations.length,
                load_time: result.loadTime,
                processed_at: new Date().toISOString(),
              } as never)
              .eq('id', auditPageId)

            // Inserir violações
            if (result.violations.length > 0) {
              const violationsToInsert = result.violations.map((violation) => ({
                audit_id: auditId,
                audit_page_id: auditPageId,
                rule_id: violation.ruleId,
                is_custom_rule: violation.isCustomRule,
                impact: violation.impact,
                wcag_level: violation.wcagLevel,
                wcag_version: violation.wcagVersion,
                wcag_criteria: violation.wcagCriteria,
                wcag_tags: violation.wcagTags,
                abnt_section: violation.abntSection,
                help: violation.help,
                description: violation.description,
                help_url: violation.helpUrl,
                selector: violation.selector,
                html: violation.html.substring(0, 2000),
                parent_html: violation.parentHtml?.substring(0, 500) || null,
                failure_summary: violation.failureSummary,
                fingerprint: violation.fingerprint,
              }))

              await supabase.from('violations').insert(violationsToInsert as never)
            }

            logger.info('Página auditada com sucesso', {
              url,
              violations: result.violations.length,
              linksDiscovered: result.discoveredLinks?.length || 0,
            })

            return {
              url,
              success: true,
              violations: result.violations,
              discoveredLinks: result.discoveredLinks || [],
              pageId,
              auditPageId,
            }
          } catch (error) {
            logger.error('Erro ao auditar página', { url, error: String(error) })

            await supabase
              .from('audit_pages')
              .update({
                status: 'FAILED',
                error_message: String(error),
                processed_at: new Date().toISOString(),
              } as never)
              .eq('id', auditPageId)

            return {
              url,
              success: false,
              errorType: 'other' as BrokenPageErrorType,
              httpStatus: null,
              error: String(error),
              pageId,
              auditPageId,
            }
          }
        })

      // Usar allSettled para garantir que todas as promises completam
      const settled = await Promise.allSettled(batchPromises)

      // Extrair resultados fulfilled e logar rejeitados
      const batchResults: BatchResult[] = settled
        .map((result, index): BatchResult => {
          if (result.status === 'fulfilled') {
            return result.value
          } else {
            // Promise rejeitou (não deveria acontecer com try/catch interno, mas defense in depth)
            logger.error('Batch promise rejected unexpectedly', {
              url: batchUrls[index],
              reason: String(result.reason),
            })
            return {
              url: batchUrls[index],
              success: false,
              errorType: 'other' as BrokenPageErrorType,
              httpStatus: null,
              error: String(result.reason),
            }
          }
        })

      // Processar resultados do batch
      for (const result of batchResults) {
        if (result.success) {
          state.successfulAudits++

          // Adicionar ao pageMap
          pageMap.push({
            url: result.url,
            pageId: result.pageId!,
            auditPageId: result.auditPageId!,
          })

          // Coletar violações para agregação
          if (result.violations && result.violations.length > 0) {
            allViolations.push({
              pageUrl: result.url,
              violations: result.violations,
            })
          }

          // Adicionar links descobertos como candidatos
          if (result.discoveredLinks) {
            for (const link of result.discoveredLinks) {
              const normalized = normalizeUrl(link)
              if (!state.triedUrls.has(normalized) && isHtmlUrl(normalized)) {
                state.candidateUrls.push(normalized)
              }
            }
          }

          // Verificar se atingiu o objetivo
          if (state.successfulAudits >= maxPages) {
            logger.info('Objetivo de páginas atingido!', { target: maxPages, actual: state.successfulAudits })
            break
          }
        } else {
          // Registrar como página quebrada
          state.brokenPages.push({
            url: result.url,
            errorType: result.errorType || 'other',
            httpStatus: result.httpStatus || null,
            errorMessage: result.error || 'Erro desconhecido',
            discoveredFrom: null,
          })
        }
      }

      // Atualizar progresso no banco
      await supabase
        .from('audits')
        .update({
          processed_pages: state.successfulAudits,
          failed_pages: state.brokenPages.length,
          broken_pages_count: state.brokenPages.length,
          crawl_iterations: state.currentIteration,
        } as never)
        .eq('id', auditId)

      logger.info(`Iteração ${state.currentIteration} concluída`, {
        successfulAudits: state.successfulAudits,
        brokenPages: state.brokenPages.length,
        remainingCandidates: state.candidateUrls.length,
      })
    }

    // ========================================
    // STEP 3: Salvar páginas quebradas
    // ========================================
    if (state.brokenPages.length > 0) {
      logger.info('Step 3: Salvando páginas quebradas', { count: state.brokenPages.length })

      const brokenPagesToInsert = state.brokenPages.map((bp) => ({
        audit_id: auditId,
        url: bp.url,
        error_type: bp.errorType,
        http_status: bp.httpStatus,
        error_message: bp.errorMessage,
        discovered_from: bp.discoveredFrom,
        attempted_at: new Date().toISOString(),
      }))

      // Inserir em batches de 50
      for (let i = 0; i < brokenPagesToInsert.length; i += 50) {
        const batch = brokenPagesToInsert.slice(i, i + 50)
        await supabase.from('broken_pages').insert(batch as never)
      }
    }

    // ========================================
    // STEP 4: Agregar resultados
    // ========================================
    logger.info('Step 4: Agregando resultados')

    await supabase
      .from('audits')
      .update({ status: 'AGGREGATING' } as never)
      .eq('id', auditId)

    // Buscar todas as violações do banco (para garantir consistência)
    const { data: violations, error: violationsError } = (await supabase
      .from('violations')
      .select(`
        *,
        audit_pages!inner(
          pages!inner(url)
        )
      `)
      .eq('audit_id', auditId)) as { data: ViolationWithPage[] | null; error: Error | null }

    logger.info('Violações recuperadas do banco', {
      count: violations?.length ?? 0,
      error: violationsError?.message ?? null,
    })

    // Reconstruir allViolations do banco para garantir consistência
    const violationsByPage = new Map<string, ViolationResult[]>()

    if (violations) {
      for (const v of violations) {
        const pageUrl = v.audit_pages.pages.url

        if (!violationsByPage.has(pageUrl)) {
          violationsByPage.set(pageUrl, [])
        }

        violationsByPage.get(pageUrl)!.push({
          ruleId: v.rule_id,
          isCustomRule: v.is_custom_rule,
          impact: v.impact,
          wcagLevel: v.wcag_level,
          wcagVersion: v.wcag_version,
          wcagCriteria: v.wcag_criteria,
          wcagTags: v.wcag_tags,
          abntSection: v.abnt_section,
          help: v.help,
          description: v.description,
          helpUrl: v.help_url,
          selector: v.selector,
          fullPath: null,
          xpath: null,
          html: v.html,
          parentHtml: v.parent_html,
          failureSummary: v.failure_summary,
          fingerprint: v.fingerprint,
        })
      }
    }

    const allViolationsFromDb: Array<{ pageUrl: string; violations: ViolationResult[] }> = []
    for (const [pageUrl, pageViolations] of violationsByPage.entries()) {
      allViolationsFromDb.push({ pageUrl, violations: pageViolations })
    }

    logger.info('Violações agrupadas por página', {
      totalPages: allViolationsFromDb.length,
      totalViolations: allViolationsFromDb.reduce((sum, p) => sum + p.violations.length, 0),
    })

    // Agregar violações
    // IMPORTANTE: Usar allViolations (memória) para ter fullPath/xpath corretos
    // allViolationsFromDb não tem esses campos pois não são salvos na tabela violations
    const aggregated = aggregateViolations(allViolations.length > 0 ? allViolations : allViolationsFromDb)

    logger.info('Violações agregadas', { uniqueCount: aggregated.size })

    // Preparar todos os inserts em batch
    const violationsToInsert = []

    for (const [, data] of aggregated) {
      const priority = calculatePriority(
        data.violation.impact,
        data.occurrences,
        data.pageUrls.length
      )

      // Mapear para eMAG se habilitado
      const emagRecommendations = includeEmag
        ? mapRuleToEmag(data.violation.ruleId, data.violation.isCustomRule)
        : []

      violationsToInsert.push({
        audit_id: auditId,
        rule_id: data.violation.ruleId,
        is_custom_rule: data.violation.isCustomRule,
        fingerprint: data.violation.fingerprint,
        impact: data.violation.impact,
        wcag_level: data.violation.wcagLevel,
        wcag_version: data.violation.wcagVersion,
        wcag_criteria: data.violation.wcagCriteria,
        abnt_section: data.violation.abntSection,
        emag_recommendations: emagRecommendations,
        help: data.violation.help,
        description: data.violation.description,
        help_url: data.violation.helpUrl,
        occurrences: data.occurrences,
        page_count: data.pageUrls.length,
        affected_pages: data.pageUrls.slice(0, 50),
        sample_selector: data.violation.selector,
        sample_html: data.violation.html.substring(0, 2000),
        sample_parent_html: data.violation.parentHtml?.substring(0, 500) || null,
        sample_page_url: data.pageUrls[0],
        priority,
        unique_elements: data.uniqueElements,
      })
    }

    // Inserir em batches de 100
    const BATCH_SIZE = 100
    for (let i = 0; i < violationsToInsert.length; i += BATCH_SIZE) {
      const batch = violationsToInsert.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('aggregated_violations')
        .insert(batch as never)

      if (error) {
        logger.error('Erro ao inserir batch de violações agregadas', {
          batchIndex: Math.floor(i / BATCH_SIZE),
          error: error.message,
        })
        throw error
      }
    }

    logger.info('Violações agregadas inseridas', { count: violationsToInsert.length })

    // Calcular summary de ocorrências
    const summary: AuditSummary = {
      critical: 0,
      serious: 0,
      moderate: 0,
      minor: 0,
      total: 0,
    }

    for (const { violations: pageViolations } of allViolationsFromDb) {
      for (const v of pageViolations) {
        summary[v.impact as keyof Omit<AuditSummary, 'total' | 'patterns'>]++
        summary.total++
      }
    }

    // Calcular padrões únicos por severidade (templates/componentes reutilizados)
    // Formatar violações agregadas para o cálculo de padrões
    const violationsForPatterns = violationsToInsert.map(v => ({
      impact: v.impact as 'critical' | 'serious' | 'moderate' | 'minor',
      unique_elements: v.unique_elements.map(el => ({
        fullPath: el.fullPath,
        xPath: el.xpath,
      })),
    }))

    const patternSummary = calculateSeverityPatternSummary(violationsForPatterns)

    // Adicionar padrões ao summary
    summary.patterns = {
      critical: patternSummary.critical.patterns,
      serious: patternSummary.serious.patterns,
      moderate: patternSummary.moderate.patterns,
      minor: patternSummary.minor.patterns,
      total: patternSummary.total.patterns,
    }

    logger.info('Padrões calculados', { patterns: summary.patterns })

    // ========================================
    // STEP 5: Finalizar auditoria
    // ========================================
    logger.info('Step 5: Finalizando auditoria')

    // Verificar se foi cancelado antes de marcar como COMPLETED
    const wasCancelled = await checkCancelled()
    if (wasCancelled) {
      logger.info('Auditoria foi cancelada, não atualizando para COMPLETED')
      return {
        auditId,
        summary,
        pagesAudited: state.successfulAudits,
        pagesRequested: maxPages,
        brokenPages: state.brokenPages.length,
        targetReached: false,
        cancelled: true,
      }
    }

    // Determinar status final
    const targetReached = state.successfulAudits >= maxPages

    // Calcular health score usando fórmula BrowserStack
    // IMPORTANTE: Usar PADRÕES ÚNICOS, não ocorrências brutas
    // Isso reflete o "esforço real" de correção (1 fix no template corrige N ocorrências)
    // axe-core executa ~100 regras, usamos isso como base para estimar passed rules
    const TOTAL_RULES_ESTIMATE = 100
    const failedByPatterns = {
      critical: summary.patterns?.critical ?? summary.critical,
      serious: summary.patterns?.serious ?? summary.serious,
      moderate: summary.patterns?.moderate ?? summary.moderate,
      minor: summary.patterns?.minor ?? summary.minor,
    }
    const { passedRules, failedRules } = calculateRulesFromAudit(TOTAL_RULES_ESTIMATE, failedByPatterns)
    const scoreData = calculateAccessibilityScore(passedRules, failedRules)
    const healthScore = scoreData.score

    logger.info('Health score calculado', {
      healthScore,
      failedByPatterns,
      passedRules,
      failedRules,
      ocorrencias: { critical: summary.critical, serious: summary.serious, moderate: summary.moderate, minor: summary.minor }
    })

    // Buscar auditoria anterior para comparação
    const { data: previousAuditData } = await supabase
      .from('audits')
      .select('id')
      .eq('project_id', projectId)
      .eq('status', 'COMPLETED')
      .neq('id', auditId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const previousAuditId = (previousAuditData as { id: string } | null)?.id ?? null

    if (previousAuditId) {
      logger.info('Auditoria anterior encontrada para comparação', { previousAuditId })
    }

    await supabase
      .from('audits')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
        summary,
        health_score: healthScore,
        previous_audit_id: previousAuditId,
        total_pages: maxPages,
        processed_pages: state.successfulAudits,
        failed_pages: state.brokenPages.length,
        broken_pages_count: state.brokenPages.length,
        crawl_iterations: state.currentIteration,
      } as never)
      .eq('id', auditId)

    logger.info('Auditoria concluída!', {
      auditId,
      summary,
      pagesAudited: state.successfulAudits,
      pagesRequested: maxPages,
      brokenPages: state.brokenPages.length,
      iterations: state.currentIteration,
      targetReached,
    })

    return {
      auditId,
      summary,
      pagesAudited: state.successfulAudits,
      pagesRequested: maxPages,
      brokenPages: state.brokenPages.length,
      targetReached,
    }
  },
})
