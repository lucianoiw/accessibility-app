/**
 * IGT Runner
 *
 * Gerencia a execução de IGTs: iniciar, pausar, retomar, completar.
 */

import type {
  IGTDefinition,
  IGTSession,
  IGTAnswer,
  IGTResult,
  IGTCandidate,
  IGTAuditContext,
  IGTQuestion,
} from './types'
import { getIGT } from './registry'

// ============================================
// TYPES
// ============================================

export interface IGTRunnerState {
  session: IGTSession
  currentCandidate: IGTCandidate | null
  currentQuestion: IGTQuestion | null
  progress: number
  isComplete: boolean
}

export interface StartIGTOptions {
  igtId: string
  auditId: string
  userId: string
  context: IGTAuditContext
}

export interface AnswerQuestionOptions {
  session: IGTSession
  candidateId: string
  questionId: string
  value: string | string[] | number | boolean
  comment?: string
}

// ============================================
// RUNNER FUNCTIONS
// ============================================

/**
 * Inicia uma nova sessão de IGT
 */
export async function startIGT(options: StartIGTOptions): Promise<IGTSession> {
  const { igtId, auditId, userId, context } = options

  const igt = getIGT(igtId)
  if (!igt) {
    throw new Error(`IGT "${igtId}" not found`)
  }

  // Obter candidatos
  const candidates = await igt.getCandidates(context)

  if (candidates.length === 0) {
    throw new Error(`No candidates found for IGT "${igtId}"`)
  }

  const session: IGTSession = {
    id: crypto.randomUUID(),
    auditId,
    igtId,
    status: 'in_progress',
    currentCandidateIndex: 0,
    totalCandidates: candidates.length,
    candidates,
    answers: [],
    results: [],
    startedAt: new Date().toISOString(),
    completedAt: null,
    userId,
  }

  return session
}

/**
 * Obtém o estado atual do runner
 */
export function getRunnerState(session: IGTSession): IGTRunnerState {
  const igt = getIGT(session.igtId)
  if (!igt) {
    throw new Error(`IGT "${session.igtId}" not found`)
  }

  const currentCandidate = session.candidates[session.currentCandidateIndex] || null
  const progress = session.totalCandidates > 0
    ? Math.round((session.currentCandidateIndex / session.totalCandidates) * 100)
    : 0

  // Encontrar próxima pergunta não respondida para o candidato atual
  let currentQuestion: IGTQuestion | null = null

  if (currentCandidate) {
    const candidateAnswers = session.answers.filter(
      a => a.candidateId === currentCandidate.id
    )
    const answeredQuestionIds = new Set(candidateAnswers.map(a => a.questionId))

    // Encontrar primeira pergunta não respondida que deve ser mostrada
    for (const question of igt.questions) {
      if (answeredQuestionIds.has(question.id)) continue

      // Verificar condição showIf
      if (question.showIf && !question.showIf(candidateAnswers)) {
        continue
      }

      currentQuestion = question
      break
    }
  }

  const isComplete = session.status === 'completed' ||
    (session.currentCandidateIndex >= session.totalCandidates && currentQuestion === null)

  return {
    session,
    currentCandidate,
    currentQuestion,
    progress,
    isComplete,
  }
}

/**
 * Registra uma resposta
 */
export function answerQuestion(options: AnswerQuestionOptions): IGTSession {
  const { session, candidateId, questionId, value, comment } = options

  const answer: IGTAnswer = {
    questionId,
    candidateId,
    value,
    timestamp: new Date().toISOString(),
    comment,
  }

  const updatedSession: IGTSession = {
    ...session,
    answers: [...session.answers, answer],
  }

  return updatedSession
}

/**
 * Avança para o próximo candidato
 */
export function nextCandidate(session: IGTSession): IGTSession {
  const igt = getIGT(session.igtId)
  if (!igt) {
    throw new Error(`IGT "${session.igtId}" not found`)
  }

  const nextIndex = session.currentCandidateIndex + 1

  if (nextIndex >= session.totalCandidates) {
    // Completar sessão
    const results = igt.processResults(session.answers, session.candidates)

    return {
      ...session,
      currentCandidateIndex: nextIndex,
      status: 'completed',
      completedAt: new Date().toISOString(),
      results,
    }
  }

  return {
    ...session,
    currentCandidateIndex: nextIndex,
  }
}

/**
 * Pula o candidato atual
 */
export function skipCandidate(session: IGTSession): IGTSession {
  const currentCandidate = session.candidates[session.currentCandidateIndex]

  if (!currentCandidate) {
    return session
  }

  // Adicionar resposta de skip para todas as perguntas
  const igt = getIGT(session.igtId)
  if (!igt) {
    throw new Error(`IGT "${session.igtId}" not found`)
  }

  const skipAnswers: IGTAnswer[] = igt.questions.map(q => ({
    questionId: q.id,
    candidateId: currentCandidate.id,
    value: 'skip',
    timestamp: new Date().toISOString(),
  }))

  const updatedSession: IGTSession = {
    ...session,
    answers: [...session.answers, ...skipAnswers],
  }

  return nextCandidate(updatedSession)
}

/**
 * Completa a sessão manualmente (mesmo com candidatos pendentes)
 */
export function completeSession(session: IGTSession): IGTSession {
  const igt = getIGT(session.igtId)
  if (!igt) {
    throw new Error(`IGT "${session.igtId}" not found`)
  }

  const results = igt.processResults(session.answers, session.candidates)

  return {
    ...session,
    status: 'completed',
    completedAt: new Date().toISOString(),
    results,
  }
}

/**
 * Pula a sessão inteira
 */
export function skipSession(session: IGTSession): IGTSession {
  return {
    ...session,
    status: 'skipped',
    completedAt: new Date().toISOString(),
    results: [],
  }
}

/**
 * Verifica se todas as perguntas do candidato atual foram respondidas
 */
export function isCandidateComplete(session: IGTSession): boolean {
  const state = getRunnerState(session)
  return state.currentQuestion === null
}

/**
 * Obtém resumo de resultados
 */
export function getResultsSummary(session: IGTSession): {
  pass: number
  fail: number
  warning: number
  skip: number
  total: number
} {
  const results = session.results

  return {
    pass: results.filter(r => r.result === 'pass').length,
    fail: results.filter(r => r.result === 'fail').length,
    warning: results.filter(r => r.result === 'warning').length,
    skip: results.filter(r => r.result === 'skip').length,
    total: results.length,
  }
}

/**
 * Obtém violações geradas pela sessão
 */
export function getGeneratedViolations(session: IGTSession): IGTResult['violation'][] {
  return session.results
    .filter(r => r.violation)
    .map(r => r.violation!)
}
