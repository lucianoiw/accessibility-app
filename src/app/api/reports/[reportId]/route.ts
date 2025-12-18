import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Report } from '@/types'
import { requireCsrfValid } from '@/lib/csrf'

interface RouteParams {
  params: Promise<{ reportId: string }>
}

/**
 * GET /api/reports/:reportId
 * Obtem status e dados de um relatorio especifico
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { reportId } = await params
    const supabase = await createClient()

    // Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    // Buscar relatorio com join para verificar ownership
    const { data: report, error: reportError } = (await supabase
      .from('reports')
      .select(`
        *,
        audits!inner(
          id,
          projects!inner(user_id)
        )
      `)
      .eq('id', reportId)
      .single()) as {
      data: Report & { audits: { id: string; projects: { user_id: string } } } | null
      error: Error | null
    }

    if (reportError || !report) {
      return NextResponse.json({ error: 'Relatorio nao encontrado' }, { status: 404 })
    }

    if (report.audits.projects.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Remover dados do join da resposta
    const { audits, ...reportData } = report

    return NextResponse.json({ report: reportData as Report })
  } catch (error) {
    console.error('Erro ao buscar relatorio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/reports/:reportId
 * Remove um relatorio
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    // Validar CSRF
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const { reportId } = await params
    const supabase = await createClient()

    // Verificar autenticacao
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 })
    }

    // Buscar relatorio com join para verificar ownership
    const { data: report, error: reportError } = (await supabase
      .from('reports')
      .select(`
        *,
        audits!inner(
          id,
          projects!inner(user_id)
        )
      `)
      .eq('id', reportId)
      .single()) as {
      data: Report & { audits: { id: string; projects: { user_id: string } } } | null
      error: Error | null
    }

    if (reportError || !report) {
      return NextResponse.json({ error: 'Relatorio nao encontrado' }, { status: 404 })
    }

    if (report.audits.projects.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Se tiver arquivo no storage, remover
    if (report.file_url) {
      // Extrair path do storage da URL
      const urlParts = report.file_url.split('/storage/v1/object/public/reports/')
      if (urlParts.length === 2) {
        const storagePath = urlParts[1]
        await supabase.storage.from('reports').remove([storagePath])
      }
    }

    // Remover registro
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)

    if (deleteError) {
      console.error('Erro ao remover relatorio:', deleteError)
      return NextResponse.json(
        { error: 'Erro ao remover relatorio' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao remover relatorio:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}
