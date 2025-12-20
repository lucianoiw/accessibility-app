/**
 * Tipos para o sistema de Intelligent Guided Tests (IGT)
 *
 * IGTs são testes semi-automatizados onde o usuário responde perguntas
 * simples para validar casos que automação pura não consegue resolver.
 */

import type { ImpactLevel } from '@/types'

// ============================================
// TIPOS BASE
// ============================================

/**
 * Status de um IGT
 */
export type IGTStatus =
  | 'not_started'   // Nunca executado
  | 'in_progress'   // Sendo executado
  | 'completed'     // Todas as perguntas respondidas
  | 'skipped'       // Pulado pelo usuário

/**
 * Tipo de pergunta em um IGT
 */
export type QuestionType =
  | 'yes_no'              // Sim/Não
  | 'yes_no_unsure'       // Sim/Não/Não tenho certeza
  | 'multiple_choice'     // Múltipla escolha
  | 'element_select'      // Selecionar elemento na página
  | 'text_input'          // Entrada de texto livre
  | 'rating'              // Escala (1-5)

/**
 * Resultado de uma resposta
 */
export type AnswerResult =
  | 'pass'        // Passa no teste
  | 'fail'        // Falha no teste
  | 'warning'     // Aviso (não é erro, mas atenção)
  | 'needs_more'  // Precisa de mais informação
  | 'skip'        // Pulado

/**
 * Categoria de IGT
 */
export type IGTCategory =
  | 'images'
  | 'links'
  | 'forms'
  | 'keyboard'
  | 'sign-language'
  | 'contrast'
  | 'structure'
  | 'multimedia'

// ============================================
// ESTRUTURA DE IGT
// ============================================

/**
 * Contexto da auditoria para o IGT
 */
export interface IGTAuditContext {
  auditId: string
  projectId: string
  baseUrl: string
  violations: Array<{
    id: string
    ruleId: string
    selector: string
    html: string
    pageUrl: string
    confidenceLevel?: string
  }>
  pages: Array<{
    url: string
    title: string
  }>
  includeEmag: boolean
  includeCoga: boolean
}

/**
 * Candidato para teste em um IGT
 * Elemento que precisa ser avaliado pelo usuário
 */
export interface IGTCandidate {
  id: string                    // ID único do candidato
  elementType: string           // 'img', 'a', 'button', etc
  selector: string              // CSS selector
  xpath?: string                // XPath
  html: string                  // HTML do elemento
  pageUrl: string               // URL da página
  screenshot?: string           // Base64 do screenshot do elemento

  // Dados extras dependendo do tipo
  attributes?: Record<string, string>
  surroundingText?: string

  // Referência à violação original (se aplicável)
  violationId?: string

  // Pré-classificação por ML (Fase 3)
  mlPrediction?: {
    predictedResult: AnswerResult
    confidence: number
    reason: string
  }
}

/**
 * Opção de múltipla escolha
 */
export interface QuestionOption {
  value: string
  label: string
  resultMapping: AnswerResult
}

/**
 * Mapeamento de resultado por resposta
 */
export interface ResultMapping {
  yes?: AnswerResult
  no?: AnswerResult
  unsure?: AnswerResult
}

/**
 * Pergunta de um IGT
 */
export interface IGTQuestion {
  id: string
  order: number
  type: QuestionType
  textKey: string               // Chave de tradução
  helpTextKey?: string          // Chave de tradução para texto de ajuda

  // Para multiple_choice
  options?: QuestionOption[]

  // Para element_select
  elementFilter?: string

  // Condição para mostrar esta pergunta
  showIf?: (previousAnswers: IGTAnswer[]) => boolean

  // Como interpretar a resposta
  resultMapping?: ResultMapping
}

/**
 * Resposta do usuário a uma pergunta
 */
export interface IGTAnswer {
  questionId: string
  candidateId: string
  value: string | string[] | number | boolean
  timestamp: string

  // Para element_select
  selectedElements?: string[]

  // Comentário opcional
  comment?: string
}

/**
 * Resultado de um IGT para um candidato
 */
export interface IGTResult {
  candidateId: string
  result: AnswerResult
  confidence: number

  // Se falha, dados para criar violação
  violation?: {
    ruleId: string
    impact: ImpactLevel
    help: string
    description: string
    selector: string
    html: string
    pageUrl: string
  }

  // Se warning, mensagem
  warningMessage?: string
}

/**
 * Definição de um IGT
 */
export interface IGTDefinition {
  id: string
  nameKey: string               // Chave de tradução
  descriptionKey: string        // Chave de tradução
  category: IGTCategory
  wcagCriteria: string[]        // Ex: ['1.1.1', '2.4.4']

  // Mapeamentos regionais opcionais
  emagRecommendations?: string[]
  section508?: string[]
  en301549?: string[]

  estimatedMinutes: number

  // Função que determina se este IGT é relevante
  isRelevant: (context: IGTAuditContext) => boolean

  // Função que retorna os elementos candidatos
  getCandidates: (context: IGTAuditContext) => Promise<IGTCandidate[]>

  // Perguntas do teste
  questions: IGTQuestion[]

  // Função que processa as respostas
  processResults: (answers: IGTAnswer[], candidates: IGTCandidate[]) => IGTResult[]
}

// ============================================
// SESSÃO DE IGT
// ============================================

/**
 * Sessão de execução de IGT
 */
export interface IGTSession {
  id: string
  auditId: string
  igtId: string
  status: IGTStatus

  // Progresso
  currentCandidateIndex: number
  totalCandidates: number

  // Dados
  candidates: IGTCandidate[]
  answers: IGTAnswer[]
  results: IGTResult[]

  // Timestamps
  startedAt: string | null
  completedAt: string | null

  // Usuário
  userId: string
}

/**
 * Resumo de IGT para listagem
 */
export interface IGTSummary {
  id: string
  nameKey: string
  descriptionKey: string
  category: IGTCategory
  estimatedMinutes: number

  // Status da sessão (se existir)
  session?: {
    status: IGTStatus
    progress: number  // 0-100
    completedAt?: string
  }

  // Candidatos pendentes
  candidateCount: number

  // Resultados (se completo)
  results?: {
    pass: number
    fail: number
    warning: number
  }
}

// ============================================
// DATABASE TYPES
// ============================================

/**
 * Tabela igt_sessions no banco
 */
export interface IGTSessionRow {
  id: string
  audit_id: string
  igt_id: string
  status: IGTStatus
  current_candidate_index: number
  total_candidates: number
  candidates: IGTCandidate[]
  answers: IGTAnswer[]
  results: IGTResult[]
  started_at: string | null
  completed_at: string | null
  user_id: string
  created_at: string
  updated_at: string
}

/**
 * Tabela igt_violations no banco
 * Violações geradas por IGTs
 */
export interface IGTViolationRow {
  id: string
  audit_id: string
  session_id: string
  igt_id: string
  candidate_id: string
  rule_id: string
  impact: ImpactLevel
  help: string
  description: string
  selector: string
  html: string
  page_url: string
  user_id: string
  created_at: string
}
