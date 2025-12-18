/**
 * Conformance Standards - Definicoes de padroes de acessibilidade
 *
 * Arquitetura extensivel para suportar multiplos padroes:
 * - WCAG 2.0/2.1/2.2 (A, AA, AAA)
 * - eMAG 3.1
 * - ABNT NBR 17060
 * - Futuro: Section 508, ADA, EAA, RGAA
 */

export type CriterionStatus =
  | 'pass'          // Nenhuma violacao encontrada
  | 'fail'          // Violacoes detectadas
  | 'needs_review'  // Requer teste assistido
  | 'manual'        // Requer verificacao manual
  | 'not_tested'    // Nao testado

export interface SuccessCriterion {
  id: string            // Ex: '1.1.1', '2.4.4'
  name: string          // Ex: 'Non-text Content'
  description?: string  // Ex: 'All non-text content has a text alternative.'
  learnMoreUrl?: string // Ex: 'https://www.w3.org/WAI/WCAG22/Understanding/non-text-content'
  level?: 'A' | 'AA' | 'AAA'
  principle?: string    // Ex: 'perceivable', 'operable'
  abntRef?: string      // Ex: 'ABNT 5.2.6'
  status: CriterionStatus
  issueCount?: number
}

export interface ConformanceStandard {
  id: string
  name: string
  shortName: string
  description: string
  version?: string
  principles?: {
    id: string
    name: string
    description?: string
  }[]
  criteria: SuccessCriterion[]
}

// ============================================
// WCAG 2.2 Success Criteria (Level A + AA)
// ============================================

const WCAG_BASE_URL = 'https://www.w3.org/WAI/WCAG22/Understanding'

