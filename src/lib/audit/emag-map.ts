/**
 * Mapeamento completo eMAG 3.1 (Modelo de Acessibilidade em Governo Eletronico)
 * Baseado no documento oficial: https://emag.governoeletronico.gov.br/
 *
 * O eMAG 3.1 oficial possui 45 recomendacoes, mas adicionamos 1 customizada (6.8 CAPTCHA),
 * totalizando 46 recomendacoes organizadas em 6 secoes.
 * Diferente da WCAG, nao ha niveis de prioridade - todas as recomendacoes
 * aplicaveis ao conteudo devem ser seguidas.
 */

export type EmagSection =
  | 'marcacao'
  | 'comportamento'
  | 'conteudo'
  | 'apresentacao'
  | 'multimidia'
  | 'formulario'

export type EmagStatus = 'pass' | 'fail' | 'warning' | 'not_tested' | 'not_applicable'

export interface EmagRecommendation {
  id: string // Ex: "1.1", "2.3", "6.8"
  section: EmagSection
  title: string
  description: string
  wcagCriteria: string[] // Criterios WCAG 2.0/2.1 relacionados
  axeRules: string[] // Regras axe-core que detectam violacoes
  customRules: string[] // Regras customizadas brasileiras
  checkType: 'automated' | 'semi-automated' | 'manual'
  helpUrl?: string
}

export interface EmagEvaluation {
  recommendation: EmagRecommendation
  status: EmagStatus
  violations: number
  pages: number
  details?: string
}

/**
 * Todas as 46 recomendacoes (45 do eMAG 3.1 + 1 customizada)
 */
