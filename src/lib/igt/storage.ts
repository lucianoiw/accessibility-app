/**
 * IGT Storage
 *
 * Persistência de sessões IGT no Supabase.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { IGTSession, IGTSessionRow, IGTViolationRow, IGTResult } from './types'

// ============================================
// SESSION OPERATIONS
// ============================================

/**
 * Salva uma sessão no banco
 */
export async function saveSession(
  supabase: SupabaseClient,
  session: IGTSession
): Promise<void> {
  const row: Partial<IGTSessionRow> = {
    id: session.id,
    audit_id: session.auditId,
    igt_id: session.igtId,
    status: session.status,
    current_candidate_index: session.currentCandidateIndex,
    total_candidates: session.totalCandidates,
    candidates: session.candidates as unknown as IGTSessionRow['candidates'],
    answers: session.answers as unknown as IGTSessionRow['answers'],
    results: session.results as unknown as IGTSessionRow['results'],
    started_at: session.startedAt,
    completed_at: session.completedAt,
    user_id: session.userId,
  }

  const { error } = await supabase
    .from('igt_sessions')
    .upsert(row, { onConflict: 'audit_id,igt_id' })

  if (error) {
    console.error('[IGT Storage] Failed to save session:', error)
    throw new Error(`Failed to save IGT session: ${error.message}`)
  }
}

/**
 * Carrega uma sessão do banco
 */
export async function loadSession(
  supabase: SupabaseClient,
  auditId: string,
  igtId: string
): Promise<IGTSession | null> {
  const { data, error } = await supabase
    .from('igt_sessions')
    .select('*')
    .eq('audit_id', auditId)
    .eq('igt_id', igtId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    console.error('[IGT Storage] Failed to load session:', error)
    throw new Error(`Failed to load IGT session: ${error.message}`)
  }

  return rowToSession(data)
}

/**
 * Carrega uma sessão pelo ID
 */
export async function loadSessionById(
  supabase: SupabaseClient,
  sessionId: string
): Promise<IGTSession | null> {
  const { data, error } = await supabase
    .from('igt_sessions')
    .select('*')
    .eq('id', sessionId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('[IGT Storage] Failed to load session by ID:', error)
    throw new Error(`Failed to load IGT session: ${error.message}`)
  }

  return rowToSession(data)
}

/**
 * Lista sessões de uma auditoria
 */
export async function getSessionsByAudit(
  supabase: SupabaseClient,
  auditId: string
): Promise<IGTSession[]> {
  const { data, error } = await supabase
    .from('igt_sessions')
    .select('*')
    .eq('audit_id', auditId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[IGT Storage] Failed to list sessions:', error)
    throw new Error(`Failed to list IGT sessions: ${error.message}`)
  }

  return data.map(rowToSession)
}

/**
 * Deleta uma sessão
 */
export async function deleteSession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('igt_sessions')
    .delete()
    .eq('id', sessionId)

  if (error) {
    console.error('[IGT Storage] Failed to delete session:', error)
    throw new Error(`Failed to delete IGT session: ${error.message}`)
  }
}

// ============================================
// VIOLATION OPERATIONS
// ============================================

/**
 * Salva violações geradas por um IGT
 */
export async function saveViolations(
  supabase: SupabaseClient,
  session: IGTSession,
  violations: IGTResult['violation'][]
): Promise<void> {
  const rows: Partial<IGTViolationRow>[] = violations
    .filter((v): v is NonNullable<IGTResult['violation']> => v !== undefined)
    .map(v => ({
      audit_id: session.auditId,
      session_id: session.id,
      igt_id: session.igtId,
      candidate_id: v.selector, // Usando selector como candidate_id
      rule_id: v.ruleId,
      impact: v.impact,
      help: v.help,
      description: v.description,
      selector: v.selector,
      html: v.html,
      page_url: v.pageUrl,
      user_id: session.userId,
    }))

  if (rows.length === 0) return

  const { error } = await supabase
    .from('igt_violations')
    .insert(rows)

  if (error) {
    console.error('[IGT Storage] Failed to save violations:', error)
    throw new Error(`Failed to save IGT violations: ${error.message}`)
  }
}

/**
 * Lista violações de uma auditoria geradas por IGTs
 */
export async function getViolationsByAudit(
  supabase: SupabaseClient,
  auditId: string
): Promise<IGTViolationRow[]> {
  const { data, error } = await supabase
    .from('igt_violations')
    .select('*')
    .eq('audit_id', auditId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[IGT Storage] Failed to list violations:', error)
    throw new Error(`Failed to list IGT violations: ${error.message}`)
  }

  return data
}

/**
 * Lista violações de uma sessão específica
 */
export async function getViolationsBySession(
  supabase: SupabaseClient,
  sessionId: string
): Promise<IGTViolationRow[]> {
  const { data, error } = await supabase
    .from('igt_violations')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[IGT Storage] Failed to list session violations:', error)
    throw new Error(`Failed to list IGT session violations: ${error.message}`)
  }

  return data
}

// ============================================
// HELPERS
// ============================================

/**
 * Converte row do banco para IGTSession
 */
function rowToSession(row: IGTSessionRow): IGTSession {
  return {
    id: row.id,
    auditId: row.audit_id,
    igtId: row.igt_id,
    status: row.status,
    currentCandidateIndex: row.current_candidate_index,
    totalCandidates: row.total_candidates,
    candidates: row.candidates as IGTSession['candidates'],
    answers: row.answers as IGTSession['answers'],
    results: row.results as IGTSession['results'],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    userId: row.user_id,
  }
}

/**
 * Obtém estatísticas de IGTs para uma auditoria
 */
export async function getIGTStats(
  supabase: SupabaseClient,
  auditId: string
): Promise<{
  totalSessions: number
  completedSessions: number
  totalViolations: number
  violationsByImpact: Record<string, number>
}> {
  // Buscar sessões
  const { data: sessions, error: sessionsError } = await supabase
    .from('igt_sessions')
    .select('id, status')
    .eq('audit_id', auditId)

  if (sessionsError) {
    throw new Error(`Failed to get IGT stats: ${sessionsError.message}`)
  }

  // Buscar violações
  const { data: violations, error: violationsError } = await supabase
    .from('igt_violations')
    .select('id, impact')
    .eq('audit_id', auditId)

  if (violationsError) {
    throw new Error(`Failed to get IGT stats: ${violationsError.message}`)
  }

  // Calcular estatísticas
  const violationsByImpact: Record<string, number> = {}
  for (const v of violations || []) {
    violationsByImpact[v.impact] = (violationsByImpact[v.impact] || 0) + 1
  }

  return {
    totalSessions: sessions?.length || 0,
    completedSessions: sessions?.filter(s => s.status === 'completed').length || 0,
    totalViolations: violations?.length || 0,
    violationsByImpact,
  }
}