export const WCAG_22_CRITERIA: Omit<SuccessCriterion, 'status'>[] = [
  // Principle 1: Perceivable
  {
    id: '1.1.1',
    name: 'Non-text Content',
    description: 'All non-text content has a text alternative that serves the equivalent purpose.',
    learnMoreUrl: `${WCAG_BASE_URL}/non-text-content`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.2.6',
  },
  {
    id: '1.2.1',
    name: 'Audio-only and Video-only',
    description: 'Provide an alternative for time-based media for prerecorded audio-only and video-only content.',
    learnMoreUrl: `${WCAG_BASE_URL}/audio-only-and-video-only-prerecorded`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.4.1',
  },
  {
    id: '1.2.2',
    name: 'Captions (Prerecorded)',
    description: 'Captions are provided for all prerecorded audio content in synchronized media.',
    learnMoreUrl: `${WCAG_BASE_URL}/captions-prerecorded`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.4.2',
  },
  {
    id: '1.2.3',
    name: 'Audio Description or Media Alternative',
    description: 'An alternative for time-based media or audio description is provided for prerecorded video.',
    learnMoreUrl: `${WCAG_BASE_URL}/audio-description-or-media-alternative-prerecorded`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.4.3',
  },
  {
    id: '1.2.4',
    name: 'Captions (Live)',
    description: 'Captions are provided for all live audio content in synchronized media.',
    learnMoreUrl: `${WCAG_BASE_URL}/captions-live`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.4.4',
  },
  {
    id: '1.2.5',
    name: 'Audio Description (Prerecorded)',
    description: 'Audio description is provided for all prerecorded video content.',
    learnMoreUrl: `${WCAG_BASE_URL}/audio-description-prerecorded`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.4.5',
  },
  {
    id: '1.3.1',
    name: 'Info and Relationships',
    description: 'Information, structure, and relationships can be programmatically determined.',
    learnMoreUrl: `${WCAG_BASE_URL}/info-and-relationships`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.3.1',
  },
  {
    id: '1.3.2',
    name: 'Meaningful Sequence',
    description: 'The correct reading sequence can be programmatically determined.',
    learnMoreUrl: `${WCAG_BASE_URL}/meaningful-sequence`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.3.2',
  },
  {
    id: '1.3.3',
    name: 'Sensory Characteristics',
    description: 'Instructions do not rely solely on sensory characteristics like shape, size, or location.',
    learnMoreUrl: `${WCAG_BASE_URL}/sensory-characteristics`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.3.3',
  },
  {
    id: '1.3.4',
    name: 'Orientation',
    description: 'Content does not restrict its view and operation to a single display orientation.',
    learnMoreUrl: `${WCAG_BASE_URL}/orientation`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.3.4',
  },
  {
    id: '1.3.5',
    name: 'Identify Input Purpose',
    description: 'The purpose of input fields collecting user information can be programmatically determined.',
    learnMoreUrl: `${WCAG_BASE_URL}/identify-input-purpose`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.3.5',
  },
  {
    id: '1.4.1',
    name: 'Use of Color',
    description: 'Color is not the only visual means of conveying information or indicating an action.',
    learnMoreUrl: `${WCAG_BASE_URL}/use-of-color`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.1',
  },
  {
    id: '1.4.2',
    name: 'Audio Control',
    description: 'A mechanism is available to pause or stop audio that plays automatically for more than 3 seconds.',
    learnMoreUrl: `${WCAG_BASE_URL}/audio-control`,
    level: 'A',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.2',
  },
  {
    id: '1.4.3',
    name: 'Contrast (Minimum)',
    description: 'Text has a contrast ratio of at least 4.5:1 (or 3:1 for large text).',
    learnMoreUrl: `${WCAG_BASE_URL}/contrast-minimum`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.3',
  },
  {
    id: '1.4.4',
    name: 'Resize Text',
    description: 'Text can be resized up to 200% without loss of content or functionality.',
    learnMoreUrl: `${WCAG_BASE_URL}/resize-text`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.5',
  },
  {
    id: '1.4.5',
    name: 'Images of Text',
    description: 'Text is used to convey information rather than images of text.',
    learnMoreUrl: `${WCAG_BASE_URL}/images-of-text`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.6',
  },
  {
    id: '1.4.10',
    name: 'Reflow',
    description: 'Content can be presented without horizontal scrolling at 320 CSS pixels width.',
    learnMoreUrl: `${WCAG_BASE_URL}/reflow`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.10',
  },
  {
    id: '1.4.11',
    name: 'Non-text Contrast',
    description: 'UI components and graphics have a contrast ratio of at least 3:1.',
    learnMoreUrl: `${WCAG_BASE_URL}/non-text-contrast`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.11',
  },
  {
    id: '1.4.12',
    name: 'Text Spacing',
    description: 'No loss of content when text spacing is adjusted (line height, paragraph, letter, word spacing).',
    learnMoreUrl: `${WCAG_BASE_URL}/text-spacing`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.12',
  },
  {
    id: '1.4.13',
    name: 'Content on Hover or Focus',
    description: 'Additional content triggered by hover or focus is dismissible, hoverable, and persistent.',
    learnMoreUrl: `${WCAG_BASE_URL}/content-on-hover-or-focus`,
    level: 'AA',
    principle: 'perceivable',
    abntRef: 'ABNT 5.11.13',
  },

  // Principle 2: Operable
  {
    id: '2.1.1',
    name: 'Keyboard',
    description: 'All functionality is operable through a keyboard interface.',
    learnMoreUrl: `${WCAG_BASE_URL}/keyboard`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.5.1',
  },
  {
    id: '2.1.2',
    name: 'No Keyboard Trap',
    description: 'Keyboard focus can be moved away from any component using only the keyboard.',
    learnMoreUrl: `${WCAG_BASE_URL}/no-keyboard-trap`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.5.2',
  },
  {
    id: '2.1.4',
    name: 'Character Key Shortcuts',
    description: 'Single character key shortcuts can be turned off, remapped, or are only active on focus.',
    learnMoreUrl: `${WCAG_BASE_URL}/character-key-shortcuts`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.5.4',
  },
  {
    id: '2.2.1',
    name: 'Timing Adjustable',
    description: 'Users can turn off, adjust, or extend time limits.',
    learnMoreUrl: `${WCAG_BASE_URL}/timing-adjustable`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.6.1',
  },
  {
    id: '2.2.2',
    name: 'Pause, Stop, Hide',
    description: 'Moving, blinking, or scrolling content can be paused, stopped, or hidden.',
    learnMoreUrl: `${WCAG_BASE_URL}/pause-stop-hide`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.6.2',
  },
  {
    id: '2.3.1',
    name: 'Three Flashes or Below Threshold',
    description: 'Content does not flash more than three times per second.',
    learnMoreUrl: `${WCAG_BASE_URL}/three-flashes-or-below-threshold`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.10.1',
  },
  {
    id: '2.4.1',
    name: 'Bypass Blocks',
    description: 'A mechanism is available to bypass blocks of content that are repeated on multiple pages.',
    learnMoreUrl: `${WCAG_BASE_URL}/bypass-blocks`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.7.1',
  },
  {
    id: '2.4.2',
    name: 'Page Titled',
    description: 'Web pages have titles that describe topic or purpose.',
    learnMoreUrl: `${WCAG_BASE_URL}/page-titled`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.7.2',
  },
  {
    id: '2.4.3',
    name: 'Focus Order',
    description: 'Components receive focus in an order that preserves meaning and operability.',
    learnMoreUrl: `${WCAG_BASE_URL}/focus-order`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.7.3',
  },
  {
    id: '2.4.4',
    name: 'Link Purpose (In Context)',
    description: 'The purpose of each link can be determined from the link text or its context.',
    learnMoreUrl: `${WCAG_BASE_URL}/link-purpose-in-context`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.7.10',
  },
  {
    id: '2.4.5',
    name: 'Multiple Ways',
    description: 'More than one way is available to locate a web page within a set of pages.',
    learnMoreUrl: `${WCAG_BASE_URL}/multiple-ways`,
    level: 'AA',
    principle: 'operable',
    abntRef: 'ABNT 5.7.5',
  },
  {
    id: '2.4.6',
    name: 'Headings and Labels',
    description: 'Headings and labels describe topic or purpose.',
    learnMoreUrl: `${WCAG_BASE_URL}/headings-and-labels`,
    level: 'AA',
    principle: 'operable',
    abntRef: 'ABNT 5.7.6',
  },
  {
    id: '2.4.7',
    name: 'Focus Visible',
    description: 'The keyboard focus indicator is visible.',
    learnMoreUrl: `${WCAG_BASE_URL}/focus-visible`,
    level: 'AA',
    principle: 'operable',
    abntRef: 'ABNT 5.7.7',
  },
  {
    id: '2.4.11',
    name: 'Focus Not Obscured (Minimum)',
    description: 'The focused component is not entirely hidden by author-created content.',
    learnMoreUrl: `${WCAG_BASE_URL}/focus-not-obscured-minimum`,
    level: 'AA',
    principle: 'operable',
    abntRef: 'ABNT 5.7.12',
  },
  {
    id: '2.5.1',
    name: 'Pointer Gestures',
    description: 'All functionality using multipoint or path-based gestures can be operated with a single pointer.',
    learnMoreUrl: `${WCAG_BASE_URL}/pointer-gestures`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.9.1',
  },
  {
    id: '2.5.2',
    name: 'Pointer Cancellation',
    description: 'Functions triggered by a single pointer can be cancelled.',
    learnMoreUrl: `${WCAG_BASE_URL}/pointer-cancellation`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.9.2',
  },
  {
    id: '2.5.3',
    name: 'Label in Name',
    description: 'Components with visible text labels have accessible names that include that text.',
    learnMoreUrl: `${WCAG_BASE_URL}/label-in-name`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.9.3',
  },
  {
    id: '2.5.4',
    name: 'Motion Actuation',
    description: 'Functionality triggered by device motion can be disabled and operated by UI components.',
    learnMoreUrl: `${WCAG_BASE_URL}/motion-actuation`,
    level: 'A',
    principle: 'operable',
    abntRef: 'ABNT 5.9.4',
  },
  {
    id: '2.5.7',
    name: 'Dragging Movements',
    description: 'Functionality requiring dragging can be achieved with a single pointer without dragging.',
    learnMoreUrl: `${WCAG_BASE_URL}/dragging-movements`,
    level: 'AA',
    principle: 'operable',
    abntRef: 'ABNT 5.9.7',
  },
  {
    id: '2.5.8',
    name: 'Target Size (Minimum)',
    description: 'Pointer targets are at least 24 by 24 CSS pixels.',
    learnMoreUrl: `${WCAG_BASE_URL}/target-size-minimum`,
    level: 'AA',
    principle: 'operable',
    abntRef: 'ABNT 5.9.8',
  },

  // Principle 3: Understandable
  {
    id: '3.1.1',
    name: 'Language of Page',
    description: 'The default human language of the page can be programmatically determined.',
    learnMoreUrl: `${WCAG_BASE_URL}/language-of-page`,
    level: 'A',
    principle: 'understandable',
    abntRef: 'ABNT 5.13.2',
  },
  {
    id: '3.1.2',
    name: 'Language of Parts',
    description: 'The language of each passage or phrase can be programmatically determined.',
    learnMoreUrl: `${WCAG_BASE_URL}/language-of-parts`,
    level: 'AA',
    principle: 'understandable',
    abntRef: 'ABNT 5.13.3',
  },
  {
    id: '3.2.1',
    name: 'On Focus',
    description: 'Receiving focus does not initiate a change of context.',
    learnMoreUrl: `${WCAG_BASE_URL}/on-focus`,
    level: 'A',
    principle: 'understandable',
    abntRef: 'ABNT 5.12.1',
  },
  {
    id: '3.2.2',
    name: 'On Input',
    description: 'Changing a UI component setting does not cause a change of context unless the user is advised.',
    learnMoreUrl: `${WCAG_BASE_URL}/on-input`,
    level: 'A',
    principle: 'understandable',
    abntRef: 'ABNT 5.12.2',
  },
  {
    id: '3.2.3',
    name: 'Consistent Navigation',
    description: 'Navigation mechanisms that are repeated are in the same relative order.',
    learnMoreUrl: `${WCAG_BASE_URL}/consistent-navigation`,
    level: 'AA',
    principle: 'understandable',
    abntRef: 'ABNT 5.12.3',
  },
  {
    id: '3.2.4',
    name: 'Consistent Identification',
    description: 'Components with the same functionality are identified consistently.',
    learnMoreUrl: `${WCAG_BASE_URL}/consistent-identification`,
    level: 'AA',
    principle: 'understandable',
    abntRef: 'ABNT 5.12.4',
  },
  {
    id: '3.2.6',
    name: 'Consistent Help',
    description: 'Help mechanisms are located in the same relative order on multiple pages.',
    learnMoreUrl: `${WCAG_BASE_URL}/consistent-help`,
    level: 'A',
    principle: 'understandable',
    abntRef: 'ABNT 5.12.6',
  },
  {
    id: '3.3.1',
    name: 'Error Identification',
    description: 'Input errors are automatically detected and described to the user in text.',
    learnMoreUrl: `${WCAG_BASE_URL}/error-identification`,
    level: 'A',
    principle: 'understandable',
    abntRef: 'ABNT 5.14.1',
  },
  {
    id: '3.3.2',
    name: 'Labels or Instructions',
    description: 'Labels or instructions are provided when content requires user input.',
    learnMoreUrl: `${WCAG_BASE_URL}/labels-or-instructions`,
    level: 'A',
    principle: 'understandable',
    abntRef: 'ABNT 5.14.2',
  },
  {
    id: '3.3.3',
    name: 'Error Suggestion',
    description: 'If an input error is detected, suggestions for correction are provided.',
    learnMoreUrl: `${WCAG_BASE_URL}/error-suggestion`,
    level: 'AA',
    principle: 'understandable',
    abntRef: 'ABNT 5.14.3',
  },
  {
    id: '3.3.4',
    name: 'Error Prevention (Legal, Financial, Data)',
    description: 'Submissions with legal, financial, or data consequences are reversible, verified, or confirmed.',
    learnMoreUrl: `${WCAG_BASE_URL}/error-prevention-legal-financial-data`,
    level: 'AA',
    principle: 'understandable',
    abntRef: 'ABNT 5.14.4',
  },
  {
    id: '3.3.7',
    name: 'Redundant Entry',
    description: 'Information previously entered is auto-populated or available for selection.',
    learnMoreUrl: `${WCAG_BASE_URL}/redundant-entry`,
    level: 'A',
    principle: 'understandable',
    abntRef: 'ABNT 5.14.7',
  },
  {
    id: '3.3.8',
    name: 'Accessible Authentication (Minimum)',
    description: 'Cognitive function tests are not required for authentication unless an alternative is provided.',
    learnMoreUrl: `${WCAG_BASE_URL}/accessible-authentication-minimum`,
    level: 'AA',
    principle: 'understandable',
    abntRef: 'ABNT 5.14.8',
  },

  // Principle 4: Robust
  {
    id: '4.1.1',
    name: 'Parsing',
    description: 'In content using markup languages, elements have complete tags and are nested according to specs.',
    learnMoreUrl: `${WCAG_BASE_URL}/parsing`,
    level: 'A',
    principle: 'robust',
    abntRef: 'ABNT 5.13.11',
  },
  {
    id: '4.1.2',
    name: 'Name, Role, Value',
    description: 'UI components have accessible name, role, states, properties, and values.',
    learnMoreUrl: `${WCAG_BASE_URL}/name-role-value`,
    level: 'A',
    principle: 'robust',
    abntRef: 'ABNT 5.13.13',
  },
  {
    id: '4.1.3',
    name: 'Status Messages',
    description: 'Status messages can be programmatically determined without receiving focus.',
    learnMoreUrl: `${WCAG_BASE_URL}/status-messages`,
    level: 'AA',
    principle: 'robust',
    abntRef: 'ABNT 5.13.14',
  },
]

