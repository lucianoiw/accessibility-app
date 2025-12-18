import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import type { AggregatedViolation } from '@/types'
import { requireCsrfValid } from '@/lib/csrf'

// Validar API key no startup
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[Suggest] ANTHROPIC_API_KEY not configured')
}

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

const MAX_SUGGESTION_LENGTH = 5000

export const maxDuration = 60

/**
 * POST /api/violations/[id]/suggest
 * Gera sugestão de correção usando IA
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Validar CSRF
  const csrf = await requireCsrfValid()
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 })
  }

  // 2. Verificar se IA está configurada
  if (!anthropic) {
    return NextResponse.json(
      { error: 'Funcionalidade de sugestões com IA não está configurada' },
      { status: 503 }
    )
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

  // Buscar a violação
  const { data: violation } = await supabase
    .from('aggregated_violations')
    .select(`
      *,
      audits!inner (
        project_id,
        projects!inner (
          user_id
        )
      )
    `)
    .eq('id', violationId)
    .single() as { data: AggregatedViolation & { audits: { project_id: string; projects: { user_id: string } } } | null }

  if (!violation) {
    return NextResponse.json({ error: 'Violação não encontrada' }, { status: 404 })
  }

  if (violation.audits.projects.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Se já tem sugestão, retornar
  if (violation.ai_suggestion) {
    return NextResponse.json({
      suggestion: violation.ai_suggestion,
      suggested_html: violation.ai_suggested_html,
      cached: true,
    })
  }

  try {
    // Gerar sugestão com Claude
    const prompt = `Você é um especialista em acessibilidade web. Analise este problema de acessibilidade e forneça:
1. Uma explicação simples do problema (2-3 frases)
2. O código HTML corrigido

PROBLEMA: ${violation.help}
DESCRIÇÃO: ${violation.description}
REGRA: ${violation.rule_id}
CRITÉRIO WCAG: ${violation.wcag_criteria?.join(', ') || 'N/A'}

HTML COM PROBLEMA:
\`\`\`html
${violation.sample_html}
\`\`\`

Responda em português brasileiro. Seja direto e prático.
Formato da resposta:
EXPLICAÇÃO: [sua explicação aqui]
HTML_CORRIGIDO: [código corrigido aqui]`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extrair explicação e HTML
    const explanationMatch = responseText.match(/EXPLICAÇÃO:\s*([\s\S]*?)(?=HTML_CORRIGIDO:|$)/i)
    const htmlMatch = responseText.match(/HTML_CORRIGIDO:\s*([\s\S]*?)$/i)

    const suggestion = (explanationMatch?.[1]?.trim() || responseText).substring(0, MAX_SUGGESTION_LENGTH)
    const suggestedHtml = htmlMatch?.[1]?.trim().replace(/```html\n?/g, '').replace(/```\n?/g, '').substring(0, MAX_SUGGESTION_LENGTH) || null

    // Salvar no banco
    const adminSupabase = createAdminClient()
    await adminSupabase
      .from('aggregated_violations')
      .update({
        ai_suggestion: suggestion,
        ai_suggested_html: suggestedHtml,
        ai_generated_at: new Date().toISOString(),
      } as never)
      .eq('id', violationId)

    return NextResponse.json({
      suggestion,
      suggested_html: suggestedHtml,
      cached: false,
    })
  } catch (error) {
    // Log completo no servidor
    console.error('[Suggest] Erro ao gerar sugestão:', {
      violationId,
      error: error instanceof Error ? error.stack : String(error),
    })

    // Mensagem genérica para cliente (não vazar detalhes da API)
    return NextResponse.json(
      { error: 'Erro ao gerar sugestão com IA. Tente novamente mais tarde.' },
      { status: 500 }
    )
  }
}
