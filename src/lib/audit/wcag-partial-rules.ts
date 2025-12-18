import type { Page } from 'playwright'
import type { ImpactLevel } from '@/types'

/**
 * WCAG Partial Rules - Regras de detecção parcial para critérios WCAG
 *
 * Estas regras detectam PARCIALMENTE critérios que normalmente requerem verificação manual.
 * O objetivo é identificar os casos mais comuns programaticamente.
 *
 * IMPORTANTE:
 * - Preferimos falsos negativos a falsos positivos
 * - Todas as violações têm needsReview: true
 * - Mensagens usam chaves i18n (messageKey) para internacionalização
 */

export interface WcagPartialViolation {
  ruleId: string
  element: string                          // Seletor CSS
  html: string                             // HTML do elemento (truncado)
  xpath: string                            // XPath para localização precisa
  wcagSC: string                           // Ex: '1.3.5'
  wcagLevel: 'A' | 'AA' | 'AAA'
  impact: ImpactLevel
  needsReview: true                        // Sempre true (detecção parcial)
  // i18n - usar chaves em vez de texto hardcoded
  messageKey: string                       // Chave i18n: "WcagPartial.{ruleId}.message"
  messageParams?: Record<string, string>   // Parâmetros para interpolação
}

export interface WcagPartialRule {
  id: string
  wcagSC: string
  wcagLevel: 'A' | 'AA' | 'AAA'
  impact: ImpactLevel
  description: string  // Descrição interna (não exibida ao usuário)
  check: (page: Page) => Promise<WcagPartialViolation[]>
}

// Mapeamento de campos para autocomplete (MULTILÍNGUE - EN + PT-BR + ES)
const AUTOCOMPLETE_MAP: Record<string, string[]> = {
  // Nome (EN + PT + ES)
  name: ['name', 'nome', 'nombre', 'full-name', 'fullname', 'your-name', 'nome-completo'],
  'given-name': ['first-name', 'firstname', 'fname', 'primeiro-nome', 'given-name', 'primer-nombre'],
  'family-name': ['last-name', 'lastname', 'lname', 'sobrenome', 'surname', 'apellido', 'family-name'],

  // Contato (EN + PT + ES)
  email: ['email', 'e-mail', 'mail', 'correo', 'correo-electronico'],
  tel: ['phone', 'telefone', 'tel', 'celular', 'mobile', 'whatsapp', 'telephone',
        'cell', 'phone-number', 'telefono', 'movil'],

  // Endereço (EN + PT + ES)
  'street-address': ['address', 'endereco', 'street', 'rua', 'logradouro', 'direccion',
                     'calle', 'street-address', 'address-line1'],
  'postal-code': ['zip', 'cep', 'postal', 'zipcode', 'postal-code', 'postcode', 'codigo-postal'],
  'address-level2': ['city', 'cidade', 'locality', 'ciudad', 'town'],
  'address-level1': ['state', 'estado', 'region', 'uf', 'province', 'provincia'],
  country: ['country', 'pais', 'nation', 'country-name'],

  // Pagamento (universal - termos técnicos)
  'cc-number': ['card-number', 'cc-number', 'cardnumber', 'numero-cartao', 'credit-card',
                'card', 'numero-tarjeta'],
  'cc-exp': ['expiry', 'exp-date', 'validade', 'cc-exp', 'expiration', 'exp-month', 'exp-year',
             'vencimiento', 'fecha-expiracion'],
  'cc-csc': ['cvv', 'cvc', 'csc', 'security-code', 'codigo-seguranca', 'codigo-seguridad'],
  'cc-name': ['cc-name', 'cardholder', 'card-holder', 'nome-cartao', 'titular'],

  // Documentos BR (diferencial brasileiro)
  // Usamos valores customizados que serão tratados como "on" (habilitar autocomplete)
  'on': ['cpf', 'tax-id', 'taxpayer-id', 'cnpj', 'company-tax-id', 'business-id', 'rg', 'identidade', 'identity-card'],

  // Outros (EN + PT + ES)
  bday: ['birthday', 'birth-date', 'nascimento', 'data-nascimento', 'dob', 'date-of-birth',
         'birthdate', 'fecha-nacimiento', 'cumpleanos'],
  username: ['username', 'user', 'usuario', 'login', 'user-name', 'account', 'cuenta'],
  'new-password': ['new-password', 'nova-senha', 'create-password', 'nueva-contrasena'],
  'current-password': ['current-password', 'senha-atual', 'password', 'senha', 'old-password',
                       'contrasena', 'clave'],
  organization: ['organization', 'company', 'empresa', 'organizacao', 'org', 'compania'],
}

