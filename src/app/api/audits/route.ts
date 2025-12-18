import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Project, Audit, CrawlerDiscoveryConfig, ManualDiscoveryConfig, SitemapDiscoveryConfig, ProjectConfigSnapshot } from '@/types'
import { tasks } from '@trigger.dev/sdk/v3'
import type { runAuditTask } from '@/trigger/audit'
import { CreateAuditSchema, validateInput } from '@/lib/validations'
import { requireCsrfValid } from '@/lib/csrf'

// Helper para criar snapshot completo do projeto
function createProjectSnapshot(project: Project): ProjectConfigSnapshot {
  return {
    id: project.id,
    name: project.name,
    base_url: project.base_url,
    description: project.description,
    discovery_method: project.discovery_method,
    discovery_config: project.discovery_config,
    default_max_pages: project.default_max_pages,
    default_wcag_levels: project.default_wcag_levels,
    default_include_abnt: project.default_include_abnt,
    default_include_emag: project.default_include_emag,
    default_include_coga: project.default_include_coga,
    default_include_wcag_partial: project.default_include_wcag_partial ?? true,
    auth_config: project.auth_config,
    subdomain_policy: project.subdomain_policy,
    allowed_subdomains: project.allowed_subdomains,
    snapshot_at: new Date().toISOString(),
  }
}

export async function POST(request: Request) {
  // Validar CSRF
  const csrf = await requireCsrfValid()
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 })
  }

  const supabase = await createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Obter e validar dados do request
  const body = await request.json()
  const validation = validateInput(CreateAuditSchema, body)

  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error, details: validation.details },
      { status: 400 }
    )
  }

  const { projectId } = validation.data

  // Verificar se o projeto existe e pertence ao usuário
  const { data: project } = (await supabase
    .from('projects')
    .select('*')
    .eq('id', projectId)
    .single()) as { data: Project | null }

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  // CRITICAL: Verificar se o projeto pertence ao usuário
  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Usar configuração de descoberta do projeto
  const discoveryMethod = project.discovery_method
  const discoveryConfig = project.discovery_config

  // Extrair maxPages do discovery config
  let maxPages: number
  switch (discoveryMethod) {
    case 'manual':
      maxPages = (discoveryConfig as ManualDiscoveryConfig).urls?.length || 1
      break
    case 'sitemap':
      maxPages = (discoveryConfig as SitemapDiscoveryConfig).maxPages || 100
      break
    case 'crawler':
      maxPages = (discoveryConfig as CrawlerDiscoveryConfig).maxPages || 100
      break
    default:
      maxPages = 100
  }

  // Usar configurações de análise do projeto
  const wcagLevels = project.default_wcag_levels
  const includeAbnt = project.default_include_abnt
  const includeEmag = project.default_include_emag
  const includeCoga = project.default_include_coga ?? false
  const includeWcagPartial = project.default_include_wcag_partial ?? true // Habilitado por padrão

  // Criar snapshot completo do projeto (captura TODAS as configs)
  const projectSnapshot = createProjectSnapshot(project)

  // Criar auditoria com snapshot completo + campos individuais (para queries)
  const { data: audit, error } = (await supabase
    .from('audits')
    .insert({
      project_id: projectId,
      status: 'CRAWLING',
      // Snapshot completo (fonte autoritativa para novas configs)
      project_config_snapshot: projectSnapshot,
      // Campos individuais mantidos para compatibilidade e queries
      discovery_method: discoveryMethod,
      discovery_config: discoveryConfig,
      max_pages: maxPages,
      wcag_levels: wcagLevels,
      include_abnt: includeAbnt,
      include_emag: includeEmag,
      include_coga: includeCoga,
      started_at: new Date().toISOString(),
    } as never)
    .select()
    .single()) as { data: Audit | null; error: Error | null }

  if (error || !audit) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao criar auditoria' },
      { status: 500 }
    )
  }

  // Disparar task do Trigger.dev para processar em background
  try {
    const handle = await tasks.trigger<typeof runAuditTask>('run-audit', {
      auditId: audit.id,
      projectId: project.id,
      // Discovery config (snapshot do projeto)
      discoveryMethod: discoveryMethod,
      discoveryConfig: discoveryConfig,
      // Analysis config
      wcagLevels: wcagLevels,
      includeAbnt: includeAbnt,
      includeEmag: includeEmag,
      includeCoga: includeCoga,
      includeWcagPartial: includeWcagPartial,
      // Project config (for auth and subdomain policy)
      authConfig: project.auth_config,
      subdomainPolicy: project.subdomain_policy,
      allowedSubdomains: project.allowed_subdomains,
    })

    console.log('[Audit] Task triggered', { auditId: audit.id, triggerId: handle.id })

    // Salvar o trigger_run_id para poder cancelar depois
    await supabase
      .from('audits')
      .update({ trigger_run_id: handle.id } as never)
      .eq('id', audit.id)

    return NextResponse.json({ auditId: audit.id, triggerId: handle.id })
  } catch (triggerError) {
    // Sanitize error - não expor detalhes internos ao cliente
    const errorMessage = triggerError instanceof Error
      ? triggerError.message
      : 'Falha ao iniciar processamento'

    console.error('[Audit] Erro ao disparar task:', { auditId: audit.id, error: errorMessage })

    // Atualizar auditoria como falha
    const { error: updateError } = await supabase
      .from('audits')
      .update({
        status: 'FAILED',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
      } as never)
      .eq('id', audit.id)

    if (updateError) {
      console.error('[Audit] Falha ao atualizar status:', { auditId: audit.id, error: updateError.message })
    }

    return NextResponse.json(
      { error: 'Erro ao iniciar auditoria. Tente novamente.' },
      { status: 500 }
    )
  }
}
