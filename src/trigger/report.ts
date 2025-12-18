import { task, logger } from '@trigger.dev/sdk/v3'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildReportData,
  generateReportFileName,
  generatePdf,
  closeBrowser,
  type ReportType,
} from '@/lib/reports'

// Payload para geracao de relatorio
interface GenerateReportPayload {
  reportId: string
  auditId: string
  type: ReportType
  projectName: string
}

/**
 * Task para geracao de relatorios em background
 */
export const generateReportTask = task({
  id: 'generate-report',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
  },
  maxDuration: 300, // 5 minutos max
  run: async (payload: GenerateReportPayload) => {
    const { reportId, auditId, type, projectName } = payload
    const supabase = createAdminClient()

    logger.info('Iniciando geracao de relatorio', { reportId, auditId, type })

    try {
      // Atualizar status para "generating"
      await supabase
        .from('reports')
        .update({ status: 'generating' } as never)
        .eq('id', reportId)

      // Construir dados do relatorio
      logger.info('Buscando dados da auditoria')
      const reportData = await buildReportData(auditId, type)

      let fileBuffer: Buffer
      let fileName: string
      let contentType: string

      if (type === 'executive_pdf' || type === 'technical_pdf') {
        // Gerar PDF
        logger.info('Gerando PDF', { type })
        fileBuffer = await generatePdf(reportData, type)
        fileName = generateReportFileName(projectName, type)
        contentType = 'application/pdf'

        // Fechar browser apos uso
        await closeBrowser()
      } else if (type === 'csv') {
        // Gerar CSV
        logger.info('Gerando CSV')
        const csvContent = generateCsv(reportData)
        fileBuffer = Buffer.from(csvContent, 'utf-8')
        fileName = generateReportFileName(projectName, type)
        contentType = 'text/csv'
      } else if (type === 'json') {
        // Gerar JSON
        logger.info('Gerando JSON')
        const jsonContent = JSON.stringify(reportData, null, 2)
        fileBuffer = Buffer.from(jsonContent, 'utf-8')
        fileName = generateReportFileName(projectName, type)
        contentType = 'application/json'
      } else {
        throw new Error(`Tipo de relatorio nao suportado: ${type}`)
      }

      // Upload para Supabase Storage
      logger.info('Fazendo upload para Storage', { fileName, size: fileBuffer.length })

      const storagePath = `reports/${auditId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(storagePath, fileBuffer, {
          contentType,
          upsert: true,
        })

      if (uploadError) {
        throw new Error(`Erro no upload: ${uploadError.message}`)
      }

      // Obter URL publica
      const { data: urlData } = supabase.storage.from('reports').getPublicUrl(storagePath)

      // Atualizar registro com sucesso
      await supabase
        .from('reports')
        .update({
          status: 'completed',
          file_url: urlData.publicUrl,
          file_name: fileName,
          file_size: fileBuffer.length,
          completed_at: new Date().toISOString(),
        } as never)
        .eq('id', reportId)

      logger.info('Relatorio gerado com sucesso!', {
        reportId,
        fileName,
        size: fileBuffer.length,
        url: urlData.publicUrl,
      })

      return {
        reportId,
        fileName,
        fileSize: fileBuffer.length,
        fileUrl: urlData.publicUrl,
      }
    } catch (error) {
      logger.error('Erro ao gerar relatorio', { reportId, error: String(error) })

      // Atualizar registro com erro
      await supabase
        .from('reports')
        .update({
          status: 'failed',
          error_message: String(error),
        } as never)
        .eq('id', reportId)

      throw error
    }
  },
})

/**
 * Gera conteudo CSV expandido a partir dos dados do relatorio
 * Cada elemento unico aparece em sua propria linha com URL da pagina
 */
function generateCsv(data: import('@/lib/reports').ReportData): string {
  // Headers completos para desenvolvedores
  const headers = [
    'URL da Pagina',
    'Severidade',
    'Regra',
    'Descricao do Problema',
    'Nivel WCAG',
    'Criterios WCAG',
    'Secao ABNT',
    'Seletor CSS',
    'XPath',
    'HTML do Elemento',
    'Como Corrigir',
    'HTML Sugerido (IA)',
    'Link Documentacao WCAG',
    'Prioridade',
    'Regra Brasileira',
    'ID Violacao',
  ]

  const rows: string[][] = []

  // Para cada violacao, expande todos os elementos unicos
  for (const v of data.violations) {
    // Se tiver elementos unicos, cria uma linha para cada elemento/pagina
    if (v.uniqueElements && v.uniqueElements.length > 0) {
      for (const element of v.uniqueElements) {
        // Criar uma linha para cada pagina onde o elemento aparece
        for (const pageUrl of element.pages) {
          rows.push([
            pageUrl,
            v.impactLabel,
            v.ruleLabel,
            escapeCsvField(v.description),
            v.wcagLevel || '',
            v.wcagCriteria.join(', '),
            v.abntSection || '',
            escapeCsvField(element.selector),
            escapeCsvField(element.xpath || ''),
            escapeCsvField(element.html),
            escapeCsvField(v.aiSuggestion || v.help),
            escapeCsvField(v.aiSuggestedHtml || ''),
            v.wcagDocUrl || v.helpUrl || '',
            String(v.priority),
            v.isCustomRule ? 'Sim' : 'Nao',
            v.id,
          ])
        }
      }
    } else {
      // Fallback: se nao tiver elementos unicos, usa os dados sample
      for (const pageUrl of v.affectedPages) {
        rows.push([
          pageUrl,
          v.impactLabel,
          v.ruleLabel,
          escapeCsvField(v.description),
          v.wcagLevel || '',
          v.wcagCriteria.join(', '),
          v.abntSection || '',
          escapeCsvField(v.sampleSelector),
          '', // XPath nao disponivel no fallback
          escapeCsvField(v.sampleHtml),
          escapeCsvField(v.aiSuggestion || v.help),
          escapeCsvField(v.aiSuggestedHtml || ''),
          v.wcagDocUrl || v.helpUrl || '',
          String(v.priority),
          v.isCustomRule ? 'Sim' : 'Nao',
          v.id,
        ])
      }
    }
  }

  // Ordenar por: Severidade (critico primeiro) > Prioridade > URL
  const severityOrder: Record<string, number> = {
    'Critico': 0,
    'Serio': 1,
    'Moderado': 2,
    'Menor': 3,
  }

  rows.sort((a, b) => {
    // Severidade
    const sevA = severityOrder[a[1]] ?? 4
    const sevB = severityOrder[b[1]] ?? 4
    if (sevA !== sevB) return sevA - sevB

    // Prioridade (maior primeiro)
    const prioA = parseInt(a[13]) || 0
    const prioB = parseInt(b[13]) || 0
    if (prioA !== prioB) return prioB - prioA

    // URL
    return a[0].localeCompare(b[0])
  })

  const csvLines = [headers.join(';'), ...rows.map((row) => row.join(';'))]

  // BOM para Excel reconhecer UTF-8
  return '\uFEFF' + csvLines.join('\n')
}

/**
 * Escapa campo CSV (ponto e virgula como separador)
 */
function escapeCsvField(value: string): string {
  if (!value) return ''
  // Remover quebras de linha e aspas, envolver em aspas
  const escaped = value.replace(/"/g, '""').replace(/[\r\n]+/g, ' ')
  return `"${escaped}"`
}
