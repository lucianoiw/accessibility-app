import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { evaluateEmagCompliance } from '@/lib/audit/emag-evaluator'
import type { Audit } from '@/types'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/audits/[id]/emag
 * Retorna o relatorio de conformidade eMAG 3.1 para uma auditoria
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id: auditId } = await params
  const supabase = await createClient()

  // Verificar autenticacao
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })
  }

  // Verificar se a auditoria existe e pertence ao usuario
  const { data: audit } = (await supabase
    .from('audits')
    .select('*, projects!inner(*)')
    .eq('id', auditId)
    .single()) as { data: Audit | null }

  if (!audit) {
    return NextResponse.json({ error: 'Auditoria nao encontrada' }, { status: 404 })
  }

  // Verificar se a auditoria esta completa
  if (audit.status !== 'COMPLETED') {
    return NextResponse.json(
      { error: 'Auditoria ainda nao foi concluida', status: audit.status },
      { status: 400 }
    )
  }

  try {
    // Gerar relatorio de conformidade eMAG
    const report = await evaluateEmagCompliance(auditId)

    return NextResponse.json(report)
  } catch (error) {
    console.error('Erro ao gerar relatorio eMAG:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar relatorio de conformidade eMAG' },
      { status: 500 }
    )
  }
}