/**
 * 1.1 input-sem-autocomplete (WCAG 1.3.5 - Nível AA)
 * Detecta inputs de dados pessoais sem atributo autocomplete
 */
async function checkInputSemAutocomplete(page: Page): Promise<WcagPartialViolation[]> {
  const autocompleteMapJson = JSON.stringify(AUTOCOMPLETE_MAP)

  const code = `
    (() => {
      const autocompleteMap = ${autocompleteMapJson};
      const violations = [];

      // Tipos de input a ignorar
      const ignoredTypes = ['hidden', 'submit', 'button', 'reset', 'image', 'file', 'checkbox', 'radio'];

      // Buscar todos os inputs
      const inputs = document.querySelectorAll('input, select');

      inputs.forEach((input) => {
        // Ignorar tipos não aplicáveis
        const type = (input.getAttribute('type') || 'text').toLowerCase();
        if (ignoredTypes.includes(type)) return;

        // Ignorar se já tem autocomplete
        const autocomplete = input.getAttribute('autocomplete');
        if (autocomplete && autocomplete !== '') return;

        // Ignorar inputs dentro de [role="search"]
        if (input.closest('[role="search"]')) return;

        // Ignorar inputs com autocomplete="off" explícito (decisão consciente)
        // Na verdade, autocomplete="off" já foi filtrado acima

        // Coletar atributos para análise
        const name = (input.getAttribute('name') || '').toLowerCase();
        const id = (input.getAttribute('id') || '').toLowerCase();
        const placeholder = (input.getAttribute('placeholder') || '').toLowerCase();
        const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
        const labelText = input.labels?.[0]?.textContent?.toLowerCase() || '';

        // Verificar se algum atributo contém palavras-chave
        const allText = name + ' ' + id + ' ' + placeholder + ' ' + ariaLabel + ' ' + labelText;

        let matchedAutocomplete = null;
        let matchedFieldType = null;

        for (const [autocompleteValue, keywords] of Object.entries(autocompleteMap)) {
          for (const keyword of keywords) {
            // Verificar match exato ou como parte de palavra separada
            const regex = new RegExp('(^|[^a-z])' + keyword.replace(/-/g, '[-_]?') + '($|[^a-z])', 'i');
            if (regex.test(allText)) {
              matchedAutocomplete = autocompleteValue;
              matchedFieldType = keyword;
              break;
            }
          }
          if (matchedAutocomplete) break;
        }

        if (matchedAutocomplete) {
          violations.push({
            ruleId: 'input-sem-autocomplete',
            element: window.getSelector(input),
            html: input.outerHTML.substring(0, 500),
            xpath: window.getXPath(input),
            wcagSC: '1.3.5',
            wcagLevel: 'AA',
            impact: 'serious',
            needsReview: true,
            messageKey: 'WcagPartial.inputSemAutocomplete.message',
            messageParams: {
              fieldType: matchedFieldType,
              suggestedValue: matchedAutocomplete
            }
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<WcagPartialViolation[]>
}

/**
 * 1.2 link-sem-underline-em-texto (WCAG 1.4.1 - Nível A)
 * Detecta links dentro de blocos de texto que não têm underline
 */
async function checkLinkSemUnderlineEmTexto(page: Page): Promise<WcagPartialViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const processed = new Set();

      // Buscar links dentro de blocos de texto
      const textContainers = document.querySelectorAll('p, li, td, dd, figcaption, blockquote');

      textContainers.forEach((container) => {
        const links = container.querySelectorAll('a[href]');

        links.forEach((link) => {
          // Ignorar se já processado
          const selector = window.getSelector(link);
          if (processed.has(selector)) return;

          // Ignorar links dentro de nav, header, footer
          if (link.closest('nav, header, footer, [role="navigation"], [role="banner"], [role="contentinfo"]')) {
            return;
          }

          // Ignorar se link é o único conteúdo do container
          const containerText = container.textContent?.trim() || '';
          const linkText = link.textContent?.trim() || '';
          if (containerText === linkText) return;

          // Ignorar links que são botões
          if (link.getAttribute('role') === 'button' ||
              link.classList.contains('btn') ||
              link.classList.contains('button') ||
              link.classList.toString().includes('btn-')) {
            return;
          }

          // Ignorar links com ícones (imagens, SVG)
          if (link.querySelector('svg, img, i[class*="icon"], span[class*="icon"]')) {
            return;
          }

          // Verificar estilos
          const style = window.getComputedStyle(link);
          const textDecoration = style.textDecoration || style.textDecorationLine || '';
          const hasUnderline = textDecoration.includes('underline');

          // Verificar border-bottom como alternativa
          const borderBottom = style.borderBottomWidth;
          const hasBorderBottom = borderBottom && parseFloat(borderBottom) > 0;

          // Se não tem underline nem border-bottom, reportar
          if (!hasUnderline && !hasBorderBottom) {
            processed.add(selector);
            violations.push({
              ruleId: 'link-sem-underline-em-texto',
              element: selector,
              html: link.outerHTML.substring(0, 500),
              xpath: window.getXPath(link),
              wcagSC: '1.4.1',
              wcagLevel: 'A',
              impact: 'serious',
              needsReview: true,
              messageKey: 'WcagPartial.linkSemUnderline.message',
              messageParams: {}
            });
          }
        });
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<WcagPartialViolation[]>
}

/**
 * 1.3 video-sem-legendas (WCAG 1.2.1, 1.2.2 - Nível A)
 * Detecta elementos <video> sem track de legendas e iframes de vídeo
 */
async function checkVideoSemLegendas(page: Page): Promise<WcagPartialViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // 1. Verificar elementos <video>
      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        // Verificar se tem track de legendas
        const hasCaptions = video.querySelector('track[kind="captions"]') !== null;
        const hasSubtitles = video.querySelector('track[kind="subtitles"]') !== null;

        if (!hasCaptions && !hasSubtitles) {
          violations.push({
            ruleId: 'video-sem-legendas',
            element: window.getSelector(video),
            html: video.outerHTML.substring(0, 500),
            xpath: window.getXPath(video),
            wcagSC: '1.2.2',
            wcagLevel: 'A',
            impact: 'critical',
            needsReview: true,
            messageKey: 'WcagPartial.videoSemLegendas.messageNativo',
            messageParams: {}
          });
        }
      });

      // 2. Verificar iframes de plataformas de vídeo
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe) => {
        const src = iframe.getAttribute('src') || '';
        const srcLower = src.toLowerCase();

        let platform = null;
        if (srcLower.includes('youtube.com') || srcLower.includes('youtu.be')) {
          platform = 'YouTube';
        } else if (srcLower.includes('vimeo.com')) {
          platform = 'Vimeo';
        } else if (srcLower.includes('dailymotion.com')) {
          platform = 'Dailymotion';
        } else if (srcLower.includes('wistia.com') || srcLower.includes('wistia.net')) {
          platform = 'Wistia';
        }

        if (platform) {
          violations.push({
            ruleId: 'video-sem-legendas',
            element: window.getSelector(iframe),
            html: iframe.outerHTML.substring(0, 500),
            xpath: window.getXPath(iframe),
            wcagSC: '1.2.2',
            wcagLevel: 'A',
            impact: 'serious',
            needsReview: true,
            messageKey: 'WcagPartial.videoSemLegendas.messageIframe',
            messageParams: { platform: platform }
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<WcagPartialViolation[]>
}

/**
 * 1.4 video-sem-audiodescricao (WCAG 1.2.3, 1.2.5 - Nível A/AA)
 * Detecta elementos <video> sem track de audiodescrição
 */
async function checkVideoSemAudiodescricao(page: Page): Promise<WcagPartialViolation[]> {
  const code = `
    (() => {
      const violations = [];

      const videos = document.querySelectorAll('video');
      videos.forEach((video) => {
        // Verificar se tem track de audiodescrição
        const hasDescriptions = video.querySelector('track[kind="descriptions"]') !== null;

        if (!hasDescriptions) {
          violations.push({
            ruleId: 'video-sem-audiodescricao',
            element: window.getSelector(video),
            html: video.outerHTML.substring(0, 500),
            xpath: window.getXPath(video),
            wcagSC: '1.2.5',
            wcagLevel: 'AA',
            impact: 'serious',
            needsReview: true,
            messageKey: 'WcagPartial.videoSemAudiodescricao.message',
            messageParams: {}
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<WcagPartialViolation[]>
}

/**
 * 1.5 select-onchange-navega (WCAG 3.2.2 - Nível A)
 * Detecta <select> com evento onchange que causa navegação automática
 */
async function checkSelectOnchangeNavega(page: Page): Promise<WcagPartialViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // Padrões de navegação em JavaScript
      const navigationPatterns = [
        'location.href',
        'location.assign',
        'location.replace',
        'window.location',
        'document.location',
        'navigate(',
        'router.push',
        'router.replace',
        'this.form.submit',
        '.submit()',
        'history.push',
        'history.replace',
        'href=',
      ];

      const selects = document.querySelectorAll('select');

      selects.forEach((select) => {
        const onchange = select.getAttribute('onchange') || '';

        // Verificar se onchange contém padrões de navegação
        const lowerOnchange = onchange.toLowerCase();
        const hasNavigation = navigationPatterns.some(pattern =>
          lowerOnchange.includes(pattern.toLowerCase())
        );

        if (hasNavigation) {
          violations.push({
            ruleId: 'select-onchange-navega',
            element: window.getSelector(select),
            html: select.outerHTML.substring(0, 500),
            xpath: window.getXPath(select),
            wcagSC: '3.2.2',
            wcagLevel: 'A',
            impact: 'serious',
            needsReview: true,
            messageKey: 'WcagPartial.selectOnchangeNavega.message',
            messageParams: {}
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<WcagPartialViolation[]>
}

// Lista de todas as regras da Fase 1
export const wcagPartialRules: WcagPartialRule[] = [
  {
    id: 'input-sem-autocomplete',
    wcagSC: '1.3.5',
    wcagLevel: 'AA',
    impact: 'serious',
    description: 'Detecta inputs de dados pessoais sem atributo autocomplete',
    check: checkInputSemAutocomplete,
  },
  {
    id: 'link-sem-underline-em-texto',
    wcagSC: '1.4.1',
    wcagLevel: 'A',
    impact: 'serious',
    description: 'Detecta links em texto que dependem apenas de cor para diferenciação',
    check: checkLinkSemUnderlineEmTexto,
  },
  {
    id: 'video-sem-legendas',
    wcagSC: '1.2.2',
    wcagLevel: 'A',
    impact: 'critical',
    description: 'Detecta vídeos sem track de legendas',
    check: checkVideoSemLegendas,
  },
  {
    id: 'video-sem-audiodescricao',
    wcagSC: '1.2.5',
    wcagLevel: 'AA',
    impact: 'serious',
    description: 'Detecta vídeos sem track de audiodescrição',
    check: checkVideoSemAudiodescricao,
  },
  {
    id: 'select-onchange-navega',
    wcagSC: '3.2.2',
    wcagLevel: 'A',
    impact: 'serious',
    description: 'Detecta select que navega automaticamente ao mudar seleção',
    check: checkSelectOnchangeNavega,
  },
]

/**
 * Executa todas as regras WCAG de detecção parcial
 */
export async function runWcagPartialRules(page: Page): Promise<WcagPartialViolation[]> {
  const allViolations: WcagPartialViolation[] = []

  for (const rule of wcagPartialRules) {
    try {
      const violations = await rule.check(page)
      allViolations.push(...violations)
    } catch (error) {
      console.error(`[WCAG Partial] Error running rule ${rule.id}:`, error instanceof Error ? error.message : error)
    }
  }

  return allViolations
}