export const WCAG_PRINCIPLES = [
  { id: 'perceivable', name: '1. Perceivable', description: 'Information must be presentable in ways users can perceive' },
  { id: 'operable', name: '2. Operable', description: 'User interface must be operable' },
  { id: 'understandable', name: '3. Understandable', description: 'Information and operation must be understandable' },
  { id: 'robust', name: '4. Robust', description: 'Content must be robust enough for various user agents' },
]

// ============================================
// eMAG 3.1 Recommendations
// ============================================

export const EMAG_31_RECOMMENDATIONS: Omit<SuccessCriterion, 'status'>[] = [
  // Secao 1: Marcacao
  { id: '1.1', name: 'Respeitar os padroes web', principle: 'marcacao' },
  { id: '1.2', name: 'Organizar o codigo HTML', principle: 'marcacao' },
  { id: '1.3', name: 'Utilizar corretamente os niveis de cabecalho', principle: 'marcacao' },
  { id: '1.4', name: 'Ordenar de forma logica e intuitiva a leitura', principle: 'marcacao' },
  { id: '1.5', name: 'Fornecer ancoras para ir direto a um bloco de conteudo', principle: 'marcacao' },
  { id: '1.6', name: 'Nao utilizar tabelas para diagramacao', principle: 'marcacao' },
  { id: '1.7', name: 'Separar links adjacentes', principle: 'marcacao' },
  { id: '1.8', name: 'Dividir as areas de informacao', principle: 'marcacao' },
  { id: '1.9', name: 'Nao abrir novas instancias sem a solicitacao do usuario', principle: 'marcacao' },

  // Secao 2: Comportamento
  { id: '2.1', name: 'Disponibilizar todas as funcoes via teclado', principle: 'comportamento' },
  { id: '2.2', name: 'Garantir que os objetos programaveis sejam acessiveis', principle: 'comportamento' },
  { id: '2.3', name: 'Nao criar paginas com atualizacao automatica periodica', principle: 'comportamento' },
  { id: '2.4', name: 'Nao utilizar redirecionamento automatico de paginas', principle: 'comportamento' },
  { id: '2.5', name: 'Fornecer alternativa para modificar limite de tempo', principle: 'comportamento' },
  { id: '2.6', name: 'Nao incluir situacoes com movimento ou piscar', principle: 'comportamento' },
  { id: '2.7', name: 'Assegurar o controle do usuario sobre as alteracoes temporais', principle: 'comportamento' },

  // Secao 3: Conteudo/Informacao
  { id: '3.1', name: 'Identificar o idioma principal da pagina', principle: 'conteudo' },
  { id: '3.2', name: 'Informar mudanca de idioma no conteudo', principle: 'conteudo' },
  { id: '3.3', name: 'Oferecer um titulo descritivo e informativo a pagina', principle: 'conteudo' },
  { id: '3.4', name: 'Informar o usuario sobre sua localizacao na pagina', principle: 'conteudo' },
  { id: '3.5', name: 'Descrever links clara e sucintamente', principle: 'conteudo' },
  { id: '3.6', name: 'Fornecer alternativa em texto para imagens', principle: 'conteudo' },
  { id: '3.7', name: 'Utilizar mapas de imagem de forma acessivel', principle: 'conteudo' },
  { id: '3.8', name: 'Disponibilizar documentos em formatos acessiveis', principle: 'conteudo' },
  { id: '3.9', name: 'Em tabelas, utilizar titulos e resumos', principle: 'conteudo' },
  { id: '3.10', name: 'Associar celulas de dados as celulas de cabecalho', principle: 'conteudo' },
  { id: '3.11', name: 'Garantir a leitura e compreensao das informacoes', principle: 'conteudo' },
  { id: '3.12', name: 'Disponibilizar uma explicacao para siglas', principle: 'conteudo' },

  // Secao 4: Apresentacao/Design
  { id: '4.1', name: 'Oferecer contraste minimo entre plano de fundo e primeiro plano', principle: 'apresentacao' },
  { id: '4.2', name: 'Nao utilizar apenas cor ou outras caracteristicas sensoriais', principle: 'apresentacao' },
  { id: '4.3', name: 'Permitir redimensionamento de texto', principle: 'apresentacao' },
  { id: '4.4', name: 'Possibilitar que o elemento com foco seja visualmente evidente', principle: 'apresentacao' },

  // Secao 5: Multimidia
  { id: '5.1', name: 'Fornecer alternativa para video', principle: 'multimidia' },
  { id: '5.2', name: 'Fornecer alternativa para audio', principle: 'multimidia' },
  { id: '5.3', name: 'Oferecer audiodescricao para video pre-gravado', principle: 'multimidia' },
  { id: '5.4', name: 'Fornecer controle de audio para som', principle: 'multimidia' },
  { id: '5.5', name: 'Fornecer controle de animacao', principle: 'multimidia' },

  // Secao 6: Formulario
  { id: '6.1', name: 'Fornecer alternativa em texto para botoes de imagem', principle: 'formulario' },
  { id: '6.2', name: 'Associar etiquetas aos seus campos', principle: 'formulario' },
  { id: '6.3', name: 'Estabelecer uma ordem logica de navegacao', principle: 'formulario' },
  { id: '6.4', name: 'Nao provocar automaticamente alteracao no contexto', principle: 'formulario' },
  { id: '6.5', name: 'Fornecer instrucoes para entrada de dados', principle: 'formulario' },
  { id: '6.6', name: 'Identificar e descrever erros de entrada de dados', principle: 'formulario' },
  { id: '6.7', name: 'Agrupar campos de formulario', principle: 'formulario' },
  { id: '6.8', name: 'Fornecer CAPTCHA acessivel', principle: 'formulario' },
]

