import type { Page } from 'playwright'
import type { ImpactLevel } from '@/types'
import { getCogaViolations } from './coga-rules'

export interface CustomViolation {
  ruleId: string
  impact: ImpactLevel
  wcagLevel: string | null
  wcagVersion: string | null
  wcagCriteria: string[]
  wcagTags: string[]
  abntSection: string | null
  help: string
  description: string
  helpUrl: string | null
  selector: string
  fullPath: string | null
  xpath: string | null
  html: string
  parentHtml: string | null
  failureSummary: string | null
}

// NOTA: Todas as chamadas page.evaluate usam strings em vez de funções
// para evitar que o esbuild do Trigger.dev adicione helpers como "__name"
// que não existem no contexto do browser

export interface CustomRulesOptions {
  includeCoga?: boolean
}

/**
 * Runs all custom Brazilian accessibility rules
 */
export async function getCustomViolations(
  page: Page,
  options: CustomRulesOptions = {}
): Promise<CustomViolation[]> {
  const { includeCoga = false } = options
  const violations: CustomViolation[] = []

  // Injetar funções getSelector e getXPath no browser (disponível globalmente)
  const injectHelpersCode = `
    window.getSelector = (el) => {
      if (el.id) return '#' + el.id;

      const path = [];
      let current = el;

      while (current && current.tagName !== 'HTML') {
        let selector = current.tagName.toLowerCase();

        if (current.id) {
          selector = '#' + current.id;
          path.unshift(selector);
          break;
        }

        if (current.className && typeof current.className === 'string') {
          const classes = current.className.trim().split(/\\s+/).slice(0, 2).join('.');
          if (classes) selector += '.' + classes;
        }

        const parentEl = current.parentElement;
        if (parentEl) {
          const currentTag = current.tagName;
          const siblings = Array.from(parentEl.children).filter(c => c.tagName === currentTag);
          if (siblings.length > 1) {
            const index = siblings.indexOf(current) + 1;
            selector += ':nth-of-type(' + index + ')';
          }
        }

        path.unshift(selector);
        current = parentEl;
      }

      return path.join(' > ');
    };

    window.getXPath = (el) => {
      const parts = [];
      let current = el;

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 1;
        let prevSibling = current.previousElementSibling;

        while (prevSibling) {
          if (prevSibling.tagName === current.tagName) {
            index++;
          }
          prevSibling = prevSibling.previousElementSibling;
        }

        const tagName = current.tagName.toLowerCase();
        let hasMultipleSiblings = false;
        let checkSibling = current.parentElement?.firstElementChild || null;
        while (checkSibling) {
          if (checkSibling !== current && checkSibling.tagName === current.tagName) {
            hasMultipleSiblings = true;
            break;
          }
          checkSibling = checkSibling.nextElementSibling;
        }

        const part = hasMultipleSiblings ? tagName + '[' + index + ']' : tagName;
        parts.unshift(part);
        current = current.parentElement;
      }

      return '/' + parts.join('/');
    };
  `
  await page.evaluate(injectHelpersCode)

  // Executar todas as regras em paralelo
  const results = await Promise.all([
    checkLinkTextoGenerico(page),
    checkLinkNovaAbaSemAviso(page),
    checkImagemAltNomeArquivo(page),
    checkTextoJustificado(page),
    checkTextoMaiusculoCss(page),
    checkBrExcessivoLayout(page),
    checkAtributoTitleRedundante(page),
    checkRotuloCurtoAmbiguo(page),
    checkConteudoLoremIpsum(page),
    checkFonteMuitoPequena(page),
    checkBrasilLibrasPlugin(page),
    // Regras eMAG específicas
    checkEmagSkipLinks(page),
    checkEmagAtalhosTeclado(page),
    checkEmagLinksAdjacentes(page),
    checkEmagBreadcrumb(page),
    checkEmagTabelaLayout(page),
    checkEmagPdfAcessivel(page),
    // Novas regras eMAG 2.7, 2.3, 2.4
    checkAutoplayVideoAudio(page),
    checkCarrosselSemControles(page),
    checkRefreshAutomatico(page),
    checkBarraAcessibilidadeGovBr(page),
  ])

  for (const result of results) {
    violations.push(...result)
  }

  // Regras COGA (Acessibilidade Cognitiva) - opcional
  if (includeCoga) {
    console.log('[CustomRules] Iniciando regras COGA...')
    try {
      const cogaViolations = await getCogaViolations(page)
      console.log(`[CustomRules] COGA retornou ${cogaViolations.length} violações`)
      violations.push(...cogaViolations)
    } catch (error) {
      console.error('[CustomRules] Erro ao executar COGA:', error instanceof Error ? error.message : error)
    }
  } else {
    console.log('[CustomRules] COGA não habilitado')
  }

  return violations
}

/**
 * Links com texto genérico como "clique aqui", "saiba mais"
 */
