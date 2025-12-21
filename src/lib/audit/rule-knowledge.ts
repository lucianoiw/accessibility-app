/**
 * Knowledge base for accessibility rules
 * Contains fix instructions, code examples, and evaluation guidance
 */

export interface CodeExample {
  description?: string
  before: string
  after: string
}

export interface RuleKnowledge {
  whyItMatters: string
  affectedUsers?: ('screenReader' | 'cognitive' | 'motor' | 'lowVision' | 'deaf' | 'colorBlind')[]
  fixSteps: string[]
  codeExamples?: CodeExample[]
  falsePositiveGuidance?: string
  evaluationQuestions?: string[]
  emagRecommendation?: string
}

// Knowledge base indexed by rule_id
const RULE_KNOWLEDGE: Record<string, RuleKnowledge> = {
  // ============================================
  // Custom Brazilian Rules
  // ============================================

  'link-texto-generico': {
    whyItMatters: 'Links com texto genérico como "clique aqui", "saiba mais" ou "leia mais" não informam o destino. Usuários de leitor de tela navegam por lista de links e precisam entender cada destino sem contexto adicional.',
    affectedUsers: ['screenReader', 'cognitive'],
    fixSteps: [
      'Substitua o texto genérico por uma descrição clara do destino',
      'O texto deve fazer sentido fora do contexto da página',
      'Evite começar com "Link para..." - leitores de tela já anunciam que é um link',
      'Se necessário, use aria-label para texto mais descritivo sem mudar o visual',
    ],
    codeExamples: [
      {
        description: 'Link com texto genérico',
        before: '<a href="/precos">Clique aqui</a>',
        after: '<a href="/precos">Ver nossos preços</a>',
      },
      {
        description: 'Usando aria-label quando design exige texto curto',
        before: '<a href="/artigo">Saiba mais</a>',
        after: '<a href="/artigo" aria-label="Leia o artigo completo sobre acessibilidade">Saiba mais</a>',
      },
    ],
    falsePositiveGuidance: 'Pode ser falso positivo se o contexto imediato (mesma frase ou título anterior) deixar claro o destino do link.',
    evaluationQuestions: [
      'Se você listasse todos os links da página, entenderia o destino de cada um apenas pelo texto?',
      'O texto do link descreve o que vai acontecer ou para onde vai?',
    ],
    emagRecommendation: '3.5',
  },

  'link-nova-aba-sem-aviso': {
    whyItMatters: 'Links que abrem em nova aba/janela sem aviso prévio podem desorientar usuários, especialmente os que usam leitores de tela ou têm dificuldades cognitivas. O botão "voltar" não funciona e o contexto muda inesperadamente.',
    affectedUsers: ['screenReader', 'cognitive', 'motor'],
    fixSteps: [
      'Adicione indicação visual e textual de que abre em nova aba',
      'Use um ícone de link externo com texto alternativo',
      'Inclua "(abre em nova aba)" no texto do link ou aria-label',
      'Considere se realmente precisa abrir em nova aba',
    ],
    codeExamples: [
      {
        description: 'Adicionando aviso de nova aba',
        before: '<a href="https://example.com" target="_blank">Site externo</a>',
        after: '<a href="https://example.com" target="_blank" rel="noopener">\n  Site externo\n  <span class="sr-only">(abre em nova aba)</span>\n  <svg aria-hidden="true"><!-- ícone --></svg>\n</a>',
      },
    ],
    falsePositiveGuidance: 'Se já existe indicação clara (ícone + texto acessível) de que o link abre em nova aba, pode marcar como falso positivo.',
    evaluationQuestions: [
      'Há indicação visual de que este link abre em nova aba?',
      'Um usuário de leitor de tela seria avisado antes de clicar?',
    ],
    emagRecommendation: '1.9',
  },

  'imagem-alt-nome-arquivo': {
    whyItMatters: 'Textos alternativos que são nomes de arquivo (ex: "IMG_2024.jpg", "foto1.png") não descrevem o conteúdo da imagem. Usuários de leitor de tela ouvem o nome do arquivo em vez de uma descrição útil.',
    affectedUsers: ['screenReader', 'lowVision'],
    fixSteps: [
      'Descreva o conteúdo e função da imagem em 1-2 frases',
      'Foque no que é importante para o contexto da página',
      'Se a imagem é decorativa, use alt="" (vazio)',
      'Evite iniciar com "Imagem de..." - leitores já anunciam que é imagem',
    ],
    codeExamples: [
      {
        description: 'Substituindo nome de arquivo por descrição',
        before: '<img src="foto.jpg" alt="IMG_20240315_143022.jpg">',
        after: '<img src="foto.jpg" alt="Equipe de desenvolvimento reunida no escritório">',
      },
      {
        description: 'Imagem decorativa',
        before: '<img src="decorative.png" alt="ornamento_azul.png">',
        after: '<img src="decorative.png" alt="">',
      },
    ],
    emagRecommendation: '3.6',
  },

  'texto-justificado': {
    whyItMatters: 'Texto justificado cria espaços irregulares entre palavras, dificultando a leitura para pessoas com dislexia ou dificuldades cognitivas. Os "rios brancos" atrapalham o fluxo de leitura.',
    affectedUsers: ['cognitive', 'lowVision'],
    fixSteps: [
      'Use text-align: left (alinhamento à esquerda)',
      'Verifique o CSS e remova text-align: justify',
      'Considere usar max-width para manter linhas legíveis',
    ],
    codeExamples: [
      {
        before: '.artigo { text-align: justify; }',
        after: '.artigo { text-align: left; }',
      },
    ],
    falsePositiveGuidance: 'Raramente é falso positivo. A única exceção seria texto em coluna muito estreita onde justificação não cause espaços irregulares significativos.',
  },

  'texto-maiusculo-css': {
    whyItMatters: 'Texto todo em maiúsculas (via CSS text-transform: uppercase) é mais difícil de ler, especialmente para pessoas com dislexia. As letras maiúsculas têm formatos menos distintos.',
    affectedUsers: ['cognitive', 'lowVision'],
    fixSteps: [
      'Remova text-transform: uppercase do CSS',
      'Se maiúsculas são necessárias, considere usar apenas para títulos curtos',
      'Use espaçamento entre letras (letter-spacing) para melhorar legibilidade',
    ],
    codeExamples: [
      {
        before: '.titulo { text-transform: uppercase; }',
        after: '.titulo {\n  /* Remover uppercase ou usar apenas em títulos curtos */\n  letter-spacing: 0.05em;\n}',
      },
    ],
    falsePositiveGuidance: 'Pode ser aceitável em títulos curtos (2-3 palavras) ou botões onde é convenção visual.',
    evaluationQuestions: [
      'O texto em maiúsculas é curto (menos de 4 palavras)?',
      'É um elemento de interface padrão como botão ou label de navegação?',
    ],
  },

  'br-excessivo-layout': {
    whyItMatters: 'Usar múltiplos <br> para criar espaçamento é semanticamente incorreto e quebra quando o CSS é desativado. Leitores de tela podem anunciar as quebras de linha repetidamente.',
    affectedUsers: ['screenReader'],
    fixSteps: [
      'Substitua múltiplos <br> por margin/padding CSS',
      'Use elementos semânticos apropriados (parágrafos, listas, etc)',
      'Mantenha <br> apenas para quebras de linha que fazem sentido no conteúdo (ex: endereços, poemas)',
    ],
    codeExamples: [
      {
        before: '<p>Texto</p>\n<br><br><br>\n<p>Mais texto</p>',
        after: '<p>Texto</p>\n<p class="mt-8">Mais texto</p>\n\n/* CSS: .mt-8 { margin-top: 2rem; } */',
      },
    ],
    emagRecommendation: '1.6',
  },

  'brasil-libras-plugin': {
    whyItMatters: 'Sites governamentais brasileiros devem oferecer conteúdo em Libras para usuários surdos. O VLibras e Hand Talk são plugins que fazem tradução automática.',
    affectedUsers: ['deaf'],
    fixSteps: [
      'Instale o VLibras (governoeletronico.gov.br/vlibras) ou Hand Talk',
      'Adicione o widget ao site',
      'Certifique-se de que o widget é visível e acessível por teclado',
      'Teste se a tradução está funcionando',
    ],
    codeExamples: [
      {
        description: 'Adicionando VLibras',
        before: '<!-- Sem plugin de Libras -->',
        after: '<script src="https://vlibras.gov.br/app/vlibras-plugin.js"></script>\n<script>new window.VLibras.Widget();</script>',
      },
    ],
    falsePositiveGuidance: 'Marque como falso positivo apenas se o site já tiver o VLibras ou Hand Talk instalado e funcionando.',
    evaluationQuestions: [
      'O plugin de Libras está instalado e visível na página?',
      'O widget abre corretamente quando clicado?',
      'O avatar/intérprete aparece e faz os sinais?',
    ],
    emagRecommendation: '5.3',
  },

  // ============================================
  // eMAG Specific Rules
  // ============================================

  'emag-skip-links': {
    whyItMatters: 'Usuários de teclado e leitor de tela precisam pular menus e navegação repetitiva para acessar o conteúdo principal. Sem skip links, precisam navegar por dezenas de links em cada página.',
    affectedUsers: ['screenReader', 'motor'],
    fixSteps: [
      'Adicione link "Pular para conteúdo" como primeiro elemento focável',
      'O link deve apontar para o id do conteúdo principal',
      'Pode estar visualmente oculto, mas deve aparecer ao receber foco',
    ],
    codeExamples: [
      {
        description: 'Skip link com CSS para aparecer no foco',
        before: '<body>\n  <nav><!-- navegação --></nav>\n  <main><!-- conteúdo --></main>\n</body>',
        after: '<body>\n  <a href="#main" class="skip-link">Pular para conteúdo</a>\n  <nav><!-- navegação --></nav>\n  <main id="main"><!-- conteúdo --></main>\n</body>\n\n/* CSS:\n.skip-link {\n  position: absolute;\n  left: -9999px;\n}\n.skip-link:focus {\n  left: 0;\n  top: 0;\n  z-index: 9999;\n}\n*/',
      },
    ],
    emagRecommendation: '1.5',
  },

  'emag-atalhos-teclado': {
    whyItMatters: 'Sites governamentais brasileiros devem seguir os atalhos padrão do eMAG: Alt+1 (conteúdo principal), Alt+2 (navegação), Alt+3 (busca). Isso permite acesso rápido e padronizado.',
    affectedUsers: ['motor', 'screenReader'],
    fixSteps: [
      'Adicione accesskey="1" ao link para conteúdo principal',
      'Adicione accesskey="2" ao link para navegação',
      'Adicione accesskey="3" ao link/campo de busca',
      'Documente os atalhos na página de acessibilidade',
    ],
    codeExamples: [
      {
        before: '<nav>\n  <a href="#main">Conteúdo</a>\n  <a href="#nav">Navegação</a>\n</nav>',
        after: '<nav>\n  <a href="#main" accesskey="1">Conteúdo</a>\n  <a href="#nav" accesskey="2">Navegação</a>\n  <a href="#busca" accesskey="3">Busca</a>\n</nav>',
      },
    ],
    falsePositiveGuidance: 'Apenas sites governamentais (.gov.br) são obrigados a seguir este padrão.',
    emagRecommendation: '1.5',
  },

  // ============================================
  // axe-core Rules (most common)
  // ============================================

  'image-alt': {
    whyItMatters: 'Imagens sem texto alternativo são completamente invisíveis para usuários de leitor de tela. Eles ouvem apenas "imagem" ou o nome do arquivo, sem saber o que a imagem representa.',
    affectedUsers: ['screenReader', 'lowVision'],
    fixSteps: [
      'Adicione atributo alt com descrição do conteúdo',
      'Para imagens decorativas, use alt="" (vazio)',
      'Descreva o conteúdo, não a aparência ("Gráfico de vendas 2024" não "Gráfico colorido")',
      'Se a imagem é um link, descreva o destino',
    ],
    codeExamples: [
      {
        description: 'Imagem informativa',
        before: '<img src="produto.jpg">',
        after: '<img src="produto.jpg" alt="Tênis esportivo azul modelo Runner X">',
      },
      {
        description: 'Imagem decorativa',
        before: '<img src="ornamento.svg">',
        after: '<img src="ornamento.svg" alt="">',
      },
      {
        description: 'Imagem como link',
        before: '<a href="/"><img src="logo.png"></a>',
        after: '<a href="/"><img src="logo.png" alt="Página inicial - Nome da Empresa"></a>',
      },
    ],
  },

  'color-contrast': {
    whyItMatters: 'Contraste insuficiente entre texto e fundo dificulta a leitura para pessoas com baixa visão, daltonismo ou em condições de luz forte. WCAG exige razão mínima de 4.5:1 para texto normal.',
    affectedUsers: ['lowVision', 'colorBlind'],
    fixSteps: [
      'Use ferramenta de verificação de contraste (WebAIM Contrast Checker)',
      'Escureça a cor do texto ou clareie o fundo',
      'Texto normal: mínimo 4.5:1 / Texto grande (18pt+): mínimo 3:1',
      'Não confie apenas em cores para transmitir informação',
    ],
    codeExamples: [
      {
        description: 'Aumentando contraste de texto',
        before: '.texto { color: #999; background: #fff; } /* razão 2.8:1 */',
        after: '.texto { color: #595959; background: #fff; } /* razão 7:1 */\n/* ou use cores mais escuras ainda para melhor legibilidade */',
      },
    ],
    falsePositiveGuidance: 'Pode ser falso positivo em logos, texto decorativo ou texto desabilitado (que não precisa atender ao contraste mínimo).',
    evaluationQuestions: [
      'Este texto transmite informação importante?',
      'É um logo ou marca registrada?',
      'O elemento está desabilitado ou inativo?',
    ],
  },

  'label': {
    whyItMatters: 'Campos de formulário sem label não informam seu propósito para usuários de leitor de tela. Eles não sabem que informação deve ser inserida.',
    affectedUsers: ['screenReader', 'cognitive'],
    fixSteps: [
      'Adicione elemento <label> associado ao campo via for/id',
      'Ou envolva o campo dentro do <label>',
      'Não use apenas placeholder como label (desaparece ao digitar)',
      'Para campos sem label visual, use aria-label ou aria-labelledby',
    ],
    codeExamples: [
      {
        description: 'Associando label com for/id',
        before: '<input type="email" placeholder="Email">',
        after: '<label for="email">Email</label>\n<input type="email" id="email">',
      },
      {
        description: 'Label envolvendo o campo',
        before: '<input type="checkbox">',
        after: '<label>\n  <input type="checkbox">\n  Aceito os termos\n</label>',
      },
      {
        description: 'Usando aria-label quando não há label visual',
        before: '<input type="search">',
        after: '<input type="search" aria-label="Buscar no site">',
      },
    ],
  },

  'button-name': {
    whyItMatters: 'Botões sem nome acessível não informam sua função para usuários de leitor de tela. Eles ouvem apenas "botão" sem saber o que acontece ao clicar.',
    affectedUsers: ['screenReader'],
    fixSteps: [
      'Adicione texto visível ao botão',
      'Para botões só com ícone, use aria-label',
      'Não use apenas title (não é anunciado por todos os leitores)',
    ],
    codeExamples: [
      {
        description: 'Botão com ícone precisa de aria-label',
        before: '<button><svg><!-- ícone X --></svg></button>',
        after: '<button aria-label="Fechar">\n  <svg aria-hidden="true"><!-- ícone X --></svg>\n</button>',
      },
    ],
  },

  'link-name': {
    whyItMatters: 'Links sem nome acessível não informam seu destino. Usuários de leitor de tela ouvem apenas "link" sem saber para onde vai.',
    affectedUsers: ['screenReader'],
    fixSteps: [
      'Adicione texto visível ao link',
      'Se o link é uma imagem, a imagem precisa de alt',
      'Para links que só mostram ícone, use aria-label',
    ],
    codeExamples: [
      {
        description: 'Link com imagem precisa de alt',
        before: '<a href="/"><img src="logo.png"></a>',
        after: '<a href="/"><img src="logo.png" alt="Página inicial"></a>',
      },
      {
        description: 'Link com ícone precisa de aria-label',
        before: '<a href="/twitter"><svg><!-- ícone --></svg></a>',
        after: '<a href="/twitter" aria-label="Nosso Twitter">\n  <svg aria-hidden="true"><!-- ícone --></svg>\n</a>',
      },
    ],
  },

  'heading-order': {
    whyItMatters: 'Headings (h1-h6) criam uma estrutura de navegação para usuários de leitor de tela. Pular níveis (ex: h1 para h3) quebra essa estrutura e dificulta a compreensão da hierarquia.',
    affectedUsers: ['screenReader', 'cognitive'],
    fixSteps: [
      'Use headings em ordem sequencial (h1 → h2 → h3)',
      'Cada página deve ter um único h1',
      'Não use headings apenas por estilo visual',
      'Se precisar de estilo diferente, use CSS em vez de mudar o nível',
    ],
    codeExamples: [
      {
        description: 'Corrigindo hierarquia pulada',
        before: '<h1>Título</h1>\n<h3>Subtítulo</h3>',
        after: '<h1>Título</h1>\n<h2>Subtítulo</h2>',
      },
    ],
    falsePositiveGuidance: 'Pode ser falso positivo em componentes reutilizáveis que são inseridos em diferentes contextos. Verifique a hierarquia no contexto final.',
  },

  'region': {
    whyItMatters: 'Conteúdo fora de landmarks (main, nav, header, footer, etc) dificulta a navegação por estrutura. Usuários de leitor de tela usam landmarks para pular seções.',
    affectedUsers: ['screenReader'],
    fixSteps: [
      'Envolva todo conteúdo em landmarks apropriados',
      'Use <main> para conteúdo principal',
      'Use <nav> para navegação',
      'Use <header> e <footer> para cabeçalho e rodapé',
      'Use <aside> para conteúdo relacionado/complementar',
    ],
    codeExamples: [
      {
        before: '<div class="content"><!-- conteúdo --></div>',
        after: '<main>\n  <div class="content"><!-- conteúdo --></div>\n</main>',
      },
    ],
    falsePositiveGuidance: 'Pode ser falso positivo para elementos auxiliares como skip links ou scripts. Foque no conteúdo visível e interativo.',
  },

  // ============================================
  // COGA Rules
  // ============================================

  'legibilidade-texto-complexo': {
    whyItMatters: 'Texto com vocabulário complexo, frases longas ou estrutura difícil é uma barreira para pessoas com dificuldades cognitivas, baixa escolaridade ou que não são falantes nativos.',
    affectedUsers: ['cognitive'],
    fixSteps: [
      'Use frases curtas (idealmente menos de 25 palavras)',
      'Prefira palavras simples e comuns',
      'Divida parágrafos longos em menores',
      'Use listas quando apropriado',
      'Explique termos técnicos ou jargões',
    ],
    falsePositiveGuidance: 'Pode ser aceitável em conteúdo técnico ou acadêmico onde a complexidade é esperada pelo público-alvo. Considere o contexto.',
    evaluationQuestions: [
      'O público-alvo espera esse nível de complexidade?',
      'Existe uma versão em linguagem simples disponível?',
      'Os termos técnicos são explicados?',
    ],
    emagRecommendation: '3.11',
  },

  'siglas-sem-expansao': {
    whyItMatters: 'Siglas sem explicação são uma barreira para pessoas com dificuldades cognitivas ou que não conhecem os termos. Mesmo siglas comuns podem ser desconhecidas por alguns usuários.',
    affectedUsers: ['cognitive', 'screenReader'],
    fixSteps: [
      'Na primeira ocorrência, escreva o nome completo seguido da sigla: "Instituto Nacional do Seguro Social (INSS)"',
      'Use <abbr> com title para siglas: <abbr title="Instituto...">INSS</abbr>',
      'Considere um glossário para documentos longos',
    ],
    codeExamples: [
      {
        before: '<p>O INSS é responsável pelos benefícios.</p>',
        after: '<p>O <abbr title="Instituto Nacional do Seguro Social">INSS</abbr> é responsável pelos benefícios.</p>',
      },
    ],
    emagRecommendation: '3.12',
  },
}

/**
 * Get knowledge for a specific rule
 * Returns null if no knowledge is available
 */
export function getRuleKnowledge(ruleId: string): RuleKnowledge | null {
  return RULE_KNOWLEDGE[ruleId] || null
}

/**
 * Check if a rule has knowledge available
 */
export function hasRuleKnowledge(ruleId: string): boolean {
  return ruleId in RULE_KNOWLEDGE
}

/**
 * Get all rule IDs that have knowledge
 */
export function getRulesWithKnowledge(): string[] {
  return Object.keys(RULE_KNOWLEDGE)
}