export const EMAG_SECTIONS = [
  { id: 'marcacao', name: '1. Marcacao' },
  { id: 'comportamento', name: '2. Comportamento' },
  { id: 'conteudo', name: '3. Conteudo' },
  { id: 'apresentacao', name: '4. Apresentacao' },
  { id: 'multimidia', name: '5. Multimidia' },
  { id: 'formulario', name: '6. Formulario' },
]

// ============================================
// Standard Definitions
// ============================================

export const STANDARDS_CONFIG = {
  'wcag-2.2-aa': {
    id: 'wcag-2.2-aa',
    name: 'WCAG 2.2 AA',
    shortName: 'WCAG 2.2 AA',
    description: 'Web Content Accessibility Guidelines 2.2 Level AA',
    version: '2.2',
    criteria: WCAG_22_CRITERIA,
    principles: WCAG_PRINCIPLES,
  },
  'emag-3.1': {
    id: 'emag-3.1',
    name: 'eMAG 3.1',
    shortName: 'eMAG',
    description: 'Modelo de Acessibilidade em Governo Eletronico 3.1',
    version: '3.1',
    criteria: EMAG_31_RECOMMENDATIONS,
    principles: EMAG_SECTIONS,
  },
  // Extensivel para futuros padroes
  // 'section-508': { ... },
  // 'ada': { ... },
  // 'eaa': { ... },
} as const

export type StandardId = keyof typeof STANDARDS_CONFIG
