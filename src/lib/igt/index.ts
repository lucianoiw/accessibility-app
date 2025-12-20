/**
 * Intelligent Guided Tests (IGT)
 *
 * Sistema de testes semi-automatizados para cobrir casos
 * que automação pura não consegue resolver.
 */

// Types
export * from './types'

// Registry
export {
  registerIGT,
  getIGT,
  getAllIGTs,
  getIGTsByCategory,
  getRelevantIGTs,
  getIGTSummaries,
  initializeIGTRegistry,
  IGT_CATEGORY_KEYS,
  IGT_CATEGORY_ICONS,
} from './registry'

// Runner
export {
  startIGT,
  getRunnerState,
  answerQuestion,
  nextCandidate,
  skipCandidate,
  completeSession,
  skipSession,
  isCandidateComplete,
  getResultsSummary,
  getGeneratedViolations,
  type IGTRunnerState,
  type StartIGTOptions,
  type AnswerQuestionOptions,
} from './runner'

// Storage
export {
  saveSession,
  loadSession,
  loadSessionById,
  getSessionsByAudit,
  deleteSession,
  saveViolations,
  getViolationsByAudit,
  getViolationsBySession,
  getIGTStats,
} from './storage'
