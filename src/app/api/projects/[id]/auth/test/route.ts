import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Project, AuthConfig } from '@/types'
import { AuthConfigSchema, validateInput } from '@/lib/validations'
import { requireCsrfValid } from '@/lib/csrf'
import { tasks, runs } from '@trigger.dev/sdk/v3'
import type { testAuthTask } from '@/trigger/test-auth'

interface Props {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Props) {
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

  // Buscar projeto
  const { data: project } = (await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single()) as { data: Project | null }

  if (!project) {
    return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
  }

  if (project.user_id !== user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  // Obter e validar config do request
  const body = await request.json()
  const { authConfig } = body as { authConfig: AuthConfig | null }

  // Validar authConfig se fornecido
  if (authConfig !== null) {
    const validation = validateInput(AuthConfigSchema, authConfig)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      )
    }
  }

  try {
    console.log(`[Auth Test] Triggering test for ${project.base_url}`)
    console.log(`[Auth Test] Using auth: ${authConfig?.type || 'none'}`)

    // Executar teste via Trigger.dev (onde Playwright está disponível)
    // Usar trigger + poll pois triggerAndWait só funciona dentro de tasks
    const handle = await tasks.trigger<typeof testAuthTask>(
      'test-auth',
      {
        baseUrl: project.base_url,
        authConfig,
      }
    )

    // Aguardar conclusão do task (poll a cada 500ms, timeout de 60s)
    const run = await runs.poll(handle.id, { pollIntervalMs: 500 })

    if (run.status !== 'COMPLETED') {
      console.error('[Auth Test] Task failed:', run.status)
      return NextResponse.json({
        success: false,
        statusCode: 0,
        testedUrl: project.base_url,
        authUsed: authConfig?.type || 'none',
        message: 'Erro ao executar teste de conexão. Tente novamente.',
      })
    }

    return NextResponse.json(run.output)
  } catch (error) {
    // Sanitize error - não expor detalhes internos
    const errorMessage = error instanceof Error ? error.message : 'Erro ao conectar'
    console.error('[Auth Test] Error:', { error: errorMessage })

    return NextResponse.json({
      success: false,
      statusCode: 0,
      testedUrl: project.base_url,
      authUsed: authConfig?.type || 'none',
      message: errorMessage,
    })
  }
}
