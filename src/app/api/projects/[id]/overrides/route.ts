import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireCsrfValid } from '@/lib/csrf'
import { CreateViolationOverrideSchema, validateInput, isValidUUID } from '@/lib/validations'

interface Props {
  params: Promise<{ id: string }>
}

/**
 * Violation Override type from database
 */
interface ViolationOverride {
  id: string
  project_id: string
  rule_id: string
  element_xpath: string | null
  element_content_hash: string | null
  override_type: 'false_positive' | 'ignored' | 'fixed'
  notes: string | null
  created_by: string
  last_seen_at: string | null
  created_at: string
  updated_at: string
}

/**
 * GET /api/projects/[id]/overrides
 * Returns all violation overrides for a project
 * Query params: rule_id, override_type (optional filters)
 */
export async function GET(request: Request, { params }: Props) {
  try {
    const { id: projectId } = await params

    if (!isValidUUID(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Parse query params for filtering
    const url = new URL(request.url)
    const ruleId = url.searchParams.get('rule_id')
    const overrideType = url.searchParams.get('override_type')

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('violation_overrides')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (ruleId) {
      query = query.eq('rule_id', ruleId)
    }

    if (overrideType) {
      query = query.eq('override_type', overrideType)
    }

    const { data: overrides, error: overridesError } = await query

    if (overridesError) {
      console.error('[Overrides GET] Query error:', overridesError)
      return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 })
    }

    return NextResponse.json(overrides || [])
  } catch (error) {
    console.error('[Overrides GET] Error:', error)
    return NextResponse.json({ error: 'Failed to fetch overrides' }, { status: 500 })
  }
}

/**
 * POST /api/projects/[id]/overrides
 * Creates a new violation override or updates existing one
 */
export async function POST(request: Request, { params }: Props) {
  try {
    // Validate CSRF
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const { id: projectId } = await params

    if (!isValidUUID(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Validate body
    const body = await request.json()
    const validation = validateInput(CreateViolationOverrideSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error, details: validation.details },
        { status: 400 }
      )
    }

    const { rule_id, override_type, element_xpath, element_content_hash, notes } = validation.data

    // Upsert override (create or update)
    // Using upsert with the unique constraint on (project_id, rule_id, element_xpath, element_content_hash)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: override, error: upsertError } = await (supabase as any)
      .from('violation_overrides')
      .upsert(
        {
          project_id: projectId,
          rule_id,
          override_type,
          element_xpath: element_xpath || null,
          element_content_hash: element_content_hash || null,
          notes: notes || null,
          created_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'project_id,rule_id,COALESCE(element_xpath,\'\'),COALESCE(element_content_hash,\'\')',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('[Overrides POST] Upsert error:', upsertError)

      // If unique constraint fails, try update instead
      if (upsertError.code === '23505' || upsertError.message?.includes('unique')) {
        // Find existing and update
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existing } = await (supabase as any)
          .from('violation_overrides')
          .select('id')
          .eq('project_id', projectId)
          .eq('rule_id', rule_id)
          .eq('element_xpath', element_xpath || '')
          .eq('element_content_hash', element_content_hash || '')
          .single()

        if (existing) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: updated, error: updateError } = await (supabase as any)
            .from('violation_overrides')
            .update({
              override_type,
              notes: notes || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single()

          if (updateError) {
            console.error('[Overrides POST] Update error:', updateError)
            return NextResponse.json({ error: 'Failed to update override' }, { status: 500 })
          }

          return NextResponse.json(updated)
        }
      }

      return NextResponse.json({ error: 'Failed to create override' }, { status: 500 })
    }

    return NextResponse.json(override, { status: 201 })
  } catch (error) {
    console.error('[Overrides POST] Error:', error)
    return NextResponse.json({ error: 'Failed to create override' }, { status: 500 })
  }
}

/**
 * DELETE /api/projects/[id]/overrides
 * Deletes a violation override by ID (passed as query param)
 * Query param: override_id
 */
export async function DELETE(request: Request, { params }: Props) {
  try {
    // Validate CSRF
    const csrf = await requireCsrfValid()
    if (!csrf.valid) {
      return NextResponse.json({ error: csrf.error }, { status: 403 })
    }

    const { id: projectId } = await params

    if (!isValidUUID(projectId)) {
      return NextResponse.json({ error: 'Invalid project ID' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify project ownership
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if ((project as { user_id: string }).user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get override_id from query param
    const url = new URL(request.url)
    const overrideId = url.searchParams.get('override_id')

    if (!overrideId || !isValidUUID(overrideId)) {
      return NextResponse.json({ error: 'Invalid override_id' }, { status: 400 })
    }

    // Delete override (RLS will ensure it belongs to user's project)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('violation_overrides')
      .delete()
      .eq('id', overrideId)
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('[Overrides DELETE] Error:', deleteError)
      return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Overrides DELETE] Error:', error)
    return NextResponse.json({ error: 'Failed to delete override' }, { status: 500 })
  }
}
