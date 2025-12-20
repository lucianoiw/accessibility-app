/**
 * IGT: Qualidade de Alt Text em Imagens
 *
 * Testa se o texto alternativo das imagens descreve adequadamente
 * o conteúdo visual. Automação pode detectar alt missing ou genérico,
 * mas não pode verificar se o alt é realmente adequado.
 *
 * WCAG: 1.1.1 Non-text Content
 * eMAG: 3.6 Descrição de imagens
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
 * Extrai o atributo alt de um HTML de imagem
 */
function extractAltFromHtml(html: string): string | null {
  const match = html.match(/alt\s*=\s*["']([^"']*)["']/i)
  return match ? match[1] : null
}

/**
 * Extrai o src de um HTML de imagem
 */
function extractSrcFromHtml(html: string): string | null {
  const match = html.match(/src\s*=\s*["']([^"']*)["']/i)
  return match ? match[1] : null
}

/**
 * Verifica se o alt parece ser genérico demais
 */
function isGenericAlt(alt: string): boolean {
  const genericPatterns = [
    /^image$/i,
    /^img$/i,
    /^photo$/i,
    /^picture$/i,
    /^imagem$/i,
    /^foto$/i,
    /^figura$/i,
    /^icon$/i,
    /^logo$/i,
    /^\d+$/,  // Apenas números
    /^[a-f0-9-]+$/i,  // UUID ou hash
  ]

  const trimmed = alt.trim()
  return genericPatterns.some(p => p.test(trimmed)) || trimmed.length < 3
}

/**
 * Verifica se parece nome de arquivo
 */
function isFilename(alt: string): boolean {
  return /\.(jpg|jpeg|png|gif|svg|webp|avif|bmp)$/i.test(alt.trim())
}

// ============================================
// IGT DEFINITION
// ============================================

export const imagesAltQualityIGT: IGTDefinition = {
  id: 'images-alt-quality',
  nameKey: 'IGT.images.name',
  descriptionKey: 'IGT.images.description',
  category: 'images',

  wcagCriteria: ['1.1.1'],
  emagRecommendations: ['3.6'],

  estimatedMinutes: 5,

  /**
   * Relevante se há violações de imagem ou imagens com alt suspeito
   */
  isRelevant: (context: IGTAuditContext): boolean => {
    // Sempre relevante se houver violações de imagem
    const hasImageViolations = context.violations.some(v =>
      ['image-alt', 'imagem-alt-nome-arquivo', 'image-redundant-alt'].includes(v.ruleId)
    )

    return hasImageViolations || context.pages.length > 0
  },

  /**
   * Obtém candidatos: imagens com alt que pode ser inadequado
   */
  getCandidates: async (context: IGTAuditContext): Promise<IGTCandidate[]> => {
    const candidates: IGTCandidate[] = []

    // 1. Violações de imagem já detectadas
    for (const violation of context.violations) {
      if (!['image-alt', 'imagem-alt-nome-arquivo', 'image-redundant-alt'].includes(violation.ruleId)) {
        continue
      }

      const alt = extractAltFromHtml(violation.html)
      const src = extractSrcFromHtml(violation.html)

      candidates.push({
        id: `violation-${violation.id}`,
        elementType: 'img',
        selector: violation.selector,
        html: violation.html,
        pageUrl: violation.pageUrl,
        violationId: violation.id,
        attributes: {
          alt: alt || '',
          src: src || '',
        },
      })
    }

    // 2. Também poderia buscar imagens da página que não são violações
    // mas têm alt suspeito (genérico, muito curto, etc)
    // Isso seria feito via API que busca elementos da página

    return candidates
  },

  /**
   * Perguntas do teste
   */
  questions: [
    {
      id: 'describes-content',
      order: 1,
      type: 'yes_no_unsure',
      textKey: 'IGT.images.questions.describesContent',
      helpTextKey: 'IGT.images.questions.describesContentHelp',
      resultMapping: {
        yes: 'pass',
        no: 'fail',
        unsure: 'warning',
      },
    },
    {
      id: 'is-decorative',
      order: 2,
      type: 'yes_no',
      textKey: 'IGT.images.questions.isDecorative',
      helpTextKey: 'IGT.images.questions.isDecorativeHelp',
      // Só mostra se respondeu "não" na primeira
      showIf: (answers) => {
        const first = answers.find(a => a.questionId === 'describes-content')
        return first?.value === 'no'
      },
      resultMapping: {
        yes: 'pass',  // Se é decorativa, alt="" está ok
        no: 'fail',   // Se não é decorativa e alt não descreve, falha
      },
    },
    {
      id: 'alt-quality',
      order: 3,
      type: 'multiple_choice',
      textKey: 'IGT.images.questions.altQuality',
      helpTextKey: 'IGT.images.questions.altQualityHelp',
      // Só mostra se respondeu "sim" na primeira
      showIf: (answers) => {
        const first = answers.find(a => a.questionId === 'describes-content')
        return first?.value === 'yes'
      },
      options: [
        { value: 'excellent', label: 'IGT.images.options.excellent', resultMapping: 'pass' },
        { value: 'adequate', label: 'IGT.images.options.adequate', resultMapping: 'pass' },
        { value: 'minimal', label: 'IGT.images.options.minimal', resultMapping: 'warning' },
        { value: 'needs-improvement', label: 'IGT.images.options.needsImprovement', resultMapping: 'fail' },
      ],
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
        // Não respondido
        results.push({
          candidateId: candidate.id,
          result: 'skip',
          confidence: 0,
        })
        continue
      }

      // Processar respostas
      let finalResult: AnswerResult = 'pass'
      let confidence = 1.0

      const describesContent = candidateAnswers.find(a => a.questionId === 'describes-content')
      const isDecorative = candidateAnswers.find(a => a.questionId === 'is-decorative')
      const altQuality = candidateAnswers.find(a => a.questionId === 'alt-quality')

      if (describesContent?.value === 'no') {
        if (isDecorative?.value === 'yes') {
          // É decorativa - ok
          finalResult = 'pass'
          confidence = 0.95
        } else {
          // Não é decorativa e alt não descreve - falha
          finalResult = 'fail'
          confidence = 1.0
        }
      } else if (describesContent?.value === 'unsure') {
        finalResult = 'warning'
        confidence = 0.6
      } else if (describesContent?.value === 'yes') {
        // Descreve - verificar qualidade
        if (altQuality?.value === 'needs-improvement') {
          finalResult = 'fail'
          confidence = 0.9
        } else if (altQuality?.value === 'minimal') {
          finalResult = 'warning'
          confidence = 0.8
        } else {
          finalResult = 'pass'
          confidence = 1.0
        }
      }

      const result: IGTResult = {
        candidateId: candidate.id,
        result: finalResult,
        confidence,
      }

      // Se falhou, criar violação
      if (finalResult === 'fail') {
        const alt = candidate.attributes?.alt || ''

        result.violation = {
          ruleId: 'igt-alt-inadequate',
          impact: 'serious',
          help: 'Image alt text does not adequately describe the content',
          description: `The alt text "${alt}" was identified as not adequately describing the image content during manual review.`,
          selector: candidate.selector,
          html: candidate.html,
          pageUrl: candidate.pageUrl,
        }
      }

      // Se warning, adicionar mensagem
      if (finalResult === 'warning') {
        result.warningMessage = 'Alt text quality could be improved for better accessibility'
      }

      results.push(result)
    }

    return results
  },
}