async function checkLinkTextoGenerico(page: Page): Promise<CustomViolation[]> {
  const genericTexts = [
    'clique aqui',
    'clique',
    'aqui',
    'saiba mais',
    'leia mais',
    'veja mais',
    'mais',
    'continue lendo',
    'click here',
    'read more',
    'learn more',
    'more',
    'link',
  ]

  const code = `
    (() => {
      const texts = ${JSON.stringify(genericTexts)};
      const violations = [];
      const links = document.querySelectorAll('a');

      links.forEach((link) => {
        const text = (link.textContent || '').trim().toLowerCase();

        if (texts.includes(text)) {
          violations.push({
            ruleId: 'link-texto-generico',
            impact: 'serious',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['2.4.4'],
            wcagTags: ['wcag2a', 'wcag244'],
            abntSection: 'ABNT 5.7.10',
            help: 'Links devem ter texto descritivo',
            description: 'Links com texto genérico como "clique aqui" não informam ao usuário para onde o link leva.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
            selector: window.getSelector(link),
            fullPath: window.getSelector(link),
            xpath: window.getXPath(link),
            html: link.outerHTML.substring(0, 500),
            parentHtml: link.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Link usa texto genérico: "' + text + '"',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Links que abrem nova aba sem aviso ao usuário
 */
async function checkLinkNovaAbaSemAviso(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const links = document.querySelectorAll('a[target="_blank"]');

      links.forEach((link) => {
        const text = (link.textContent || '').toLowerCase();
        const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
        const title = (link.getAttribute('title') || '').toLowerCase();

        const hasWarning =
          text.includes('nova aba') ||
          text.includes('nova janela') ||
          text.includes('new tab') ||
          text.includes('new window') ||
          text.includes('(external)') ||
          text.includes('(externo)') ||
          ariaLabel.includes('nova aba') ||
          ariaLabel.includes('nova janela') ||
          title.includes('nova aba') ||
          title.includes('nova janela') ||
          link.querySelector('[aria-hidden="true"]') !== null;

        if (!hasWarning) {
          violations.push({
            ruleId: 'link-nova-aba-sem-aviso',
            impact: 'moderate',
            wcagLevel: 'AA',
            wcagVersion: '2.1',
            wcagCriteria: ['3.2.5'],
            wcagTags: ['wcag2aa', 'wcag325'],
            abntSection: 'ABNT 5.12.5',
            help: 'Links que abrem nova aba devem avisar o usuário',
            description: 'Usuários de leitores de tela podem se confundir quando uma nova aba abre sem aviso.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/change-on-request.html',
            selector: window.getSelector(link),
            fullPath: window.getSelector(link),
            xpath: window.getXPath(link),
            html: link.outerHTML.substring(0, 500),
            parentHtml: link.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Link abre nova aba sem indicação visual ou textual',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Imagens com alt text que parece ser nome de arquivo
 */
async function checkImagemAltNomeArquivo(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const images = document.querySelectorAll('img[alt]');

      const filenamePattern = /\\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i;
      const genericPattern = /^(img|image|foto|photo|picture|banner|icon|logo)[-_]?\\d*$/i;
      const underscorePattern = /^[a-z0-9]+(_[a-z0-9]+)+$/i;

      images.forEach((img) => {
        const alt = img.getAttribute('alt') || '';

        if (
          filenamePattern.test(alt) ||
          genericPattern.test(alt) ||
          (underscorePattern.test(alt) && alt.length > 10)
        ) {
          violations.push({
            ruleId: 'imagem-alt-nome-arquivo',
            impact: 'moderate',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.1.1'],
            wcagTags: ['wcag2a', 'wcag111'],
            abntSection: 'ABNT 5.2.6',
            help: 'Alt text deve descrever a imagem, não ser nome de arquivo',
            description: 'O texto alternativo da imagem parece ser um nome de arquivo em vez de uma descrição útil.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
            selector: window.getSelector(img),
            fullPath: window.getSelector(img),
            xpath: window.getXPath(img),
            html: img.outerHTML.substring(0, 500),
            parentHtml: img.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Alt text parece ser nome de arquivo: "' + alt + '"',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Texto com alinhamento justificado
 */
async function checkTextoJustificado(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const elements = document.querySelectorAll('p, div, span, li, td, th');

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        if (style.textAlign === 'justify' && (el.textContent || '').length > 50) {
          violations.push({
            ruleId: 'texto-justificado',
            impact: 'minor',
            wcagLevel: 'AAA',
            wcagVersion: '2.0',
            wcagCriteria: ['1.4.8'],
            wcagTags: ['wcag2aaa', 'wcag148'],
            abntSection: 'ABNT 5.11.7',
            help: 'Evite texto justificado',
            description: 'Texto justificado pode criar espaços irregulares que dificultam a leitura para pessoas com dislexia.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html',
            selector: window.getSelector(el),
            fullPath: window.getSelector(el),
            xpath: window.getXPath(el),
            html: el.outerHTML.substring(0, 500),
            parentHtml: el.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Elemento usa text-align: justify',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Texto longo em maiúsculas via CSS
 */
async function checkTextoMaiusculoCss(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const elements = document.querySelectorAll('*');

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const text = el.textContent || '';

        if (
          style.textTransform === 'uppercase' &&
          text.length > 20 &&
          !['BUTTON', 'INPUT', 'A'].includes(el.tagName)
        ) {
          violations.push({
            ruleId: 'texto-maiusculo-css',
            impact: 'minor',
            wcagLevel: 'AAA',
            wcagVersion: '2.0',
            wcagCriteria: ['1.4.8'],
            wcagTags: ['wcag2aaa', 'wcag148'],
            abntSection: 'ABNT 5.11.7',
            help: 'Evite blocos de texto em maiúsculas',
            description: 'Texto longo em maiúsculas é mais difícil de ler para pessoas com dislexia.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/visual-presentation.html',
            selector: window.getSelector(el),
            fullPath: window.getSelector(el),
            xpath: window.getXPath(el),
            html: el.outerHTML.substring(0, 500),
            parentHtml: el.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Texto com text-transform: uppercase (mais de 20 caracteres)',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Uso excessivo de <br> para layout
 */
async function checkBrExcessivoLayout(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const brs = document.querySelectorAll('br');
      const processed = new Set();

      brs.forEach((br) => {
        let count = 1;
        let current = br;

        while ((current = current.nextElementSibling) && current.tagName === 'BR') {
          count++;
        }

        if (count >= 3 && br.parentElement && !processed.has(br.parentElement)) {
          processed.add(br.parentElement);
          violations.push({
            ruleId: 'br-excessivo-layout',
            impact: 'minor',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.3.1'],
            wcagTags: ['wcag2a', 'wcag131'],
            abntSection: 'ABNT 5.3.1',
            help: 'Não use <br> múltiplos para espaçamento',
            description: 'Use CSS (margin, padding) para espaçamento em vez de múltiplas tags <br>.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
            selector: window.getSelector(br.parentElement),
            fullPath: window.getSelector(br.parentElement),
            xpath: window.getXPath(br.parentElement),
            html: br.parentElement.outerHTML.substring(0, 500),
            parentHtml: null,
            failureSummary: count + ' tags <br> consecutivas encontradas',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Atributo title redundante com texto do elemento
 */
async function checkAtributoTitleRedundante(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const elements = document.querySelectorAll('[title]');

      elements.forEach((el) => {
        const title = (el.getAttribute('title') || '').trim().toLowerCase();
        const text = (el.textContent || '').trim().toLowerCase();
        const alt = (el.getAttribute('alt') || '').trim().toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').trim().toLowerCase();

        if (title && (title === text || title === alt || title === ariaLabel)) {
          violations.push({
            ruleId: 'atributo-title-redundante',
            impact: 'minor',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['4.1.2'],
            wcagTags: ['wcag2a', 'wcag412'],
            abntSection: 'ABNT 5.13.13',
            help: 'Atributo title não deve duplicar conteúdo existente',
            description: 'O atributo title repete informação já disponível, causando redundância para leitores de tela.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
            selector: window.getSelector(el),
            fullPath: window.getSelector(el),
            xpath: window.getXPath(el),
            html: el.outerHTML.substring(0, 500),
            parentHtml: el.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Atributo title "' + title + '" duplica texto/alt/aria-label',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Rótulos muito curtos ou ambíguos
 */
async function checkRotuloCurtoAmbiguo(page: Page): Promise<CustomViolation[]> {
  const ambiguous = ['x', '>', '<', '+', '-', '...', '•', '→', '←', '↑', '↓', 'ok', 'ir']

  const code = `
    (() => {
      const ambiguous = ${JSON.stringify(ambiguous)};
      const violations = [];
      const elements = document.querySelectorAll('button, a, [role="button"], [role="link"]');

      elements.forEach((el) => {
        const text = (el.textContent || '').trim().toLowerCase();
        const ariaLabel = el.getAttribute('aria-label');

        if (!ariaLabel && ambiguous.includes(text)) {
          violations.push({
            ruleId: 'rotulo-curto-ambiguo',
            impact: 'serious',
            wcagLevel: 'A',
            wcagVersion: '2.1',
            wcagCriteria: ['2.4.4', '2.5.3'],
            wcagTags: ['wcag2a', 'wcag244', 'wcag253'],
            abntSection: 'ABNT 5.7.10',
            help: 'Botões e links precisam de rótulos descritivos',
            description: 'Rótulos de um único caractere ou muito curtos não comunicam a função do elemento.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
            selector: window.getSelector(el),
            fullPath: window.getSelector(el),
            xpath: window.getXPath(el),
            html: el.outerHTML.substring(0, 500),
            parentHtml: el.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Rótulo ambíguo: "' + text + '"',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Conteúdo placeholder (lorem ipsum)
 */
async function checkConteudoLoremIpsum(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const body = document.body.textContent || '';

      if (body.toLowerCase().includes('lorem ipsum')) {
        violations.push({
          ruleId: 'conteudo-lorem-ipsum',
          impact: 'moderate',
          wcagLevel: 'A',
          wcagVersion: '2.0',
          wcagCriteria: ['1.1.1'],
          wcagTags: ['wcag2a', 'wcag111'],
          abntSection: 'ABNT 5.2.6',
          help: 'Remova texto placeholder antes de publicar',
          description: 'Conteúdo "Lorem ipsum" indica texto placeholder que não foi substituído por conteúdo real.',
          helpUrl: null,
          selector: 'body',
          fullPath: 'body',
          xpath: '/html/body',
          html: '<body>... lorem ipsum ...</body>',
          parentHtml: null,
          failureSummary: 'Página contém texto "Lorem ipsum"',
        });
      }

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Fonte muito pequena (menor que 12px)
 */
async function checkFonteMuitoPequena(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const elements = document.querySelectorAll('p, span, a, li, td, th, label');
      const processed = new Set();

      elements.forEach((el) => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        const text = (el.textContent || '').trim();

        if (fontSize < 12 && text.length > 10) {
          const selector = window.getSelector(el);
          if (!processed.has(selector)) {
            processed.add(selector);
            violations.push({
              ruleId: 'fonte-muito-pequena',
              impact: 'minor',
              wcagLevel: 'AA',
              wcagVersion: '2.0',
              wcagCriteria: ['1.4.4'],
              wcagTags: ['wcag2aa', 'wcag144'],
              abntSection: 'ABNT 5.11.5',
              help: 'Tamanho de fonte deve ser pelo menos 12px',
              description: 'Texto muito pequeno é difícil de ler para pessoas com baixa visão.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html',
              selector: selector,
              fullPath: selector,
              xpath: window.getXPath(el),
              html: el.outerHTML.substring(0, 500),
              parentHtml: el.parentElement?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Fonte com ' + fontSize + 'px (menor que 12px)',
            });
          }
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Verifica ausência de plugin de Libras (VLibras ou Hand Talk)
 */
async function checkBrasilLibrasPlugin(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      const hasVlibras =
        document.querySelector('script[src*="vlibras"]') !== null ||
        document.querySelector('[vw]') !== null ||
        document.querySelector('.vw-access') !== null;

      const hasHandTalk =
        document.querySelector('script[src*="handtalk"]') !== null ||
        document.querySelector('[data-ht]') !== null ||
        document.querySelector('.ht-button') !== null;

      const lang = (document.documentElement.lang || '').toLowerCase();
      const isBrazilian =
        lang.includes('pt') ||
        window.location.hostname.endsWith('.br') ||
        window.location.hostname.includes('.com.br');

      if (isBrazilian && !hasVlibras && !hasHandTalk) {
        violations.push({
          ruleId: 'brasil-libras-plugin',
          impact: 'moderate',
          wcagLevel: 'AAA',
          wcagVersion: '2.0',
          wcagCriteria: ['1.2.6'],
          wcagTags: ['wcag2aaa', 'wcag126'],
          abntSection: 'ABNT 5.4.7',
          help: 'Sites brasileiros devem considerar plugin de Libras',
          description: 'Para atender à comunidade surda brasileira, considere adicionar VLibras ou Hand Talk.',
          helpUrl: 'https://www.vlibras.gov.br/',
          selector: 'html',
          fullPath: 'html',
          xpath: '/html',
          html: '<html lang="' + lang + '">',
          parentHtml: null,
          failureSummary: 'Nenhum plugin de Libras (VLibras/Hand Talk) detectado',
        });
      }

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

// ============================================
// REGRAS eMAG ESPECÍFICAS
// ============================================

/**
 * eMAG 1.5 - Verifica presença de skip links (pular para conteúdo)
 */
async function checkEmagSkipLinks(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // Procurar skip links típicos
      const skipLinkPatterns = [
        'pular para',
        'ir para',
        'skip to',
        'jump to',
        'go to content',
        'ir ao conteudo',
        'pular navegacao',
        'skip navigation'
      ];

      const links = document.querySelectorAll('a[href^="#"]');
      let hasSkipLink = false;

      links.forEach((link) => {
        const text = (link.textContent || '').toLowerCase().trim();
        if (skipLinkPatterns.some(p => text.includes(p))) {
          hasSkipLink = true;
        }
      });

      // Verificar também por role="navigation" com skip link
      const nav = document.querySelector('[role="navigation"] a[href^="#"], nav a[href^="#"]');
      if (nav) {
        const text = (nav.textContent || '').toLowerCase();
        if (skipLinkPatterns.some(p => text.includes(p))) {
          hasSkipLink = true;
        }
      }

      if (!hasSkipLink) {
        violations.push({
          ruleId: 'emag-skip-links',
          impact: 'serious',
          wcagLevel: 'A',
          wcagVersion: '2.0',
          wcagCriteria: ['2.4.1'],
          wcagTags: ['wcag2a', 'wcag241'],
          abntSection: 'ABNT 5.6.1',
          help: 'Forneça links para pular blocos de conteúdo',
          description: 'O eMAG recomenda links "Pular para conteúdo principal", "Pular para menu" no início da página.',
          helpUrl: 'https://emag.governoeletronico.gov.br/cursodesenvolvedor/desenvolvimento-web/recomendacoes-marcacao.html',
          selector: 'body',
          fullPath: 'body',
          xpath: '/html/body',
          html: '<body>...</body>',
          parentHtml: null,
          failureSummary: 'Nenhum link "pular para conteúdo" encontrado',
        });
      }

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 1.5 - Verifica presença dos atalhos de teclado padrão do governo (Alt+1, Alt+2, Alt+3)
 */
async function checkEmagAtalhosTeclado(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // Verificar se é site governamental brasileiro
      const isGovSite =
        window.location.hostname.endsWith('.gov.br') ||
        window.location.hostname.endsWith('.jus.br') ||
        window.location.hostname.endsWith('.leg.br') ||
        window.location.hostname.endsWith('.mp.br') ||
        window.location.hostname.endsWith('.def.br');

      if (!isGovSite) {
        return violations; // Só aplica a sites governamentais
      }

      // Procurar por accesskey 1, 2, 3 ou menção dos atalhos
      const hasAccesskey1 = document.querySelector('[accesskey="1"]') !== null;
      const hasAccesskey2 = document.querySelector('[accesskey="2"]') !== null;
      const hasAccesskey3 = document.querySelector('[accesskey="3"]') !== null;

      // Verificar também texto mencionando atalhos
      const bodyText = document.body.textContent || '';
      const mentionsShortcuts =
        bodyText.includes('Alt+1') ||
        bodyText.includes('Alt+2') ||
        bodyText.includes('Alt+3') ||
        bodyText.includes('atalhos de teclado') ||
        bodyText.includes('teclas de atalho');

      if (!hasAccesskey1 && !hasAccesskey2 && !hasAccesskey3 && !mentionsShortcuts) {
        violations.push({
          ruleId: 'emag-atalhos-teclado',
          impact: 'moderate',
          wcagLevel: 'A',
          wcagVersion: '2.0',
          wcagCriteria: ['2.4.1'],
          wcagTags: ['wcag2a', 'wcag241'],
          abntSection: 'ABNT 5.6.1',
          help: 'Sites governamentais devem ter atalhos Alt+1, Alt+2, Alt+3',
          description: 'O eMAG recomenda atalhos de teclado padrão: Alt+1 (conteúdo), Alt+2 (menu), Alt+3 (busca).',
          helpUrl: 'https://emag.governoeletronico.gov.br/',
          selector: 'body',
          fullPath: 'body',
          xpath: '/html/body',
          html: '<body>...</body>',
          parentHtml: null,
          failureSummary: 'Atalhos de teclado padrão do governo (Alt+1, Alt+2, Alt+3) não encontrados',
        });
      }

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 1.7 - Verifica se links adjacentes estão separados
 */
async function checkEmagLinksAdjacentes(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const processed = new Set();

      // Procurar containers com múltiplos links adjacentes
      const containers = document.querySelectorAll('nav, ul, ol, div, p');

      containers.forEach((container) => {
        const links = container.querySelectorAll(':scope > a, :scope > li > a');
        if (links.length < 2) return;

        // Verificar se há separação entre links
        for (let i = 0; i < links.length - 1; i++) {
          const link = links[i];
          const nextLink = links[i + 1];

          // Verificar se há texto/elemento entre os links
          let current = link.nextSibling;
          let hasSeparator = false;

          while (current && current !== nextLink && current !== nextLink.parentElement) {
            if (current.nodeType === Node.TEXT_NODE) {
              const text = current.textContent.trim();
              if (text && text !== '') {
                hasSeparator = true;
                break;
              }
            } else if (current.nodeType === Node.ELEMENT_NODE) {
              // Elemento entre os links (li, span, etc)
              hasSeparator = true;
              break;
            }
            current = current.nextSibling;
          }

          // Se links são irmãos diretos sem separador
          if (!hasSeparator && link.nextElementSibling === nextLink) {
            const selector = window.getSelector(link);
            if (!processed.has(selector)) {
              processed.add(selector);
              violations.push({
                ruleId: 'emag-links-adjacentes',
                impact: 'minor',
                wcagLevel: 'A',
                wcagVersion: '2.0',
                wcagCriteria: ['1.3.1'],
                wcagTags: ['wcag2a', 'wcag131'],
                abntSection: 'ABNT 5.3.1',
                help: 'Separe links adjacentes com mais que espaço em branco',
                description: 'Links adjacentes devem ser separados por caractere (|, •) ou estar em lista.',
                helpUrl: 'https://emag.governoeletronico.gov.br/',
                selector: selector,
                fullPath: selector,
                xpath: window.getXPath(link),
                html: link.outerHTML.substring(0, 300) + ' ' + nextLink.outerHTML.substring(0, 200),
                parentHtml: container.outerHTML.substring(0, 300),
                failureSummary: 'Links adjacentes sem separação adequada',
              });
            }
          }
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 3.4 - Verifica presença de breadcrumb (migalha de pão)
 */
async function checkEmagBreadcrumb(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // Verificar se a página tem estrutura que sugere navegação profunda
      const path = window.location.pathname;
      const depth = path.split('/').filter(Boolean).length;

      // Só verificar se a página está a 2+ níveis de profundidade
      if (depth < 2) {
        return violations;
      }

      // Procurar breadcrumb
      const hasBreadcrumb =
        document.querySelector('[aria-label*="breadcrumb" i]') !== null ||
        document.querySelector('[aria-label*="migalha" i]') !== null ||
        document.querySelector('[role="navigation"][aria-label*="trilha" i]') !== null ||
        document.querySelector('nav.breadcrumb, .breadcrumb, .breadcrumbs') !== null ||
        document.querySelector('ol[class*="breadcrumb"], ul[class*="breadcrumb"]') !== null;

      if (!hasBreadcrumb) {
        violations.push({
          ruleId: 'emag-breadcrumb',
          impact: 'minor',
          wcagLevel: 'AAA',
          wcagVersion: '2.0',
          wcagCriteria: ['2.4.8'],
          wcagTags: ['wcag2aaa', 'wcag248'],
          abntSection: 'ABNT 5.6.7',
          help: 'Forneça breadcrumb para orientar o usuário',
          description: 'O eMAG recomenda breadcrumb (migalha de pão) para informar a localização do usuário no site.',
          helpUrl: 'https://emag.governoeletronico.gov.br/',
          selector: 'body',
          fullPath: 'body',
          xpath: '/html/body',
          html: '<body>... (página sem breadcrumb)</body>',
          parentHtml: null,
          failureSummary: 'Página com ' + depth + ' níveis de profundidade sem breadcrumb',
        });
      }

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 1.6 - Verifica uso de tabelas para layout
 */
async function checkEmagTabelaLayout(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const tables = document.querySelectorAll('table');

      tables.forEach((table) => {
        // Verificar se é tabela de dados (tem th, caption, ou role="grid")
        const hasHeaders = table.querySelector('th') !== null;
        const hasCaption = table.querySelector('caption') !== null;
        const hasRole = table.getAttribute('role') === 'grid' || table.getAttribute('role') === 'table';
        const hasSummary = table.hasAttribute('summary');

        // Se não tem indicadores de tabela de dados, provavelmente é layout
        if (!hasHeaders && !hasCaption && !hasRole && !hasSummary) {
          // Verificar se tem role="presentation" ou role="none" (ok para layout)
          const presentationRole = table.getAttribute('role');
          if (presentationRole === 'presentation' || presentationRole === 'none') {
            return; // OK - tabela de layout marcada corretamente
          }

          // Verificar conteúdo - tabelas de layout geralmente têm poucos dados
          const cells = table.querySelectorAll('td');
          const hasMultipleRows = table.querySelectorAll('tr').length > 1;
          const hasMultipleCols = cells.length > 0 && table.querySelector('tr')?.querySelectorAll('td').length > 1;

          if (hasMultipleRows && hasMultipleCols && cells.length > 4) {
            violations.push({
              ruleId: 'emag-tabela-layout',
              impact: 'moderate',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['1.3.1'],
              wcagTags: ['wcag2a', 'wcag131'],
              abntSection: 'ABNT 5.3.1',
              help: 'Não use tabelas para layout',
              description: 'Tabelas devem ser usadas apenas para dados tabulares. Use CSS para layout. Se for layout, adicione role="presentation".',
              helpUrl: 'https://emag.governoeletronico.gov.br/',
              selector: window.getSelector(table),
              fullPath: window.getSelector(table),
              xpath: window.getXPath(table),
              html: table.outerHTML.substring(0, 500),
              parentHtml: table.parentElement?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Tabela sem cabeçalhos (th) pode estar sendo usada para layout',
            });
          }
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 3.8 - Verifica documentos PDF sem alternativa acessível
 */
async function checkEmagPdfAcessivel(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const pdfLinks = document.querySelectorAll('a[href$=".pdf"], a[href*=".pdf?"], a[href*=".pdf#"]');

      pdfLinks.forEach((link) => {
        const href = link.getAttribute('href') || '';
        const text = (link.textContent || '').toLowerCase();
        const ariaLabel = (link.getAttribute('aria-label') || '').toLowerCase();
        const title = (link.getAttribute('title') || '').toLowerCase();
        const parentText = (link.parentElement?.textContent || '').toLowerCase();

        // Verificar se há indicação de tamanho/formato
        const hasFormatInfo =
          text.includes('pdf') ||
          text.includes('mb)') ||
          text.includes('kb)') ||
          ariaLabel.includes('pdf') ||
          title.includes('pdf') ||
          parentText.includes('(pdf');

        // Verificar se há link alternativo HTML próximo
        const parent = link.parentElement;
        const hasHtmlAlternative =
          parent?.querySelector('a[href$=".html"], a[href$=".htm"]') !== null ||
          parentText.includes('versao html') ||
          parentText.includes('versão html') ||
          parentText.includes('html version');

        // Verificar se há menção de acessibilidade
        const isAccessiblePdf =
          text.includes('acessivel') ||
          text.includes('acessível') ||
          ariaLabel.includes('acessivel') ||
          title.includes('acessivel');

        if (!hasFormatInfo && !hasHtmlAlternative && !isAccessiblePdf) {
          violations.push({
            ruleId: 'emag-pdf-acessivel',
            impact: 'moderate',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.1.1', '1.3.1'],
            wcagTags: ['wcag2a', 'wcag111', 'wcag131'],
            abntSection: 'ABNT 5.2.6',
            help: 'Ofereça alternativas para documentos PDF',
            description: 'Links para PDF devem indicar o formato e tamanho, ou oferecer versão HTML acessível.',
            helpUrl: 'https://emag.governoeletronico.gov.br/',
            selector: window.getSelector(link),
            fullPath: window.getSelector(link),
            xpath: window.getXPath(link),
            html: link.outerHTML.substring(0, 500),
            parentHtml: parent?.outerHTML.substring(0, 300) || null,
            failureSummary: 'Link para PDF sem indicação de formato ou alternativa HTML: ' + href.substring(0, 100),
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 2.7, WCAG 1.4.2 - Detecta mídia com autoplay sem controles
 */
async function checkAutoplayVideoAudio(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // 1. Verificar <video autoplay> sem controls
      const videos = document.querySelectorAll('video[autoplay]');
      videos.forEach((video) => {
        const hasControls = video.hasAttribute('controls');
        const hasMuted = video.hasAttribute('muted');

        // Se tem autoplay sem controls E não está muted, é violação
        // (videos muted sem controls são aceitáveis para UX, mas ainda assim alertamos)
        if (!hasControls) {
          violations.push({
            ruleId: 'autoplay-video-audio',
            impact: 'serious',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.4.2'],
            wcagTags: ['wcag2a', 'wcag142'],
            abntSection: 'ABNT 5.8.5',
            help: 'Mídia com autoplay deve ter controles para pausar',
            description: 'Vídeo com autoplay deve ter atributo controls para permitir que o usuário pause ou pare a reprodução.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html',
            selector: window.getSelector(video),
            fullPath: window.getSelector(video),
            xpath: window.getXPath(video),
            html: video.outerHTML.substring(0, 500),
            parentHtml: video.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Vídeo com autoplay sem atributo controls' + (hasMuted ? ' (muted)' : ' (com áudio)'),
          });
        }
      });

      // 2. Verificar <audio autoplay> sem controls
      const audios = document.querySelectorAll('audio[autoplay]');
      audios.forEach((audio) => {
        const hasControls = audio.hasAttribute('controls');

        if (!hasControls) {
          violations.push({
            ruleId: 'autoplay-video-audio',
            impact: 'serious',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.4.2'],
            wcagTags: ['wcag2a', 'wcag142'],
            abntSection: 'ABNT 5.8.5',
            help: 'Mídia com autoplay deve ter controles para pausar',
            description: 'Áudio com autoplay deve ter atributo controls para permitir que o usuário pause ou pare a reprodução.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html',
            selector: window.getSelector(audio),
            fullPath: window.getSelector(audio),
            xpath: window.getXPath(audio),
            html: audio.outerHTML.substring(0, 500),
            parentHtml: audio.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Áudio com autoplay sem atributo controls',
          });
        }
      });

      // 3. Verificar iframes de YouTube/Vimeo com autoplay
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        const src = iframe.getAttribute('src') || '';
        const srcLower = src.toLowerCase();

        const isYouTubeAutoplay =
          (srcLower.includes('youtube.com') || srcLower.includes('youtu.be')) &&
          (srcLower.includes('autoplay=1') || srcLower.includes('autoplay=true'));

        const isVimeoAutoplay =
          srcLower.includes('vimeo.com') &&
          (srcLower.includes('autoplay=1') || srcLower.includes('autoplay=true'));

        if (isYouTubeAutoplay || isVimeoAutoplay) {
          const platform = isYouTubeAutoplay ? 'YouTube' : 'Vimeo';
          violations.push({
            ruleId: 'autoplay-video-audio',
            impact: 'serious',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.4.2'],
            wcagTags: ['wcag2a', 'wcag142'],
            abntSection: 'ABNT 5.8.5',
            help: 'Mídia com autoplay deve ter controles para pausar',
            description: 'Embed de vídeo com autoplay pode iniciar reprodução automaticamente sem controle do usuário.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html',
            selector: window.getSelector(iframe),
            fullPath: window.getSelector(iframe),
            xpath: window.getXPath(iframe),
            html: iframe.outerHTML.substring(0, 500),
            parentHtml: iframe.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Iframe de ' + platform + ' com autoplay ativado',
          });
        }
      });

      // 4. Verificar players customizados conhecidos
      const playerSelectors = [
        '.video-js', '.vjs-tech',           // Video.js
        '.plyr', '[data-plyr]',             // Plyr
        '.jwplayer', '[id^="jwplayer"]',    // JW Player
        '.mejs__container', '.mejs-player', // MediaElement.js
        '.flowplayer',                       // Flowplayer
      ];

      playerSelectors.forEach((selector) => {
        const players = document.querySelectorAll(selector);
        players.forEach((player) => {
          // Verificar se está em autoplay
          const dataAutoplay = player.getAttribute('data-autoplay') ||
                               player.getAttribute('data-setup')?.includes('"autoplay"') ||
                               player.classList.contains('vjs-playing');

          // Verificar se tem botão de pause visível
          const pauseBtn = player.querySelector(
            '[class*="pause"], [aria-label*="pause"], [title*="pause"], ' +
            '[class*="Pause"], [aria-label*="Pause"], [title*="Pause"], ' +
            'button[class*="play"], .vjs-play-control'
          );

          const pauseBtnVisible = pauseBtn &&
            window.getComputedStyle(pauseBtn).display !== 'none' &&
            window.getComputedStyle(pauseBtn).visibility !== 'hidden';

          if (dataAutoplay && !pauseBtnVisible) {
            violations.push({
              ruleId: 'autoplay-video-audio',
              impact: 'serious',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['1.4.2'],
              wcagTags: ['wcag2a', 'wcag142'],
              abntSection: 'ABNT 5.8.5',
              help: 'Mídia com autoplay deve ter controles para pausar',
              description: 'Player de vídeo customizado com autoplay deve ter botão de pause visível.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/audio-control.html',
              selector: window.getSelector(player),
              fullPath: window.getSelector(player),
              xpath: window.getXPath(player),
              html: player.outerHTML.substring(0, 500),
              parentHtml: player.parentElement?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Player customizado com autoplay sem botão de pause visível',
            });
          }
        });
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 2.7 - Detecta carrosséis/slideshows sem controles adequados
 */
async function checkCarrosselSemControles(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const processed = new Set();

      // Seletores de bibliotecas de carrossel populares
      const carouselSelectors = [
        '.swiper', '.swiper-container', '.swiper-wrapper',
        '.slick-slider', '.slick-track', '.slick-list',
        '.owl-carousel', '.owl-stage', '.owl-stage-outer',
        '.flickity-slider', '.flickity-viewport',
        '.glide', '.glide__slides', '.glide__track',
        '.splide', '.splide__list', '.splide__track',
        '.carousel', '.carousel-inner',
        '[data-carousel]', '[data-slider]', '[data-slick]',
        '[data-flickity]', '[data-glide]', '[data-splide]',
        '.embla', '.embla__container',
        '.keen-slider',
        '[class*="carousel"]', '[class*="slider"]', '[class*="slideshow"]',
      ];

      carouselSelectors.forEach((selector) => {
        const carousels = document.querySelectorAll(selector);

        carousels.forEach((carousel) => {
          // Evitar processar o mesmo elemento múltiplas vezes
          const carouselId = window.getSelector(carousel);
          if (processed.has(carouselId)) return;

          // Verificar se é realmente um carrossel (tem múltiplos slides)
          const slides = carousel.querySelectorAll(
            '.swiper-slide, .slick-slide, .owl-item, .flickity-cell, ' +
            '.glide__slide, .splide__slide, .carousel-item, ' +
            '[class*="slide"], [data-slide]'
          );

          // Se não tem slides detectáveis, tentar inferir por filhos diretos
          const children = carousel.children;
          const hasMultipleItems = slides.length > 1 || children.length > 1;

          if (!hasMultipleItems) return;

          processed.add(carouselId);

          // Verificar se tem autoplay
          const hasAutoplay =
            carousel.hasAttribute('data-autoplay') ||
            carousel.hasAttribute('data-auto-play') ||
            carousel.getAttribute('data-options')?.includes('autoplay') ||
            carousel.getAttribute('data-slick')?.includes('autoPlay') ||
            carousel.classList.contains('swiper-autoplay') ||
            carousel.querySelector('[data-swiper-autoplay]') !== null;

          // Procurar controles no carrossel ou em elementos próximos
          const container = carousel.closest('[class*="carousel"], [class*="slider"], section, div') || carousel.parentElement;

          const hasPrevNext =
            container?.querySelector(
              '[class*="prev"], [class*="next"], [class*="arrow"], ' +
              '[aria-label*="anterior"], [aria-label*="próximo"], ' +
              '[aria-label*="previous"], [aria-label*="next"], ' +
              '.swiper-button-prev, .swiper-button-next, ' +
              '.slick-prev, .slick-next, ' +
              '.owl-prev, .owl-next, ' +
              '.flickity-prev-next-button, ' +
              '.glide__arrow, .splide__arrow'
            ) !== null;

          const hasDots =
            container?.querySelector(
              '[class*="dot"], [class*="indicator"], [class*="pagination"], ' +
              '.swiper-pagination, .slick-dots, .owl-dots, ' +
              '.flickity-page-dots, .glide__bullets, .splide__pagination, ' +
              '[role="tablist"]'
            ) !== null;

          const hasPauseButton =
            container?.querySelector(
              '[class*="pause"], [class*="play"], [aria-label*="pause"], ' +
              '[aria-label*="pausar"], [aria-label*="parar"], ' +
              '[title*="pause"], [title*="pausar"]'
            ) !== null;

          // Se tem autoplay sem pause, é violação grave
          if (hasAutoplay && !hasPauseButton) {
            violations.push({
              ruleId: 'carrossel-sem-controles',
              impact: 'serious',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['2.2.2'],
              wcagTags: ['wcag2a', 'wcag222'],
              abntSection: 'ABNT 5.5.2',
              help: 'Carrossel com autoplay deve ter botão de pause',
              description: 'Carrosséis com rotação automática devem ter controle para pausar/parar a animação.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
              selector: carouselId,
              fullPath: carouselId,
              xpath: window.getXPath(carousel),
              html: carousel.outerHTML.substring(0, 500),
              parentHtml: container?.outerHTML.substring(0, 300) || null,
              failureSummary: 'Carrossel com autoplay sem botão de pause',
            });
          }
          // Se não tem nenhum controle (nem prev/next, nem dots), é violação moderada
          else if (!hasPrevNext && !hasDots) {
            violations.push({
              ruleId: 'carrossel-sem-controles',
              impact: 'moderate',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['2.2.2'],
              wcagTags: ['wcag2a', 'wcag222'],
              abntSection: 'ABNT 5.5.2',
              help: 'Carrossel deve ter controles de navegação',
              description: 'Carrosséis devem ter botões anterior/próximo ou indicadores de slides para navegação.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
              selector: carouselId,
              fullPath: carouselId,
              xpath: window.getXPath(carousel),
              html: carousel.outerHTML.substring(0, 500),
              parentHtml: container?.outerHTML.substring(0, 300) || null,
              failureSummary: 'Carrossel sem controles de navegação (prev/next ou indicadores)',
            });
          }
        });
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 2.3, 2.4 - Detecta refresh/redirecionamento automático
 */
async function checkRefreshAutomatico(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // Procurar meta refresh
      const metaRefresh = document.querySelector('meta[http-equiv="refresh" i]');

      if (metaRefresh) {
        const content = metaRefresh.getAttribute('content') || '';

        // Parse content: pode ser "5" (refresh após 5s) ou "0; url=..." (redirect)
        const match = content.match(/^(\\d+)\\s*;?\\s*(url=.*)?$/i);

        if (match) {
          const seconds = parseInt(match[1], 10);
          const hasUrl = !!match[2];

          if (seconds === 0 && hasUrl) {
            // Redirect imediato - violação eMAG 2.4
            violations.push({
              ruleId: 'refresh-automatico',
              impact: 'serious',
              wcagLevel: 'AA',
              wcagVersion: '2.1',
              wcagCriteria: ['3.2.5'],
              wcagTags: ['wcag2aa', 'wcag325'],
              abntSection: 'ABNT 5.12.5',
              help: 'Não use redirecionamento automático via meta refresh',
              description: 'Redirecionamentos devem ser feitos no servidor (HTTP 301/302), não via meta refresh.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/change-on-request.html',
              selector: 'meta[http-equiv="refresh"]',
              fullPath: 'head > meta[http-equiv="refresh"]',
              xpath: '/html/head/meta[@http-equiv="refresh"]',
              html: metaRefresh.outerHTML,
              parentHtml: null,
              failureSummary: 'Redirecionamento automático via meta refresh: ' + content,
            });
          } else if (seconds > 0) {
            // Refresh periódico - violação eMAG 2.3
            violations.push({
              ruleId: 'refresh-automatico',
              impact: 'serious',
              wcagLevel: 'AA',
              wcagVersion: '2.0',
              wcagCriteria: ['2.2.1', '3.2.5'],
              wcagTags: ['wcag2aa', 'wcag221', 'wcag325'],
              abntSection: 'ABNT 5.5.1',
              help: 'Não use atualização automática de página',
              description: 'Páginas não devem atualizar automaticamente. Dê controle ao usuário para atualizar quando desejar.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html',
              selector: 'meta[http-equiv="refresh"]',
              fullPath: 'head > meta[http-equiv="refresh"]',
              xpath: '/html/head/meta[@http-equiv="refresh"]',
              html: metaRefresh.outerHTML,
              parentHtml: null,
              failureSummary: 'Página atualiza automaticamente após ' + seconds + ' segundos' + (hasUrl ? ' com redirecionamento' : ''),
            });
          }
        }
      }

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 1.5 (específico BR) - Detecta sites governamentais sem barra de acessibilidade
 */
async function checkBarraAcessibilidadeGovBr(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const hostname = window.location.hostname.toLowerCase();

      // Verificar se é site governamental brasileiro
      const isGovSite =
        hostname.endsWith('.gov.br') ||
        hostname.endsWith('.jus.br') ||
        hostname.endsWith('.leg.br') ||
        hostname.endsWith('.mp.br') ||
        hostname.endsWith('.def.br') ||
        hostname.endsWith('.edu.br') ||
        hostname.endsWith('.mil.br');

      if (!isGovSite) {
        return violations; // Só aplica a sites governamentais
      }

      // Procurar elementos de barra de acessibilidade
      const bodyText = document.body.textContent?.toLowerCase() || '';
      const bodyHtml = document.body.innerHTML.toLowerCase();

      // Verificar alto contraste
      const hasAltoContraste =
        document.querySelector('[class*="contrast" i], [id*="contrast" i]') !== null ||
        document.querySelector('[aria-label*="contraste" i], [title*="contraste" i]') !== null ||
        document.querySelector('a[href*="contrast"], button[onclick*="contrast"]') !== null ||
        bodyText.includes('alto contraste') ||
        bodyText.includes('high contrast');

      // Verificar controles de fonte
      const hasFontControls =
        document.querySelector('[class*="font-size" i], [class*="fontSize" i]') !== null ||
        document.querySelector('[aria-label*="aumentar" i], [aria-label*="diminuir" i]') !== null ||
        document.querySelector('[title*="fonte" i]') !== null ||
        bodyHtml.includes('>a+<') || bodyHtml.includes('>a-<') ||
        bodyText.includes('aumentar fonte') ||
        bodyText.includes('diminuir fonte') ||
        bodyText.includes('tamanho da fonte');

      // Verificar barra de acessibilidade genérica
      const hasAccessibilityBar =
        document.querySelector('[class*="accessibility" i], [class*="acessibilidade" i]') !== null ||
        document.querySelector('[id*="accessibility" i], [id*="acessibilidade" i]') !== null ||
        document.querySelector('[role="toolbar"][aria-label*="acessibilidade" i]') !== null ||
        document.querySelector('nav[aria-label*="acessibilidade" i]') !== null;

      // Verificar barra do gov.br (padrão DS Gov)
      const hasDsGov =
        document.querySelector('.br-header, .br-menu, [class*="dsgov"]') !== null ||
        document.querySelector('[data-toggle="contrast"]') !== null;

      // Se não tem nenhum controle de acessibilidade
      if (!hasAltoContraste && !hasFontControls && !hasAccessibilityBar && !hasDsGov) {
        violations.push({
          ruleId: 'barra-acessibilidade-gov-br',
          impact: 'moderate',
          wcagLevel: 'AAA',
          wcagVersion: '2.0',
          wcagCriteria: ['1.4.3', '1.4.4'],
          wcagTags: ['wcag2aaa', 'wcag143', 'wcag144'],
          abntSection: 'ABNT 5.11.5',
          help: 'Sites governamentais devem ter barra de acessibilidade',
          description: 'O eMAG recomenda que sites governamentais brasileiros ofereçam controles de alto contraste e ajuste de tamanho de fonte.',
          helpUrl: 'https://emag.governoeletronico.gov.br/',
          selector: 'body',
          fullPath: 'body',
          xpath: '/html/body',
          html: '<body>... (sem barra de acessibilidade)</body>',
          parentHtml: null,
          failureSummary: 'Site governamental sem barra de acessibilidade (alto contraste/ajuste de fonte)',
        });
      }

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}
