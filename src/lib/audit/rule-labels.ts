/**
 * Mapeamento de IDs de regras para labels amigáveis em português
 */
export const RULE_LABELS: Record<string, string> = {
  // Regras customizadas brasileiras
  'link-texto-generico': 'Link com texto genérico',
  'link-nova-aba-sem-aviso': 'Link abre nova aba sem aviso',
  'imagem-alt-nome-arquivo': 'Alt text parece nome de arquivo',
  'texto-justificado': 'Texto justificado',
  'texto-maiusculo-css': 'Texto em maiúsculas via CSS',
  'br-excessivo-layout': 'Múltiplos <br> para espaçamento',
  'atributo-title-redundante': 'Atributo title redundante',
  'rotulo-ambiguo': 'Rótulo ambíguo',
  'rotulo-curto-ambiguo': 'Rótulo curto ou ambíguo',
  'fonte-muito-pequena': 'Fonte muito pequena',
  'conteudo-lorem-ipsum': 'Conteúdo Lorem Ipsum detectado',
  'sem-plugin-libras': 'Sem plugin de Libras',
  'brasil-libras-plugin': 'Sem plugin de Libras (VLibras/Hand Talk)',

  // Regras eMAG específicas
  'emag-skip-links': 'Sem links de saltar conteúdo',
  'emag-atalhos-teclado': 'Sem atalhos de teclado padrão (Alt+1/2/3)',
  'emag-links-adjacentes': 'Links adjacentes sem separação',
  'emag-breadcrumb': 'Página sem breadcrumb',
  'emag-tabela-layout': 'Tabela usada para layout',
  'emag-pdf-acessivel': 'PDF sem indicação de formato ou alternativa',
  'autoplay-video-audio': 'Mídia com autoplay sem controles',
  'carrossel-sem-controles': 'Carrossel/slideshow sem controles de pausa',
  'refresh-automatico': 'Página com redirecionamento automático',
  'barra-acessibilidade-gov-br': 'Site governamental sem barra de acessibilidade',

  // Regras COGA (Acessibilidade Cognitiva)
  'legibilidade-texto-complexo': 'Texto com baixa legibilidade',
  'siglas-sem-expansao': 'Sigla sem explicação',
  'linguagem-inconsistente': 'Texto em outro idioma sem marcação',
  'timeout-sem-aviso': 'Formulário com timeout sem aviso',
  'captcha-sem-alternativa': 'CAPTCHA sem alternativa acessível',
  'animacao-sem-pause': 'Animação sem controle de pausa',

  // Regras axe-core - Imagens
  'image-alt': 'Imagem sem texto alternativo',
  'image-redundant-alt': 'Alt text redundante',
  'input-image-alt': 'Input de imagem sem alt',
  'area-alt': 'Área de mapa sem alt',
  'object-alt': 'Objeto sem alternativa',
  'svg-img-alt': 'SVG sem texto alternativo',
  'role-img-alt': 'Elemento com role=img sem alt',

  // Regras axe-core - Contraste
  'color-contrast': 'Contraste de cores insuficiente',
  'color-contrast-enhanced': 'Contraste de cores insuficiente (nível AAA)',
  'link-in-text-block': 'Link não distinguível do texto',

  // Regras axe-core - Formulários
  'label': 'Campo sem label',
  'label-title-only': 'Campo com apenas title',
  'input-button-name': 'Botão de input sem nome',
  'select-name': 'Select sem nome acessível',
  'autocomplete-valid': 'Autocomplete inválido',
  'form-field-multiple-labels': 'Campo com múltiplos labels',

  // Regras axe-core - Links e botões
  'link-name': 'Link sem nome acessível',
  'button-name': 'Botão sem nome acessível',
  'identical-links-same-purpose': 'Links idênticos com propósitos diferentes',
  'focus-order-semantics': 'Ordem de foco incorreta',

  // Regras axe-core - Estrutura
  'region': 'Conteúdo fora de landmarks',
  'landmark-one-main': 'Página sem main único',
  'landmark-no-duplicate-banner': 'Múltiplos banners',
  'landmark-no-duplicate-contentinfo': 'Múltiplos contentinfo',
  'landmark-no-duplicate-main': 'Múltiplos mains',
  'landmark-unique': 'Landmarks não únicos',
  'bypass': 'Sem mecanismo de skip',

  // Regras axe-core - Headings
  'heading-order': 'Hierarquia de headings incorreta',
  'empty-heading': 'Heading vazio',
  'page-has-heading-one': 'Página sem H1',
  'duplicate-id-aria': 'IDs ARIA duplicados',
  'duplicate-id-active': 'IDs duplicados em elementos ativos',
  'duplicate-id': 'IDs duplicados',

  // Regras axe-core - Tabelas
  'table-duplicate-name': 'Tabela com nome duplicado',
  'td-headers-attr': 'Célula com headers inválidos',
  'th-has-data-cells': 'TH sem células de dados',
  'scope-attr-valid': 'Atributo scope inválido',
  'table-fake-caption': 'Tabela com caption falso',

  // Regras axe-core - ARIA
  'aria-allowed-attr': 'Atributo ARIA não permitido',
  'aria-allowed-role': 'Role não permitido',
  'aria-command-name': 'Comando ARIA sem nome',
  'aria-dialog-name': 'Dialog sem nome',
  'aria-hidden-body': 'Body com aria-hidden',
  'aria-hidden-focus': 'Elemento focável com aria-hidden',
  'aria-input-field-name': 'Input ARIA sem nome',
  'aria-meter-name': 'Meter sem nome',
  'aria-progressbar-name': 'Progressbar sem nome',
  'aria-required-attr': 'Atributo ARIA obrigatório ausente',
  'aria-required-children': 'Filhos ARIA obrigatórios ausentes',
  'aria-required-parent': 'Pai ARIA obrigatório ausente',
  'aria-roles': 'Role ARIA inválido',
  'aria-toggle-field-name': 'Toggle ARIA sem nome',
  'aria-tooltip-name': 'Tooltip sem nome',
  'aria-valid-attr-value': 'Valor de atributo ARIA inválido',
  'aria-valid-attr': 'Atributo ARIA inválido',

  // Regras axe-core - Teclado
  'tabindex': 'Tabindex maior que 0',
  'focus-visible': 'Foco não visível',
  'scrollable-region-focusable': 'Região scrollável não focável',
  'nested-interactive': 'Elementos interativos aninhados',

  // Regras axe-core - Linguagem
  'html-has-lang': 'HTML sem atributo lang',
  'html-lang-valid': 'Atributo lang inválido',
  'html-xml-lang-mismatch': 'lang e xml:lang diferentes',
  'valid-lang': 'Código de idioma inválido',

  // Regras axe-core - Outros
  'document-title': 'Página sem título',
  'frame-title': 'Frame sem título',
  'frame-title-unique': 'Títulos de frame não únicos',
  'meta-refresh': 'Meta refresh detectado',
  'meta-viewport': 'Meta viewport bloqueia zoom',
  'video-caption': 'Vídeo sem legendas',
  'audio-caption': 'Áudio sem transcrição',
  'blink': 'Elemento blink detectado',
  'marquee': 'Elemento marquee detectado',
  'server-side-image-map': 'Mapa de imagem server-side',
  'definition-list': 'Lista de definição incorreta',
  'dlitem': 'Item de DL incorreto',
  'list': 'Lista incorreta',
  'listitem': 'Item de lista fora de lista',
  'p-as-heading': 'Parágrafo usado como heading',
}

/**
 * Retorna o label amigável para uma regra
 */
export function getRuleLabel(ruleId: string): string {
  return RULE_LABELS[ruleId] || formatRuleId(ruleId)
}

/**
 * Formata um ID de regra para ser mais legível
 * Usado como fallback quando não há label mapeado
 */
function formatRuleId(ruleId: string): string {
  return ruleId
    .replace(/-/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}
