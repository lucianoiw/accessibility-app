import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { AuthConfig } from '@/types'
import { requireCsrfValid } from '@/lib/csrf'

interface Props {
  params: Promise<{ id: string }>
}

export async function PUT(request: Request, { params }: Props) {
  // Validar CSRF
  const csrf = await requireCsrfValid()
  if (!csrf.valid) {
    return NextResponse.json({ error: csrf.error }, { status: 403 })
  }

  const { id } = await params
  const supabase = await createClient()

  // Verificar autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  // Verificar se o projeto existe e pertence ao usuário
  const { data: project } = (await supabase
    .from('projects')
    .select('id, user_id')
    .eq('id', id)
    .single()) as { data: { id: string; user_id: string } | null }

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Obter dados do request
  const body = await request.json()
  const { authConfig } = body as { authConfig: AuthConfig | null }

  // Validar config
  if (authConfig !== null) {
    if (!authConfig.type || !['none', 'bearer', 'cookie'].includes(authConfig.type)) {
      return NextResponse.json(
        { error: 'Tipo de autenticação inválido' },
        { status: 400 }
      )
    }

    if (authConfig.type === 'bearer' && !authConfig.token) {
      return NextResponse.json(
        { error: 'Token é obrigatório para autenticação Bearer' },
        { status: 400 }
      )
    }

    if (authConfig.type === 'cookie' && !authConfig.cookies) {
      return NextResponse.json(
        { error: 'Cookies são obrigatórios para autenticação por Cookie' },
        { status: 400 }
      )
    }
  }

  // Atualizar projeto
  const { error } = await supabase
    .from('projects')
    .update({ auth_config: authConfig } as never)
    .eq('id', id)

  if (error) {
    console.error('Erro ao atualizar auth config:', error)
    return NextResponse.json(
      { error: 'Erro ao salvar configuração' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
