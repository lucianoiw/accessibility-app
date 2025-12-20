/**
 * IGT: Propósito de Links
 *
 * Testa se o texto do link descreve adequadamente o destino.
 * Automação detecta textos genéricos como "clique aqui" mas não
 * pode verificar se o contexto torna o link compreensível.
 *
 * WCAG: 2.4.4 Link Purpose (In Context)
 * eMAG: 3.5 Descrição de links
 */

import type {
  IGTDefinition,
  IGTCandidate,
  IGTAnswer,
  IGTResult,
  IGTAuditContext,
  AnswerResult,
} from '../types'

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Extrai o texto de um link
 */
function extractLinkText(html: string): string {
  // Remove tags HTML e retorna texto
  return html.replace(/<[^>]+>/g, '').trim()
}

/**
 * Extrai o href de um link
 */
function extractHref(html: string): string | null {
  const match = html.match(/href\s*=\s*["']([^"']*)["']/i)
  return match ? match[1] : null
}

/**
 * Verifica se tem aria-label
 */
function hasAriaLabel(html: string): boolean {
  return /aria-label\s*=\s*["'][^"']+["']/i.test(html)
}

/**
 * Extrai aria-label
 */
function extractAriaLabel(html: string): string | null {
  const match = html.match(/aria-label\s*=\s*["']([^"']*)["']/i)
  return match ? match[1] : null
}

// ============================================
// IGT DEFINITION
// ============================================

export const linksPurposeIGT: IGTDefinition = {
  id: 'links-purpose',
  nameKey: 'IGT.links.name',
  descriptionKey: 'IGT.links.description',
  category: 'links',

  wcagCriteria: ['2.4.4'],
  emagRecommendations: ['3.5'],

  estimatedMinutes: 5,

  /**
   * Relevante se há violações de link
   */
  isRelevant: (context: IGTAuditContext): boolean => {
    const hasLinkViolations = context.violations.some(v =>
      ['link-texto-generico', 'link-name', 'rotulo-curto-ambiguo'].includes(v.ruleId)
    )

    return hasLinkViolations
  },

  /**
   * Obtém candidatos: links com texto suspeito
   */
  getCandidates: async (context: IGTAuditContext): Promise<IGTCandidate[]> => {
    const candidates: IGTCandidate[] = []

    for (const violation of context.violations) {
      if (!['link-texto-generico', 'link-name', 'rotulo-curto-ambiguo'].includes(violation.ruleId)) {
        continue
      }

      const text = extractLinkText(violation.html)
      const href = extractHref(violation.html)
      const ariaLabel = extractAriaLabel(violation.html)

      candidates.push({
        id: `violation-${violation.id}`,
        elementType: 'a',
        selector: violation.selector,
        html: violation.html,
        pageUrl: violation.pageUrl,
        violationId: violation.id,
        attributes: {
          text: text || '',
          href: href || '',
          ariaLabel: ariaLabel || '',
        },
        surroundingText: '', // Idealmente preenchido com contexto
      })
    }

    return candidates
  },

  /**
   * Perguntas do teste
   */
  questions: [
    {
      id: 'context-clear',
      order: 1,
      type: 'yes_no_unsure',
      textKey: 'IGT.links.questions.contextClear',
      helpTextKey: 'IGT.links.questions.contextClearHelp',
      resultMapping: {
        yes: 'pass',
        no: 'fail',
        unsure: 'warning',
      },
    },
    {
      id: 'destination-predictable',
      order: 2,
      type: 'yes_no',
      textKey: 'IGT.links.questions.destinationPredictable',
      helpTextKey: 'IGT.links.questions.destinationPredictableHelp',
      resultMapping: {
        yes: 'pass',
        no: 'fail',
      },
    },
    {
      id: 'needs-aria-label',
      order: 3,
      type: 'yes_no',
      textKey: 'IGT.links.questions.needsAriaLabel',
      helpTextKey: 'IGT.links.questions.needsAriaLabelHelp',
      // Só mostra se o contexto não é claro
      showIf: (answers) => {
        const contextClear = answers.find(a => a.questionId === 'context-clear')
        return contextClear?.value === 'no' || contextClear?.value === 'unsure'
      },
      resultMapping: {
        yes: 'needs_more',
        no: 'pass',
      },
    },
  ],

  /**
   * Processa respostas e gera resultados
   */
  processResults: (answers: IGTAnswer[], candidates: IGTCandidate[]): IGTResult[] => {
    const results: IGTResult[] = []

    // Agrupar respostas por candidato
    const answersByCandidate = new Map<string, IGTAnswer[]>()
    for (const answer of answers) {
      const existing = answersByCandidate.get(answer.candidateId) || []
      existing.push(answer)
      answersByCandidate.set(answer.candidateId, existing)
    }

    for (const candidate of candidates) {
      const candidateAnswers = answersByCandidate.get(candidate.id) || []

      if (candidateAnswers.length === 0) {
        results.push({
          candidateId: candidate.id,
          result: 'skip',
          confidence: 0,
        })
        continue
      }

      let finalResult: AnswerResult = 'pass'
      let confidence = 1.0

      const contextClear = candidateAnswers.find(a => a.questionId === 'context-clear')
      const destinationPredictable = candidateAnswers.find(a => a.questionId === 'destination-predictable')
      const needsAriaLabel = candidateAnswers.find(a => a.questionId === 'needs-aria-label')

      // Lógica de processamento
      if (contextClear?.value === 'yes' && destinationPredictable?.value === 'yes') {
        // Link está ok no contexto
        finalResult = 'pass'
        confidence = 1.0
      } else if (contextClear?.value === 'no') {
        // Contexto não ajuda
        if (needsAriaLabel?.value === 'yes') {
          finalResult = 'fail'
          confidence = 1.0
        } else {
          // Contexto não é claro mas não precisa de aria-label
          finalResult = 'warning'
          confidence = 0.7
        }
      } else if (contextClear?.value === 'unsure') {
        finalResult = 'warning'
        confidence = 0.6
      } else if (destinationPredictable?.value === 'no') {
        finalResult = 'fail'
        confidence = 0.9
      }

      const result: IGTResult = {
        candidateId: candidate.id,
        result: finalResult,
        confidence,
      }

      // Se falhou, criar violação
      if (finalResult === 'fail') {
        const text = candidate.attributes?.text || ''

        result.violation = {
          ruleId: 'igt-link-purpose-unclear',
          impact: 'serious',
          help: 'Link text does not clearly describe the destination',
          description: `The link "${text}" was identified as not clearly describing its destination during manual review. Users may not understand where this link leads.`,
          selector: candidate.selector,
          html: candidate.html,
          pageUrl: candidate.pageUrl,
        }
      }

      // Se warning, adicionar mensagem
      if (finalResult === 'warning') {
        result.warningMessage = 'Link purpose could be clearer for better accessibility'
      }

      results.push(result)
    }

    return results
  },
}