export const EMAG_RECOMMENDATIONS: EmagRecommendation[] = [
  // ============================================
  // SECAO 1: MARCACAO (9 recomendacoes)
  // ============================================
  {
    id: '1.1',
    section: 'marcacao',
    title: 'Respeitar os padroes web',
    description:
      'Seguir as recomendacoes do W3C para HTML, CSS e outras tecnologias. Codigo deve ser valido e bem formado.',
    wcagCriteria: ['4.1.1', '4.1.2'],
    axeRules: ['duplicate-id', 'duplicate-id-active', 'duplicate-id-aria'],
    customRules: [],
    checkType: 'automated',
    helpUrl: 'https://emag.governoeletronico.gov.br/cursodesenvolvedor/desenvolvimento-web/recomendacoes-marcacao.html',
  },
  {
    id: '1.2',
    section: 'marcacao',
    title: 'Organizar o codigo HTML de forma logica e semantica',
    description:
      'Usar elementos HTML apropriados para seu proposito (semantica). Ex: listas com ul/ol, paragrafos com p, etc.',
    wcagCriteria: ['1.3.1', '4.1.1'],
    axeRules: ['landmark-one-main', 'region', 'landmark-complementary-is-top-level'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '1.3',
    section: 'marcacao',
    title: 'Utilizar corretamente os niveis de cabecalho',
    description:
      'Manter hierarquia de cabecalhos H1-H6 organizada e coerente, sem pular niveis.',
    wcagCriteria: ['1.3.1', '2.4.6'],
    axeRules: ['heading-order', 'empty-heading', 'page-has-heading-one'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '1.4',
    section: 'marcacao',
    title: 'Ordenar de forma logica e intuitiva a leitura e tabulacao',
    description:
      'O conteudo principal deve vir antes dos menus na estrutura do codigo para leitores de tela.',
    wcagCriteria: ['1.3.2', '2.4.3'],
    axeRules: ['tabindex'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '1.5',
    section: 'marcacao',
    title: 'Fornecer ancoras para ir direto a um bloco de conteudo',
    description:
      'Incluir links "pular para conteudo principal", "pular para menu" com atalhos de teclado (Alt+1, Alt+2, Alt+3).',
    wcagCriteria: ['2.4.1'],
    axeRules: ['bypass', 'skip-link'],
    customRules: ['emag-skip-links', 'emag-atalhos-teclado', 'barra-acessibilidade-gov-br'],
    checkType: 'automated',
  },
  {
    id: '1.6',
    section: 'marcacao',
    title: 'Nao utilizar tabelas para diagramacao',
    description: 'Usar CSS para layout visual. Tabelas devem ser usadas apenas para dados tabulares.',
    wcagCriteria: ['1.3.1'],
    axeRules: ['table-fake-caption', 'td-has-header', 'th-has-data-cells'],
    customRules: ['emag-tabela-layout'],
    checkType: 'semi-automated',
  },
  {
    id: '1.7',
    section: 'marcacao',
    title: 'Separar links adjacentes',
    description:
      'Links adjacentes devem ser separados por mais que espacos em branco (ex: caractere pipe |, lista).',
    wcagCriteria: ['1.3.1'],
    axeRules: [],
    customRules: ['emag-links-adjacentes'],
    checkType: 'automated',
  },
  {
    id: '1.8',
    section: 'marcacao',
    title: 'Dividir as areas de informacao',
    description:
      'Organizar pagina em areas bem definidas: topo, menu, conteudo principal e rodape usando landmarks ARIA ou elementos HTML5.',
    wcagCriteria: ['1.3.1', '2.4.1'],
    axeRules: ['landmark-one-main', 'landmark-no-duplicate-banner', 'landmark-no-duplicate-contentinfo'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '1.9',
    section: 'marcacao',
    title: 'Nao abrir novas instancias sem a solicitacao do usuario',
    description:
      'Links que abrem em nova aba/janela devem avisar o usuario. Evitar target="_blank" sem aviso.',
    wcagCriteria: ['3.2.5'],
    axeRules: [],
    customRules: ['link-nova-aba-sem-aviso'],
    checkType: 'automated',
  },

  // ============================================
  // SECAO 2: COMPORTAMENTO / DOM (7 recomendacoes)
  // ============================================
  {
    id: '2.1',
    section: 'comportamento',
    title: 'Disponibilizar todas as funcoes da pagina via teclado',
    description:
      'Todas as funcoes devem ser acessiveis pelo teclado, nao apenas pelo mouse. Implementar equivalentes de teclado para onclick, onmouseover, etc.',
    wcagCriteria: ['2.1.1', '2.1.2'],
    axeRules: ['accesskeys', 'focus-order-semantics', 'scrollable-region-focusable'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '2.2',
    section: 'comportamento',
    title: 'Garantir que os objetos programaveis sejam acessiveis',
    description:
      'Scripts, applets e plugins devem ser acessiveis ou ter alternativa acessivel. Conteudo dinamico deve ser anunciado por leitores de tela.',
    wcagCriteria: ['4.1.2'],
    axeRules: ['aria-hidden-focus', 'aria-input-field-name', 'aria-toggle-field-name'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '2.3',
    section: 'comportamento',
    title: 'Nao criar paginas com atualizacao automatica periodica',
    description:
      'Evitar meta refresh automatico. Se necessario, dar controle ao usuario.',
    wcagCriteria: ['2.2.1', '3.2.5'],
    axeRules: ['meta-refresh'],
    customRules: ['refresh-automatico'],
    checkType: 'automated',
  },
  {
    id: '2.4',
    section: 'comportamento',
    title: 'Nao utilizar redirecionamento automatico de paginas',
    description:
      'Redirecionamentos devem ser feitos no servidor, nao via meta refresh ou JavaScript.',
    wcagCriteria: ['3.2.5'],
    axeRules: ['meta-refresh'],
    customRules: ['refresh-automatico'],
    checkType: 'automated',
  },
  {
    id: '2.5',
    section: 'comportamento',
    title: 'Fornecer alternativa para modificar limite de tempo',
    description:
      'Se houver limite de tempo, usuario deve poder desligar, ajustar ou estender (no minimo 10x).',
    wcagCriteria: ['2.2.1'],
    axeRules: [],
    customRules: ['timeout-sem-aviso'],
    checkType: 'semi-automated',
  },
  {
    id: '2.6',
    section: 'comportamento',
    title: 'Nao incluir situacoes com intermitencia de tela',
    description:
      'Evitar conteudo que pisca mais de 3 vezes por segundo. Pode causar convulsoes em usuarios com epilepsia.',
    wcagCriteria: ['2.3.1', '2.3.2'],
    axeRules: [],
    customRules: [],
    checkType: 'manual',
  },
  {
    id: '2.7',
    section: 'comportamento',
    title: 'Assegurar o controle do usuario sobre as alteracoes temporais do conteudo',
    description:
      'Carroseis, slideshows e animacoes devem ter controles para pausar, parar ou ocultar.',
    wcagCriteria: ['2.2.2'],
    axeRules: ['marquee', 'blink'],
    customRules: ['autoplay-video-audio', 'carrossel-sem-controles'],
    checkType: 'semi-automated',
  },

  // ============================================
  // SECAO 3: CONTEUDO / INFORMACAO (12 recomendacoes)
  // ============================================
  {
    id: '3.1',
    section: 'conteudo',
    title: 'Identificar o idioma principal da pagina',
    description: 'Usar atributo lang no elemento html. Ex: <html lang="pt-BR">',
    wcagCriteria: ['3.1.1'],
    axeRules: ['html-has-lang', 'html-lang-valid'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '3.2',
    section: 'conteudo',
    title: 'Informar mudanca de idioma no conteudo',
    description:
      'Trechos em idioma diferente do principal devem ter atributo lang. Ex: <span lang="en">English text</span>',
    wcagCriteria: ['3.1.2'],
    axeRules: ['valid-lang'],
    customRules: ['linguagem-inconsistente'],
    checkType: 'semi-automated',
  },
  {
    id: '3.3',
    section: 'conteudo',
    title: 'Oferecer um titulo descritivo e informativo a pagina',
    description:
      'Elemento TITLE deve ser claro, unico e descrever o proposito da pagina.',
    wcagCriteria: ['2.4.2'],
    axeRules: ['document-title'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '3.4',
    section: 'conteudo',
    title: 'Informar o usuario sobre sua localizacao na pagina',
    description:
      'Fornecer breadcrumbs (migalhas de pao) navegaveis para orientar o usuario.',
    wcagCriteria: ['2.4.8'],
    axeRules: [],
    customRules: ['emag-breadcrumb'],
    checkType: 'semi-automated',
  },
  {
    id: '3.5',
    section: 'conteudo',
    title: 'Descrever links clara e sucintamente',
    description:
      'Texto de link deve ser significativo mesmo fora de contexto. Evitar "clique aqui", "saiba mais".',
    wcagCriteria: ['2.4.4', '2.4.9'],
    axeRules: ['link-name'],
    customRules: ['link-texto-generico'],
    checkType: 'automated',
  },
  {
    id: '3.6',
    section: 'conteudo',
    title: 'Fornecer alternativa em texto para as imagens do site',
    description:
      'Toda imagem deve ter atributo alt descritivo. Imagens decorativas devem ter alt vazio.',
    wcagCriteria: ['1.1.1'],
    axeRules: ['image-alt', 'input-image-alt', 'role-img-alt'],
    customRules: ['imagem-alt-nome-arquivo'],
    checkType: 'automated',
  },
  {
    id: '3.7',
    section: 'conteudo',
    title: 'Utilizar mapas de imagem de forma acessivel',
    description:
      'Usar mapas de imagem lado-cliente (usemap) com alt em cada area, nao mapas lado-servidor.',
    wcagCriteria: ['1.1.1'],
    axeRules: ['area-alt'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '3.8',
    section: 'conteudo',
    title: 'Disponibilizar documentos em formatos acessiveis',
    description:
      'Oferecer alternativas em HTML ou ODF para documentos PDF. PDFs devem ser tagueados.',
    wcagCriteria: ['1.1.1', '1.3.1'],
    axeRules: [],
    customRules: ['emag-pdf-acessivel'],
    checkType: 'semi-automated',
  },
  {
    id: '3.9',
    section: 'conteudo',
    title: 'Em tabelas, utilizar titulos e resumos de forma apropriada',
    description:
      'Tabelas de dados devem ter caption e/ou summary descrevendo o conteudo.',
    wcagCriteria: ['1.3.1'],
    axeRules: ['table-fake-caption'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '3.10',
    section: 'conteudo',
    title: 'Associar celulas de dados as celulas de cabecalho',
    description:
      'Usar th para cabecalhos, scope ou headers para associar celulas em tabelas complexas.',
    wcagCriteria: ['1.3.1'],
    axeRules: ['td-headers-attr', 'th-has-data-cells', 'td-has-header'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '3.11',
    section: 'conteudo',
    title: 'Garantir a leitura e compreensao das informacoes',
    description:
      'Texto deve ser claro e simples, adequado ao publico. Evitar jargoes sem explicacao.',
    wcagCriteria: ['3.1.5'],
    axeRules: [],
    customRules: ['legibilidade-texto-complexo'],
    checkType: 'semi-automated',
  },
  {
    id: '3.12',
    section: 'conteudo',
    title: 'Disponibilizar uma explicacao para siglas, abreviaturas e palavras incomuns',
    description:
      'Usar elemento abbr com title, ou fornecer glossario para termos tecnicos.',
    wcagCriteria: ['3.1.3', '3.1.4'],
    axeRules: [],
    customRules: ['siglas-sem-expansao'],
    checkType: 'semi-automated',
  },

  // ============================================
  // SECAO 4: APRESENTACAO / DESIGN (5 recomendacoes)
  // ============================================
  {
    id: '4.1',
    section: 'apresentacao',
    title: 'Oferecer contraste minimo entre plano de fundo e primeiro plano',
    description:
      'Contraste minimo de 4.5:1 para texto normal e 3:1 para texto grande. Considerar daltonismo.',
    wcagCriteria: ['1.4.3', '1.4.6'],
    axeRules: ['color-contrast', 'color-contrast-enhanced'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '4.2',
    section: 'apresentacao',
    title: 'Nao utilizar apenas cor ou outras caracteristicas sensoriais para diferenciar elementos',
    description:
      'Informacao nao deve depender apenas de cor. Usar tambem texto, icones ou padroes.',
    wcagCriteria: ['1.4.1', '1.3.3'],
    axeRules: ['link-in-text-block'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '4.3',
    section: 'apresentacao',
    title: 'Permitir redimensionamento de texto sem perda de funcionalidade',
    description:
      'Pagina deve funcionar com zoom de 200% sem perda de conteudo ou funcionalidade. Usar unidades relativas (em, rem, %).',
    wcagCriteria: ['1.4.4'],
    axeRules: [],
    customRules: ['fonte-muito-pequena'],
    checkType: 'semi-automated',
  },
  {
    id: '4.4',
    section: 'apresentacao',
    title: 'Possibilitar que o elemento com foco seja visualmente evidente',
    description:
      'Elementos focados devem ter indicacao visual clara (outline). Nao remover outline sem alternativa.',
    wcagCriteria: ['2.4.7'],
    axeRules: ['focus-visible', 'focus-order-semantics'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '4.5',
    section: 'apresentacao',
    title: 'Nao usar texto com efeito de movimento ou piscante',
    description:
      'Evitar texto em movimento, piscando ou com blink. Se necessario, permitir pausar.',
    wcagCriteria: ['2.2.2'],
    axeRules: ['blink', 'marquee'],
    customRules: [],
    checkType: 'automated',
  },

  // ============================================
  // SECAO 5: MULTIMIDIA (5 recomendacoes)
  // ============================================
  {
    id: '5.1',
    section: 'multimidia',
    title: 'Fornecer alternativa para video',
    description:
      'Videos devem ter legendas (CC) sincronizadas. Para videos sem audio, fornecer descricao textual.',
    wcagCriteria: ['1.2.1', '1.2.2'],
    axeRules: ['video-caption'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '5.2',
    section: 'multimidia',
    title: 'Fornecer alternativa para audio',
    description:
      'Audio pre-gravado deve ter transcricao textual completa disponivel.',
    wcagCriteria: ['1.2.1'],
    axeRules: ['audio-caption'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '5.3',
    section: 'multimidia',
    title: 'Oferecer audiodescricao para video pre-gravado',
    description:
      'Videos com informacao visual importante devem ter audiodescricao narrando elementos visuais.',
    wcagCriteria: ['1.2.3', '1.2.5'],
    axeRules: [],
    customRules: [],
    checkType: 'manual',
  },
  {
    id: '5.4',
    section: 'multimidia',
    title: 'Fornecer controle de audio para som',
    description:
      'Audio que toca automaticamente por mais de 3 segundos deve ter controle para pausar/parar ou ajustar volume independente do sistema.',
    wcagCriteria: ['1.4.2'],
    axeRules: ['no-autoplay-audio'],
    customRules: ['autoplay-video-audio'],
    checkType: 'semi-automated',
  },
  {
    id: '5.5',
    section: 'multimidia',
    title: 'Fornecer controle de animacao',
    description:
      'Animacoes, GIFs e conteudo em movimento devem ter controle para pausar ou parar.',
    wcagCriteria: ['2.2.2'],
    axeRules: [],
    customRules: ['carrossel-sem-controles', 'animacao-sem-pause'],
    checkType: 'semi-automated',
  },

  // ============================================
  // SECAO 6: FORMULARIOS (8 recomendacoes)
  // ============================================
  {
    id: '6.1',
    section: 'formulario',
    title: 'Fornecer alternativa em texto para os botoes de imagem de formularios',
    description: 'Botoes de imagem (input type="image") devem ter alt descritivo.',
    wcagCriteria: ['1.1.1'],
    axeRules: ['input-image-alt'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '6.2',
    section: 'formulario',
    title: 'Associar etiquetas aos seus campos',
    description:
      'Todo campo de formulario deve ter label associado via for/id ou estar dentro do label.',
    wcagCriteria: ['1.3.1', '3.3.2'],
    axeRules: ['label', 'label-title-only', 'form-field-multiple-labels'],
    customRules: [],
    checkType: 'automated',
  },
  {
    id: '6.3',
    section: 'formulario',
    title: 'Estabelecer uma ordem logica de navegacao',
    description:
      'Ordem de tabulacao deve seguir sequencia logica do formulario. Usar tabindex apenas quando necessario.',
    wcagCriteria: ['2.4.3'],
    axeRules: ['tabindex'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '6.4',
    section: 'formulario',
    title: 'Nao provocar automaticamente alteracao no contexto',
    description:
      'Mudanca de foco ou selecao nao deve causar mudanca de contexto inesperada (ex: submeter formulario).',
    wcagCriteria: ['3.2.1', '3.2.2'],
    axeRules: ['select-name'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '6.5',
    section: 'formulario',
    title: 'Fornecer instrucoes para entrada de dados',
    description:
      'Informar formato esperado, campos obrigatorios e restricoes antes ou durante preenchimento.',
    wcagCriteria: ['3.3.2'],
    axeRules: ['aria-required-attr'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '6.6',
    section: 'formulario',
    title: 'Identificar e descrever erros de entrada de dados',
    description:
      'Erros de validacao devem ser identificados claramente, indicando o campo e o problema.',
    wcagCriteria: ['3.3.1', '3.3.3'],
    axeRules: ['aria-valid-attr-value'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '6.7',
    section: 'formulario',
    title: 'Agrupar campos de formulario',
    description:
      'Usar fieldset e legend para agrupar campos relacionados (ex: dados pessoais, endereco).',
    wcagCriteria: ['1.3.1', '3.3.2'],
    axeRules: ['fieldset-no-legend', 'radiogroup'],
    customRules: [],
    checkType: 'semi-automated',
  },
  {
    id: '6.8',
    section: 'formulario',
    title: 'Fornecer captcha acessivel',
    description:
      'Se usar CAPTCHA, fornecer alternativas: audio, questoes simples, ou usar reCAPTCHA v3 invisivel.',
    wcagCriteria: ['1.1.1'],
    axeRules: [],
    customRules: ['captcha-sem-alternativa'],
    checkType: 'semi-automated',
  },
]

/**
 * Agrupa recomendacoes por secao
 */
export const EMAG_BY_SECTION: Record<EmagSection, EmagRecommendation[]> = {
  marcacao: EMAG_RECOMMENDATIONS.filter((r) => r.section === 'marcacao'),
  comportamento: EMAG_RECOMMENDATIONS.filter((r) => r.section === 'comportamento'),
  conteudo: EMAG_RECOMMENDATIONS.filter((r) => r.section === 'conteudo'),
  apresentacao: EMAG_RECOMMENDATIONS.filter((r) => r.section === 'apresentacao'),
  multimidia: EMAG_RECOMMENDATIONS.filter((r) => r.section === 'multimidia'),
  formulario: EMAG_RECOMMENDATIONS.filter((r) => r.section === 'formulario'),
}

/**
 * Labels das secoes em portugues
 */
export const EMAG_SECTION_LABELS: Record<EmagSection, string> = {
  marcacao: 'Marcacao',
  comportamento: 'Comportamento (DOM)',
  conteudo: 'Conteudo/Informacao',
  apresentacao: 'Apresentacao/Design',
  multimidia: 'Multimidia',
  formulario: 'Formularios',
}

/**
 * Descricoes das secoes
 */
export const EMAG_SECTION_DESCRIPTIONS: Record<EmagSection, string> = {
  marcacao:
    'Recomendacoes sobre a estrutura e organizacao do codigo HTML, uso correto de elementos semanticos e landmarks.',
  comportamento:
    'Recomendacoes sobre interatividade, scripts, e comportamento dinamico da pagina.',
  conteudo:
    'Recomendacoes sobre o conteudo textual, imagens, links e informacoes apresentadas.',
  apresentacao:
    'Recomendacoes sobre aparencia visual, contraste, cores e redimensionamento.',
  multimidia: 'Recomendacoes sobre audio, video, legendas e audiodescricao.',
  formulario:
    'Recomendacoes sobre formularios, labels, validacao e mensagens de erro.',
}

/**
 * Mapeamento de regras axe-core para recomendacoes eMAG
 * Usado para associar violacoes detectadas pelo axe com as recomendacoes
 */
export const AXE_TO_EMAG: Record<string, string[]> = {}

// Construir mapeamento reverso (axe-rule -> emag recommendations)
EMAG_RECOMMENDATIONS.forEach((rec) => {
  rec.axeRules.forEach((axeRule) => {
    if (!AXE_TO_EMAG[axeRule]) {
      AXE_TO_EMAG[axeRule] = []
    }
    AXE_TO_EMAG[axeRule].push(rec.id)
  })
})

/**
 * Mapeamento de regras customizadas para recomendacoes eMAG
 */
export const CUSTOM_TO_EMAG: Record<string, string[]> = {}

// Construir mapeamento reverso (custom-rule -> emag recommendations)
EMAG_RECOMMENDATIONS.forEach((rec) => {
  rec.customRules.forEach((customRule) => {
    if (!CUSTOM_TO_EMAG[customRule]) {
      CUSTOM_TO_EMAG[customRule] = []
    }
    CUSTOM_TO_EMAG[customRule].push(rec.id)
  })
})

/**
 * Retorna as recomendacoes eMAG associadas a uma regra (axe ou customizada)
 */
export function getEmagForRule(ruleId: string): string[] {
  return AXE_TO_EMAG[ruleId] || CUSTOM_TO_EMAG[ruleId] || []
}

/**
 * Retorna uma recomendacao pelo ID
 */
export function getEmagRecommendation(id: string): EmagRecommendation | undefined {
  return EMAG_RECOMMENDATIONS.find((r) => r.id === id)
}

/**
 * Estatisticas do eMAG
 */
export const EMAG_STATS = {
  totalRecommendations: EMAG_RECOMMENDATIONS.length,
  bySection: {
    marcacao: EMAG_BY_SECTION.marcacao.length,
    comportamento: EMAG_BY_SECTION.comportamento.length,
    conteudo: EMAG_BY_SECTION.conteudo.length,
    apresentacao: EMAG_BY_SECTION.apresentacao.length,
    multimidia: EMAG_BY_SECTION.multimidia.length,
    formulario: EMAG_BY_SECTION.formulario.length,
  },
  byCheckType: {
    automated: EMAG_RECOMMENDATIONS.filter((r) => r.checkType === 'automated').length,
    semiAutomated: EMAG_RECOMMENDATIONS.filter((r) => r.checkType === 'semi-automated').length,
    manual: EMAG_RECOMMENDATIONS.filter((r) => r.checkType === 'manual').length,
  },
}
