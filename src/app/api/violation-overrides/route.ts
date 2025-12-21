import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCsrfValid } from '@/lib/csrf'
import { z } from 'zod'

// Schema para criar/atualizar override
const OverrideSchema = z.object({
  id: z.string().uuid().optional(), // Para update
  project_id: z.string().uuid(),
  rule_id: z.string().min(1),
  element_xpath: z.string().nullable().optional(),
  element_content_hash: z.string().nullable().optional(),
  override_type: z.enum(['false_positive', 'ignored', 'fixed']),
  notes: z.string().nullable().optional(),
})

// POST - Criar novo override
export async function POST(request: NextRequest) {
  try {
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = OverrideSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: validation.error.flatten() },
        { status: 400 }
      )
    }

    const { project_id, rule_id, element_xpath, element_content_hash, override_type, notes } = validation.data

    // Verificar se o usuário é dono do projeto
    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', project_id)
      .single() as { data: { id: string; user_id: string } | null }

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Verificar se já existe um override para esta combinação
    // O unique index usa COALESCE, então precisamos fazer check manual
    let query = (supabase as any)
      .from('violation_overrides')
      .select('id')
      .eq('project_id', project_id)
      .eq('rule_id', rule_id)

    // Handle nullable columns - use 'is' for null, 'eq' for values
    if (element_xpath) {
      query = query.eq('element_xpath', element_xpath)
    } else {
      query = query.is('element_xpath', null)
    }

    if (element_content_hash) {
      query = query.eq('element_content_hash', element_content_hash)
    } else {
      query = query.is('element_content_hash', null)
    }

    const { data: existing } = await query.maybeSingle()

    let data, error

    if (existing) {
      // Atualizar existente
      const result = await (supabase as any)
        .from('violation_overrides')
        .update({
          override_type,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()
      data = result.data
      error = result.error
    } else {
      // Criar novo
      const result = await (supabase as any)
        .from('violation_overrides')
        .insert({
          project_id,
          rule_id,
          element_xpath: element_xpath || null,
          element_content_hash: element_content_hash || null,
          override_type,
          notes: notes || null,
          created_by: user.id,
        })
        .select()
        .single()
      data = result.data
      error = result.error
    }

    if (error) {
      console.error('[violation-overrides] POST error:', error)
      return NextResponse.json({ error: 'Erro ao salvar avaliação' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[violation-overrides] POST error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// PUT - Atualizar override existente
export async function PUT(request: NextRequest) {
  try {
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const validation = OverrideSchema.safeParse(body)

    if (!validation.success || !validation.data.id) {
      return NextResponse.json(
        { error: 'Dados inválidos ou ID faltando' },
        { status: 400 }
      )
    }

    const { id, project_id, override_type, notes } = validation.data

    // Verificar se o usuário é dono do projeto
    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', project_id)
      .single() as { data: { id: string; user_id: string } | null }

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Atualizar override
    const { data, error } = await (supabase as any)
      .from('violation_overrides')
      .update({
        override_type,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('project_id', project_id) // Extra safety
      .select()
      .single()

    if (error) {
      console.error('[violation-overrides] PUT error:', error)
      return NextResponse.json({ error: 'Erro ao atualizar avaliação' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[violation-overrides] PUT error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// DELETE - Remover override
export async function DELETE(request: NextRequest) {
  try {
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 })
    }

    // Buscar override para verificar ownership via project
    const { data: override } = await (supabase as any)
      .from('violation_overrides')
      .select('id, project_id')
      .eq('id', id)
      .single()

    if (!override) {
      return NextResponse.json({ error: 'Avaliação não encontrada' }, { status: 404 })
    }

    // Verificar se o usuário é dono do projeto
    const { data: project } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', override.project_id)
      .single() as { data: { id: string; user_id: string } | null }

    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Deletar override
    const { error } = await (supabase as any)
      .from('violation_overrides')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[violation-overrides] DELETE error:', error)
      return NextResponse.json({ error: 'Erro ao remover avaliação' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[violation-overrides] DELETE error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
