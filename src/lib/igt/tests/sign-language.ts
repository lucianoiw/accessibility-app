/**
 * IGT: Plugin de Língua de Sinais
 *
 * Testa se o plugin de língua de sinais (VLibras, Hand Talk, etc.)
 * está funcionando corretamente. Automação pode detectar se o script
 * está presente, mas não pode verificar se o widget funciona.
 *
 * WCAG: 1.2.6 Sign Language (Prerecorded) - Level AAA
 * eMAG: 5.4 Língua de sinais (informativo)
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
 * Detecta qual plugin de língua de sinais está sendo usado
 */
function detectPlugin(html: string): string | null {
  const htmlLower = html.toLowerCase()

  if (htmlLower.includes('vlibras') || htmlLower.includes('vw.gov.br')) {
    return 'VLibras'
  }
  if (htmlLower.includes('handtalk') || htmlLower.includes('hand talk')) {
    return 'Hand Talk'
  }
  if (htmlLower.includes('prodeaf') || htmlLower.includes('pro deaf')) {
    return 'ProDeaf'
  }
  if (htmlLower.includes('signall')) {
    return 'SignAll'
  }
  if (htmlLower.includes('ava') && htmlLower.includes('acessibilidade')) {
    return 'AVA'
  }

  return null
}

// ============================================
// IGT DEFINITION
// ============================================

