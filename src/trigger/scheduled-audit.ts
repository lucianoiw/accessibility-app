import { schedules, logger } from '@trigger.dev/sdk/v3'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAuditTask } from './audit'
import type { Project, DiscoveryConfig } from '@/types'

/**
 * Task agendada que roda a cada hora para verificar projetos
 * com auditorias agendadas e iniciá-las automaticamente.
 */
export const checkScheduledAudits = schedules.task({
  id: 'check-scheduled-audits',
  // Rodar a cada hora no minuto 0
  cron: '0 * * * *',
  run: async (payload) => {
    const supabase = createAdminClient()

    logger.info('Verificando auditorias agendadas', {
      timestamp: payload.timestamp,
      lastRun: payload.lastTimestamp,
    })

    // Buscar projetos com agendamento ativo e que estão no horário
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .eq('schedule_enabled', true)
      .lte('next_scheduled_audit_at', new Date().toISOString())
      .order('next_scheduled_audit_at', { ascending: true })

    if (error) {
      logger.error('Erro ao buscar projetos agendados', { error: error.message })
      return { success: false, error: error.message }
    }

    if (!projects || projects.length === 0) {
      logger.info('Nenhum projeto com auditoria agendada para agora')
      return { success: true, projectsProcessed: 0 }
    }

    logger.info(`Encontrados ${projects.length} projetos para auditar`)

    const results: Array<{
      projectId: string
      projectName: string
      success: boolean
      auditId?: string
      error?: string
    }> = []

    for (const project of projects as Project[]) {
      try {
        // Verificar se já existe uma auditoria em andamento para este projeto
        const { data: runningAudit } = await supabase
          .from('audits')
          .select('id')
          .eq('project_id', project.id)
          .in('status', ['PENDING', 'CRAWLING', 'AUDITING', 'AGGREGATING', 'GENERATING'])
          .single() as { data: { id: string } | null }

        if (runningAudit) {
          logger.warn('Projeto já possui auditoria em andamento', {
            projectId: project.id,
            projectName: project.name,
            runningAuditId: runningAudit.id,
          })
          results.push({
            projectId: project.id,
            projectName: project.name,
            success: false,
            error: 'Auditoria já em andamento',
          })
          continue
        }

        // Buscar a última auditoria completada para link de comparação
        const { data: lastAudit } = await supabase
          .from('audits')
          .select('id')
          .eq('project_id', project.id)
          .eq('status', 'COMPLETED')
          .order('completed_at', { ascending: false })
          .limit(1)
          .single() as { data: { id: string } | null }

        // Criar snapshot da configuração do projeto
        const projectSnapshot = {
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
          default_include_wcag_partial: project.default_include_wcag_partial,
          auth_config: project.auth_config,
          subdomain_policy: project.subdomain_policy,
          allowed_subdomains: project.allowed_subdomains,
          snapshot_at: new Date().toISOString(),
        }

        // Extrair maxPages do discovery config
        const maxPages = project.discovery_method === 'manual'
          ? ((project.discovery_config as { urls: string[] }).urls?.length || 10)
          : ((project.discovery_config as { maxPages: number }).maxPages || project.default_max_pages)

        // Criar a auditoria
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: audit, error: auditError } = await (supabase as any)
          .from('audits')
          .insert({
            project_id: project.id,
            status: 'PENDING',
            is_scheduled: true,
            previous_audit_id: lastAudit?.id || null,
            // Config snapshot
            project_config_snapshot: projectSnapshot,
            // Discovery config
            discovery_method: project.discovery_method,
            discovery_config: project.discovery_config,
            // Analysis config
            max_pages: maxPages,
            wcag_levels: project.default_wcag_levels,
            include_abnt: project.default_include_abnt,
            include_emag: project.default_include_emag,
            include_coga: project.default_include_coga,
            // Progress (iniciais)
            total_pages: maxPages,
            processed_pages: 0,
            failed_pages: 0,
            broken_pages_count: 0,
            crawl_iterations: 0,
          })
          .select()
          .single() as { data: { id: string } | null; error: Error | null }

        if (auditError || !audit) {
          throw new Error(auditError?.message || 'Erro ao criar auditoria')
        }

        logger.info('Auditoria agendada criada', {
          projectId: project.id,
          projectName: project.name,
          auditId: audit.id,
        })

        // Disparar o task de auditoria
        const handle = await runAuditTask.trigger({
          auditId: audit.id,
          projectId: project.id,
          discoveryMethod: project.discovery_method,
          discoveryConfig: project.discovery_config as DiscoveryConfig,
          wcagLevels: project.default_wcag_levels,
          includeAbnt: project.default_include_abnt,
          includeEmag: project.default_include_emag,
          includeCoga: project.default_include_coga,
          includeWcagPartial: project.default_include_wcag_partial,
          authConfig: project.auth_config,
          subdomainPolicy: project.subdomain_policy,
          allowedSubdomains: project.allowed_subdomains,
        })

        // Atualizar auditoria com o trigger_run_id
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('audits')
          .update({ trigger_run_id: handle.id })
          .eq('id', audit.id)

        // Atualizar timestamps de agendamento do projeto
        // O trigger do banco vai recalcular next_scheduled_audit_at automaticamente
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('projects')
          .update({
            last_scheduled_audit_at: new Date().toISOString(),
            // Forçar recálculo do próximo agendamento
            schedule_enabled: project.schedule_enabled,
          })
          .eq('id', project.id)

        results.push({
          projectId: project.id,
          projectName: project.name,
          success: true,
          auditId: audit.id,
        })

        logger.info('Auditoria agendada iniciada com sucesso', {
          projectId: project.id,
          auditId: audit.id,
          triggerRunId: handle.id,
        })
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        logger.error('Erro ao processar projeto agendado', {
          projectId: project.id,
          projectName: project.name,
          error: errorMessage,
        })
        results.push({
          projectId: project.id,
          projectName: project.name,
          success: false,
          error: errorMessage,
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    logger.info('Verificação de auditorias agendadas concluída', {
      total: results.length,
      successful,
      failed,
    })

    return {
      success: true,
      projectsProcessed: results.length,
      successful,
      failed,
      results,
    }
  },
})