export const signLanguagePluginIGT: IGTDefinition = {
  id: 'sign-language-plugin',
  nameKey: 'IGT.signLanguage.name',
  descriptionKey: 'IGT.signLanguage.description',
  category: 'sign-language',

  wcagCriteria: ['1.2.6'],
  emagRecommendations: ['5.4'],

  estimatedMinutes: 3,

  /**
   * Relevante se há violações relacionadas a plugins de língua de sinais
   * ou se o site é governamental brasileiro
   */
  isRelevant: (context: IGTAuditContext): boolean => {
    // Verificar se há violação de plugin de língua de sinais
    const hasPluginViolation = context.violations.some(v =>
      v.ruleId === 'brasil-libras-plugin'
    )

    // Verificar se é site .gov.br (obrigatório ter)
    const isGovBr = context.baseUrl.includes('.gov.br')

    return hasPluginViolation || isGovBr
  },

  /**
   * Obtém candidatos: um candidato por página com o plugin
   */
  getCandidates: async (context: IGTAuditContext): Promise<IGTCandidate[]> => {
    const candidates: IGTCandidate[] = []

    // Se há violação do plugin, criar candidato para cada página afetada
    const pluginViolations = context.violations.filter(v =>
      v.ruleId === 'brasil-libras-plugin'
    )

    if (pluginViolations.length > 0) {
      // Candidato para verificar se realmente não tem plugin
      for (const violation of pluginViolations) {
        candidates.push({
          id: `violation-${violation.id}`,
          elementType: 'body',
          selector: 'body',
          html: violation.html,
          pageUrl: violation.pageUrl,
          violationId: violation.id,
          attributes: {
            violationType: 'missing-plugin',
          },
        })
      }
    } else {
      // Plugin detectado - verificar se funciona
      // Um candidato por página
      for (const page of context.pages) {
        candidates.push({
          id: `page-${page.url}`,
          elementType: 'body',
          selector: 'body',
          html: '',
          pageUrl: page.url,
          attributes: {
            violationType: 'verify-functionality',
            pageTitle: page.title,
          },
        })
      }
    }

    return candidates
  },

  /**
   * Perguntas do teste
   */
  questions: [
    {
      id: 'widget-visible',
      order: 1,
      type: 'yes_no',
      textKey: 'IGT.signLanguage.questions.widgetVisible',
      helpTextKey: 'IGT.signLanguage.questions.widgetVisibleHelp',
      resultMapping: {
        yes: 'pass',
        no: 'fail',
      },
    },
    {
      id: 'widget-activates',
      order: 2,
      type: 'yes_no',
      textKey: 'IGT.signLanguage.questions.widgetActivates',
      helpTextKey: 'IGT.signLanguage.questions.widgetActivatesHelp',
      // Só mostra se o widget é visível
      showIf: (answers) => {
        const visible = answers.find(a => a.questionId === 'widget-visible')
        return visible?.value === 'yes'
      },
      resultMapping: {
        yes: 'pass',
        no: 'fail',
      },
    },
    {
      id: 'avatar-appears',
      order: 3,
      type: 'yes_no',
      textKey: 'IGT.signLanguage.questions.avatarAppears',
      helpTextKey: 'IGT.signLanguage.questions.avatarAppearsHelp',
      // Só mostra se o widget ativa
      showIf: (answers) => {
        const activates = answers.find(a => a.questionId === 'widget-activates')
        return activates?.value === 'yes'
      },
      resultMapping: {
        yes: 'pass',
        no: 'fail',
      },
    },
    {
      id: 'content-translated',
      order: 4,
      type: 'yes_no_unsure',
      textKey: 'IGT.signLanguage.questions.contentTranslated',
      helpTextKey: 'IGT.signLanguage.questions.contentTranslatedHelp',
      // Só mostra se o avatar aparece
      showIf: (answers) => {
        const avatar = answers.find(a => a.questionId === 'avatar-appears')
        return avatar?.value === 'yes'
      },
      resultMapping: {
        yes: 'pass',
        no: 'warning',
        unsure: 'warning',
      },
    },
    {
      id: 'keyboard-accessible',
      order: 5,
      type: 'yes_no',
      textKey: 'IGT.signLanguage.questions.keyboardAccessible',
      helpTextKey: 'IGT.signLanguage.questions.keyboardAccessibleHelp',
      // Só mostra se o widget é visível
      showIf: (answers) => {
        const visible = answers.find(a => a.questionId === 'widget-visible')
        return visible?.value === 'yes'
      },
      resultMapping: {
        yes: 'pass',
        no: 'warning',
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
      let failurePoint = ''

      const widgetVisible = candidateAnswers.find(a => a.questionId === 'widget-visible')
      const widgetActivates = candidateAnswers.find(a => a.questionId === 'widget-activates')
      const avatarAppears = candidateAnswers.find(a => a.questionId === 'avatar-appears')
      const contentTranslated = candidateAnswers.find(a => a.questionId === 'content-translated')
      const keyboardAccessible = candidateAnswers.find(a => a.questionId === 'keyboard-accessible')

      // Lógica de processamento em cascata
      if (widgetVisible?.value === 'no') {
        finalResult = 'fail'
        failurePoint = 'widget not visible'
        confidence = 1.0
      } else if (widgetActivates?.value === 'no') {
        finalResult = 'fail'
        failurePoint = 'widget does not activate'
        confidence = 1.0
      } else if (avatarAppears?.value === 'no') {
        finalResult = 'fail'
        failurePoint = 'avatar does not appear'
        confidence = 1.0
      } else if (contentTranslated?.value === 'no') {
        finalResult = 'warning'
        confidence = 0.8
      } else if (keyboardAccessible?.value === 'no') {
        finalResult = 'warning'
        confidence = 0.7
      }

      const result: IGTResult = {
        candidateId: candidate.id,
        result: finalResult,
        confidence,
      }

      // Se falhou, criar violação
      if (finalResult === 'fail') {
        result.violation = {
          ruleId: 'igt-sign-language-not-working',
          impact: 'critical',
          help: 'Sign language plugin is not working correctly',
          description: `The sign language accessibility plugin is ${failurePoint}. This prevents deaf users from accessing content in sign language.`,
          selector: candidate.selector,
          html: candidate.html,
          pageUrl: candidate.pageUrl,
        }
      }

      // Se warning
      if (finalResult === 'warning') {
        if (keyboardAccessible?.value === 'no') {
          result.warningMessage = 'Sign language widget cannot be activated via keyboard'
        } else {
          result.warningMessage = 'Sign language translation quality may need verification'
        }
      }

      results.push(result)
    }

    return results
  },
}
