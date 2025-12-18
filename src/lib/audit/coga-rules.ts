/**
 * Regras de Acessibilidade Cognitiva (COGA)
 * Baseado no W3C COGA Task Force: https://www.w3.org/WAI/cognitive/
 *
 * Diferencial: Nenhuma ferramenta internacional faz isso bem,
 * especialmente a analise de legibilidade em portugues brasileiro.
 */

import type { Page } from 'playwright'
import type { CustomViolation } from './custom-rules'

// NOTA: Todas as chamadas page.evaluate usam strings em vez de funcoes
// para evitar que o esbuild do Trigger.dev adicione helpers como "__name"
// que nao existem no contexto do browser

/**
 * Siglas comuns que nao precisam de expansao
 * (universalmente conhecidas ou contextuais de web/tech)
 */
const SIGLAS_COMUNS = [
  // Web/Tech
  'HTML',
  'CSS',
  'PDF',
  'URL',
  'HTTP',
  'HTTPS',
  'API',
  'XML',
  'JSON',
  'SQL',
  'PHP',
  'RSS',
  'WWW',
  'FTP',
  'SSL',
  'TLS',
  'DNS',
  'IP',
  'USB',
  'RAM',
  'ROM',
  'CPU',
  'GPU',
  'SSD',
  'HD',
  'GB',
  'MB',
  'KB',
  'TB',
  // Brasileiras comuns
  'CPF',
  'CNPJ',
  'RG',
  'CEP',
  'PIX',
  'INSS',
  'FGTS',
  'CLT',
  'MEI',
  'IPTU',
  'IPVA',
  'IR',
  'ICMS',
  'ISS',
  'PIS',
  'COFINS',
  'SUS',
  'IBGE',
  // Universais
  'OK',
  'TV',
  'DVD',
  'CD',
  'FM',
  'AM',
  'AC',
  'DC',
  'QR',
  'PIN',
  'ATM',
  'FAQ',
  'CEO',
  'CFO',
  'CTO',
  'RH',
  'TI',
  'EUA',
  'ONU',
  'OMS',
  'FIFA',
  'NBA',
  'UFC',
  'F1',
  'GP',
  // Acessibilidade (contextuais)
  'WCAG',
  'WAI',
  'ARIA',
  'COGA',
  // Codigos de idioma/pais
  'PT',
  'BR',
  'EN',
  'US',
  'ES',
  'UK',
  'FR',
  'DE',
  'IT',
]

/**
 * Palavras marcadoras de texto em ingles
 * (usadas para detectar mudanca de idioma)
 */
const ENGLISH_MARKERS = [
  // Palavras comuns
  'the',
  'and',
  'for',
  'with',
  'this',
  'that',
  'from',
  'have',
  'been',
  'will',
  'would',
  'could',
  'should',
  'their',
  'which',
  'about',
  'into',
  'through',
  'during',
  'before',
  'after',
  'between',
  'under',
  'again',
  'there',
  'where',
  'when',
  'while',
  // Frases comuns em sites
  'click here',
  'read more',
  'learn more',
  'sign up',
  'log in',
  'login',
  'logout',
  'sign in',
  'sign out',
  'download',
  'upload',
  'subscribe',
  'newsletter',
  'submit',
  'search',
  'loading',
  'please wait',
  'copyright',
  'all rights reserved',
  'privacy policy',
  'terms of service',
  'contact us',
  'about us',
  'our team',
  'follow us',
  'share',
  'like',
  'comment',
]

/**
 * eMAG 3.11, WCAG 3.1.5 - Legibilidade de texto em portugues
 *
 * Diferencial competitivo maximo: Nenhuma ferramenta internacional
 * calcula legibilidade em portugues usando Flesch-Kincaid PT-BR.
 *
 * Formula: 248.835 - (1.015 * ASL) - (84.6 * ASW)
 * ASL = media de palavras por sentenca
 * ASW = media de silabas por palavra
 *
 * Score >= 50 = aceitavel (nivel 5a-8a serie)
 * Score < 50 = texto muito dificil
 */
export async function checkLegibilidadeTexto(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // Funcao para contar silabas em portugues brasileiro
      // Baseado em node-stress-pt (algoritmo completo de separacao silabica)
      function contarSilabasPTBR(palavra) {
        palavra = palavra.toLowerCase().trim();
        if (palavra.length === 0) return 0;

        // Remover caracteres nao-alfabeticos
        palavra = palavra.replace(/[^a-zàáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/gi, '');
        if (palavra.length === 0) return 0;
        if (palavra.length <= 2) return 1;

        // Pares de consoantes que sempre separam
        const breakPairs = ['ss', 'rr', 'sc', 'sç', 'xc', 'pt', 'pc', 'mn', 'bd', 'bt', 'bv', 'pç'];
        breakPairs.forEach(pair => {
          palavra = palavra.replace(new RegExp(pair, 'gi'), pair[0] + '|' + pair[1]);
        });

        // Ditongos decrescentes (nao separam): ai, ei, oi, ui, au, eu, ou, ao, iu
        // Tritongos: uai, uei, oei, etc
        // Substituir temporariamente por marcador para nao contar como 2 silabas
        const ditongosDecr = /(?:uai|uei|uou|[aeiou][iu](?![aeiou])|ão|õe|ãe)/gi;
        palavra = palavra.replace(ditongosDecr, 'D');

        // Ditongos crescentes (geralmente separam, mas alguns nao): ia, ie, io, ua, ue, uo
        // qu e gu antes de vogal nao separam
        palavra = palavra.replace(/([qg])u([aeioáéíóú])/gi, '$1U$2'); // proteger qu/gu

        // Hiatos comuns (separam): ae, ao, ea, eo, ia, ie, io, oa, oe, ua, ue, ui, uo
        const hiatos = /([aeo])([aeo])|([aeo])([íú])|([íúô])([aeiou])/gi;
        palavra = palavra.replace(hiatos, '$1$3$5|$2$4$6');

        // Separar vogais acentuadas de vogais adjacentes (hiatos)
        palavra = palavra.replace(/([aeiou])([áéíóúâêô])/gi, '$1|$2');
        palavra = palavra.replace(/([áéíóúâêô])([aeiou])/gi, '$1|$2');

        // Contar separadores (|) + 1 = numero de silabas
        const separadores = (palavra.match(/\|/g) || []).length;

        // Contar vogais restantes (cada vogal/D e um nucleo de silaba)
        const vogais = palavra.replace(/\|/g, '').match(/[aeiouyáéíóúâêîôûàãõDU]/gi);
        const nucleos = vogais ? vogais.length : 1;

        // O numero de silabas e o maximo entre separadores+1 e nucleos
        return Math.max(1, Math.max(separadores + 1, nucleos));
      }

      // Funcao para calcular legibilidade Flesch-Kincaid PT-BR
      function calcularLegibilidade(texto) {
        // Limpar texto
        texto = texto.trim();
        if (texto.length < 100) return { score: 100, skip: true };

        // Separar sentencas
        const sentencas = texto.split(/[.!?]+/).filter(s => s.trim().length > 10);
        if (sentencas.length === 0) return { score: 100, skip: true };

        // Separar palavras (ignorar numeros, URLs, emails)
        const palavras = texto
          .replace(/https?:\\/\\/\\S+/gi, '') // remover URLs
          .replace(/\\S+@\\S+/gi, '')          // remover emails
          .replace(/\\d+/g, '')                // remover numeros
          .split(/\\s+/)
          .filter(p => p.length > 1 && /[a-zàáâãäåçèéêëìíîïñòóôõöùúûüýÿ]/i.test(p));

        if (palavras.length < 20) return { score: 100, skip: true };

        // Calcular medias
        const ASL = palavras.length / sentencas.length; // palavras por sentenca
        let totalSilabas = 0;
        palavras.forEach(p => {
          totalSilabas += contarSilabasPTBR(p);
        });
        const ASW = totalSilabas / palavras.length; // silabas por palavra

        // Formula Flesch-Kincaid PT-BR (Martins et al., 1996)
        const score = 248.835 - (1.015 * ASL) - (84.6 * ASW);

        return {
          score: Math.max(0, Math.min(100, score)),
          ASL: ASL.toFixed(1),
          ASW: ASW.toFixed(2),
          palavras: palavras.length,
          sentencas: sentencas.length,
          skip: false
        };
      }

      // Elementos de texto para analisar
      const textElements = document.querySelectorAll('p, li, td, dd, blockquote, article > div');
      const processed = new Set();

      textElements.forEach((el) => {
        // Ignorar elementos ocultos
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        // Ignorar elementos dentro de code, pre, script, style
        if (el.closest('code, pre, script, style, noscript')) return;

        // Pegar texto direto (nao de filhos)
        let texto = '';
        el.childNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) {
            texto += node.textContent + ' ';
          }
        });

        // Se nao tem texto direto suficiente, pegar textContent
        if (texto.trim().length < 100) {
          texto = el.textContent || '';
        }

        texto = texto.trim();
        if (texto.length < 100) return;

        // Evitar duplicatas
        const textHash = texto.substring(0, 50);
        if (processed.has(textHash)) return;
        processed.add(textHash);

        const result = calcularLegibilidade(texto);
        if (result.skip) return;

        // Score < 50 = texto muito dificil
        if (result.score < 50) {
          let nivel = 'dificil';
          if (result.score < 25) nivel = 'muito dificil';

          violations.push({
            ruleId: 'legibilidade-texto-complexo',
            impact: 'moderate',
            wcagLevel: 'AAA',
            wcagVersion: '2.0',
            wcagCriteria: ['3.1.5'],
            wcagTags: ['wcag2aaa', 'wcag315'],
            abntSection: 'ABNT 5.9.5',
            help: 'Texto deve ser claro e facil de entender',
            description: 'O texto tem baixa legibilidade (score Flesch-Kincaid PT-BR < 50). Considere simplificar sentencas longas e usar palavras mais simples.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/reading-level.html',
            selector: window.getSelector(el),
            fullPath: window.getSelector(el),
            xpath: window.getXPath(el),
            html: el.outerHTML.substring(0, 500),
            parentHtml: el.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Texto ' + nivel + ' (score: ' + result.score.toFixed(0) + '/100). Media: ' + result.ASL + ' palavras/sentenca, ' + result.ASW + ' silabas/palavra.',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 3.12, WCAG 3.1.4 - Siglas sem expansao
 *
 * Detecta siglas (2-6 letras maiusculas) sem explicacao via:
 * - <abbr title="...">
 * - Expansao na primeira ocorrencia: "WCAG (Web Content...)"
 */
export async function checkSiglasSemExpansao(page: Page): Promise<CustomViolation[]> {
  const siglasComuns = JSON.stringify(SIGLAS_COMUNS)

  const code = `
    (() => {
      try {
        const violations = [];
        const siglasComuns = ${siglasComuns};
        const siglasEncontradas = new Map(); // sigla -> { elemento, expandida }
        console.log('[COGA-siglas] Iniciando verificação...');

      // Expressao regular para siglas: 2-6 letras maiusculas
      const siglaRegex = /\\b[A-Z]{2,6}\\b/g;

      // Verificar se uma sigla esta expandida no contexto
      function isExpandida(sigla, contexto) {
        // Padrao: "SIGLA (Expansao...)" ou "(SIGLA) Expansao"
        const padraoParenteses = new RegExp(
          sigla + '\\\\s*\\\\([A-Z][^)]{5,}\\\\)|\\\\([A-Z][^)]{5,}\\\\)\\\\s*' + sigla,
          'i'
        );
        return padraoParenteses.test(contexto);
      }

      // Verificar se sigla esta dentro de abbr com title
      function hasAbbrTitle(elemento, sigla) {
        const abbr = elemento.closest('abbr[title]');
        if (abbr && abbr.textContent?.includes(sigla)) {
          return true;
        }
        // Verificar se ha abbr com esta sigla na pagina
        const abbrs = document.querySelectorAll('abbr[title]');
        for (const a of abbrs) {
          if (a.textContent?.trim() === sigla) {
            return true;
          }
        }
        return false;
      }

      // Elementos de texto para analisar
      const textElements = document.querySelectorAll('p, li, td, th, dd, h1, h2, h3, h4, h5, h6, span, a, label, button');

      textElements.forEach((el) => {
        // Ignorar elementos ocultos
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        // Ignorar elementos de codigo
        if (el.closest('code, pre, script, style, noscript, abbr')) return;

        const texto = el.textContent || '';
        const matches = texto.match(siglaRegex);

        if (!matches) return;

        // Contexto expandido (elemento pai)
        const contextoExpandido = el.parentElement?.textContent || texto;

        matches.forEach((sigla) => {
          // Ignorar siglas comuns
          if (siglasComuns.includes(sigla)) return;

          // Se ja processamos esta sigla, pular
          if (siglasEncontradas.has(sigla)) return;

          // Verificar se tem abbr com title
          if (hasAbbrTitle(el, sigla)) {
            siglasEncontradas.set(sigla, { expandida: true });
            return;
          }

          // Verificar se esta expandida no contexto
          if (isExpandida(sigla, contextoExpandido)) {
            siglasEncontradas.set(sigla, { expandida: true });
            return;
          }

          // Sigla sem expansao encontrada
          siglasEncontradas.set(sigla, { elemento: el, expandida: false });
        });
      });

      // Reportar siglas nao expandidas
      siglasEncontradas.forEach((info, sigla) => {
        if (!info.expandida && info.elemento) {
          violations.push({
            ruleId: 'siglas-sem-expansao',
            impact: 'minor',
            wcagLevel: 'AAA',
            wcagVersion: '2.0',
            wcagCriteria: ['3.1.4'],
            wcagTags: ['wcag2aaa', 'wcag314'],
            abntSection: 'ABNT 5.9.4',
            help: 'Siglas devem ter expansao na primeira ocorrencia',
            description: 'Siglas e abreviaturas devem ser explicadas usando <abbr title="..."> ou expandindo na primeira ocorrencia.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/abbreviations.html',
            selector: window.getSelector(info.elemento),
            fullPath: window.getSelector(info.elemento),
            xpath: window.getXPath(info.elemento),
            html: info.elemento.outerHTML.substring(0, 500),
            parentHtml: info.elemento.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Sigla "' + sigla + '" sem expansao ou <abbr title>',
          });
        }
      });

        console.log('[COGA-siglas] Encontradas ' + siglasEncontradas.size + ' siglas, ' + violations.length + ' violações');
        return violations;
      } catch (e) {
        console.error('[COGA-siglas] Erro:', e.message || e);
        return [];
      }
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * eMAG 3.2, WCAG 3.1.2 - Linguagem inconsistente
 *
 * Detecta texto em idioma diferente do lang da pagina sem marcacao.
 * Foco: detectar ingles em paginas pt-BR.
 */
export async function checkLinguagemInconsistente(page: Page): Promise<CustomViolation[]> {
  const englishMarkers = JSON.stringify(ENGLISH_MARKERS)

  const code = `
    (() => {
      const violations = [];
      const englishMarkers = ${englishMarkers};
      const processed = new Set();

      // Pegar idioma da pagina
      const pageLang = (document.documentElement.lang || 'pt-BR').toLowerCase();
      const isPortuguese = pageLang.includes('pt');

      // Se a pagina nao e em portugues, nao verificamos
      if (!isPortuguese) return violations;

      // Elementos de texto para analisar
      const textElements = document.querySelectorAll('p, li, td, dd, blockquote, span, div');

      textElements.forEach((el) => {
        // Ignorar elementos ocultos
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        // Ignorar elementos de codigo ou com lang definido
        if (el.closest('code, pre, script, style, noscript')) return;
        if (el.closest('[lang]') && el.closest('[lang]') !== document.documentElement) return;

        // Verificar se o proprio elemento tem lang
        if (el.hasAttribute('lang')) return;

        const texto = (el.textContent || '').toLowerCase().trim();
        if (texto.length < 20) return; // Ignorar textos muito curtos

        // Evitar duplicatas
        const textHash = texto.substring(0, 50);
        if (processed.has(textHash)) return;

        // Contar marcadores de ingles
        let englishCount = 0;
        const wordsFound = [];

        englishMarkers.forEach(marker => {
          // Verificar se o marcador aparece como palavra completa
          // Marcadores sao palavras simples, nao precisam de escape
          const regex = new RegExp('\\\\b' + marker + '\\\\b', 'gi');
          const matches = texto.match(regex);
          if (matches) {
            englishCount += matches.length;
            if (!wordsFound.includes(marker)) {
              wordsFound.push(marker);
            }
          }
        });

        // Se encontrou 3+ marcadores de ingles, provavelmente e texto em ingles
        if (englishCount >= 3 && wordsFound.length >= 2) {
          processed.add(textHash);

          violations.push({
            ruleId: 'linguagem-inconsistente',
            impact: 'minor',
            wcagLevel: 'AA',
            wcagVersion: '2.0',
            wcagCriteria: ['3.1.2'],
            wcagTags: ['wcag2aa', 'wcag312'],
            abntSection: 'ABNT 5.9.2',
            help: 'Trechos em outro idioma devem ter atributo lang',
            description: 'Texto em idioma diferente do principal deve ter atributo lang apropriado (ex: lang="en" para ingles).',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-parts.html',
            selector: window.getSelector(el),
            fullPath: window.getSelector(el),
            xpath: window.getXPath(el),
            html: el.outerHTML.substring(0, 500),
            parentHtml: el.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Texto aparenta estar em ingles sem marcacao lang="en". Palavras detectadas: ' + wordsFound.slice(0, 5).join(', '),
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * WCAG 2.2.1, 2.2.6 - Timeout sem aviso
 *
 * Detecta formularios que podem ter timeout de sessao sem aviso.
 */
export async function checkTimeoutSemAviso(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // 1. Verificar meta refresh com timeout
      const metaRefresh = document.querySelector('meta[http-equiv="refresh" i]');
      if (metaRefresh) {
        const content = metaRefresh.getAttribute('content') || '';
        const match = content.match(/^(\\d+)/);
        if (match) {
          const seconds = parseInt(match[1], 10);
          // Se timeout > 20 segundos e < 20 minutos, pode ser timeout de sessao
          if (seconds > 20 && seconds < 1200) {
            // Verificar se ha aviso na pagina
            const bodyText = (document.body.textContent || '').toLowerCase();
            const hasWarning =
              bodyText.includes('sessao') ||
              bodyText.includes('sessão') ||
              bodyText.includes('tempo') ||
              bodyText.includes('expirar') ||
              bodyText.includes('minutos') ||
              bodyText.includes('timeout') ||
              bodyText.includes('session');

            if (!hasWarning) {
              violations.push({
                ruleId: 'timeout-sem-aviso',
                impact: 'serious',
                wcagLevel: 'A',
                wcagVersion: '2.0',
                wcagCriteria: ['2.2.1'],
                wcagTags: ['wcag2a', 'wcag221'],
                abntSection: 'ABNT 5.5.1',
                help: 'Timeout de pagina deve avisar o usuario',
                description: 'A pagina tem timeout automatico sem aviso visivel. O usuario deve ser avisado e ter opcao de estender o tempo.',
                helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html',
                selector: 'meta[http-equiv="refresh"]',
                fullPath: 'head > meta[http-equiv="refresh"]',
                xpath: '/html/head/meta[@http-equiv="refresh"]',
                html: metaRefresh.outerHTML,
                parentHtml: null,
                failureSummary: 'Pagina com timeout de ' + seconds + ' segundos sem aviso visivel',
              });
            }
          }
        }
      }

      // 2. Verificar formularios sensiveis sem aviso de timeout
      const forms = document.querySelectorAll('form');
      forms.forEach((form) => {
        // Campos sensiveis que indicam formulario importante
        const hasPassword = form.querySelector('input[type="password"]');
        const hasCard = form.querySelector(
          'input[name*="card" i], input[name*="credit" i], input[name*="cartao" i], ' +
          'input[autocomplete*="cc-"], input[name*="cvv" i], input[name*="cvc" i]'
        );
        const hasSensitive = hasPassword || hasCard;

        if (hasSensitive) {
          // Verificar se ha aviso de timeout proximo ao form
          const formContainer = form.closest('main, section, article, div[class*="container"]') || form.parentElement;
          const containerText = (formContainer?.textContent || '').toLowerCase();

          const hasTimeoutWarning =
            containerText.includes('sessao expira') ||
            containerText.includes('sessão expira') ||
            containerText.includes('tempo limite') ||
            containerText.includes('inatividade') ||
            containerText.includes('timeout') ||
            containerText.includes('session expire');

          // Verificar se ha timer visivel
          const hasTimer = formContainer?.querySelector(
            '[class*="timer" i], [class*="countdown" i], [class*="tempo" i], ' +
            '[id*="timer" i], [id*="countdown" i]'
          );

          // Se e formulario sensivel sem aviso, reportar como atencao
          if (!hasTimeoutWarning && !hasTimer) {
            const formType = hasCard ? 'pagamento' : 'login';
            violations.push({
              ruleId: 'timeout-sem-aviso',
              impact: 'moderate',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['2.2.1', '2.2.6'],
              wcagTags: ['wcag2a', 'wcag221'],
              abntSection: 'ABNT 5.5.1',
              help: 'Formularios com timeout devem avisar o usuario',
              description: 'Formulario de ' + formType + ' pode ter timeout de sessao. Certifique-se de avisar o usuario e permitir estender o tempo.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/timing-adjustable.html',
              selector: window.getSelector(form),
              fullPath: window.getSelector(form),
              xpath: window.getXPath(form),
              html: form.outerHTML.substring(0, 500),
              parentHtml: formContainer?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Formulario de ' + formType + ' sem aviso visivel de timeout/sessao',
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
 * WCAG 1.1.1 - CAPTCHA sem alternativa acessivel
 *
 * Detecta CAPTCHAs visuais sem opcao de audio ou alternativa.
 */
export async function checkCaptchaSemAlternativa(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];

      // 1. Detectar reCAPTCHA
      const recaptchaIframes = document.querySelectorAll(
        'iframe[src*="recaptcha"], iframe[src*="google.com/recaptcha"]'
      );
      const recaptchaDivs = document.querySelectorAll(
        '.g-recaptcha, [data-sitekey], [class*="recaptcha"]'
      );

      // reCAPTCHA v3 e invisivel e acessivel - verificar se e v2
      recaptchaIframes.forEach((iframe) => {
        const src = iframe.getAttribute('src') || '';
        // v2 tem anchor ou bframe no URL
        const isV2 = src.includes('anchor') || src.includes('bframe');

        if (isV2) {
          // reCAPTCHA v2 tem alternativa de audio integrada, entao e OK
          // Mas vamos verificar se o iframe esta acessivel
          const hasTitle = iframe.hasAttribute('title') && iframe.getAttribute('title')?.trim();

          if (!hasTitle) {
            violations.push({
              ruleId: 'captcha-sem-alternativa',
              impact: 'moderate',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['1.1.1'],
              wcagTags: ['wcag2a', 'wcag111'],
              abntSection: 'ABNT 5.2.6',
              help: 'CAPTCHA deve ter alternativa acessivel',
              description: 'O iframe do reCAPTCHA deve ter atributo title descritivo para leitores de tela.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
              selector: window.getSelector(iframe),
              fullPath: window.getSelector(iframe),
              xpath: window.getXPath(iframe),
              html: iframe.outerHTML.substring(0, 500),
              parentHtml: iframe.parentElement?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Iframe de reCAPTCHA sem atributo title',
            });
          }
        }
      });

      // 2. Detectar hCaptcha
      const hcaptchaIframes = document.querySelectorAll(
        'iframe[src*="hcaptcha"], iframe[src*="newassets.hcaptcha"]'
      );
      const hcaptchaDivs = document.querySelectorAll(
        '.h-captcha, [data-hcaptcha-sitekey]'
      );

      hcaptchaIframes.forEach((iframe) => {
        const hasTitle = iframe.hasAttribute('title') && iframe.getAttribute('title')?.trim();

        if (!hasTitle) {
          violations.push({
            ruleId: 'captcha-sem-alternativa',
            impact: 'moderate',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.1.1'],
            wcagTags: ['wcag2a', 'wcag111'],
            abntSection: 'ABNT 5.2.6',
            help: 'CAPTCHA deve ter alternativa acessivel',
            description: 'O iframe do hCaptcha deve ter atributo title descritivo para leitores de tela.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
            selector: window.getSelector(iframe),
            fullPath: window.getSelector(iframe),
            xpath: window.getXPath(iframe),
            html: iframe.outerHTML.substring(0, 500),
            parentHtml: iframe.parentElement?.outerHTML.substring(0, 200) || null,
            failureSummary: 'Iframe de hCaptcha sem atributo title',
          });
        }
      });

      // 2.1 Detectar containers de reCAPTCHA/hCaptcha sem iframe carregado
      // Isso pode indicar script bloqueado ou CAPTCHA mal configurado
      recaptchaDivs.forEach((div) => {
        // Verificar se tem iframe dentro (CAPTCHA carregado)
        const hasIframe = div.querySelector('iframe') || div.closest('form')?.querySelector('iframe[src*="recaptcha"]');
        if (!hasIframe) {
          // Verificar se parece um placeholder de CAPTCHA (tem sitekey)
          if (div.hasAttribute('data-sitekey')) {
            violations.push({
              ruleId: 'captcha-sem-alternativa',
              impact: 'serious',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['1.1.1'],
              wcagTags: ['wcag2a', 'wcag111'],
              abntSection: 'ABNT 5.2.6',
              help: 'CAPTCHA deve estar funcional e acessivel',
              description: 'Container reCAPTCHA encontrado sem iframe carregado. O CAPTCHA pode nao estar funcionando ou o script foi bloqueado.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
              selector: window.getSelector(div),
              fullPath: window.getSelector(div),
              xpath: window.getXPath(div),
              html: div.outerHTML.substring(0, 500),
              parentHtml: div.parentElement?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Container reCAPTCHA sem iframe - CAPTCHA pode nao estar carregado',
            });
          }
        }
      });

      hcaptchaDivs.forEach((div) => {
        const hasIframe = div.querySelector('iframe') || div.closest('form')?.querySelector('iframe[src*="hcaptcha"]');
        if (!hasIframe) {
          if (div.hasAttribute('data-sitekey') || div.hasAttribute('data-hcaptcha-sitekey')) {
            violations.push({
              ruleId: 'captcha-sem-alternativa',
              impact: 'serious',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['1.1.1'],
              wcagTags: ['wcag2a', 'wcag111'],
              abntSection: 'ABNT 5.2.6',
              help: 'CAPTCHA deve estar funcional e acessivel',
              description: 'Container hCaptcha encontrado sem iframe carregado. O CAPTCHA pode nao estar funcionando ou o script foi bloqueado.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
              selector: window.getSelector(div),
              fullPath: window.getSelector(div),
              xpath: window.getXPath(div),
              html: div.outerHTML.substring(0, 500),
              parentHtml: div.parentElement?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Container hCaptcha sem iframe - CAPTCHA pode nao estar carregado',
            });
          }
        }
      });

      // 3. Detectar CAPTCHAs customizados (imagem)
      const captchaImages = document.querySelectorAll(
        'img[src*="captcha" i], img[alt*="captcha" i], img[class*="captcha" i], ' +
        'img[id*="captcha" i], [class*="captcha"] img'
      );

      captchaImages.forEach((img) => {
        // Verificar se ha alternativa de audio proximo
        const container = img.closest('div, form, fieldset') || img.parentElement;
        const hasAudioAlt = container?.querySelector(
          'audio, button[aria-label*="audio" i], a[href*="audio" i], ' +
          'button[title*="audio" i], [class*="audio" i]'
        );

        // Verificar se ha input de texto proximo (resposta do CAPTCHA)
        const hasInput = container?.querySelector('input[type="text"], input[name*="captcha" i]');

        // Se tem imagem CAPTCHA + input mas sem audio, reportar
        if (hasInput && !hasAudioAlt) {
          violations.push({
            ruleId: 'captcha-sem-alternativa',
            impact: 'critical',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['1.1.1'],
            wcagTags: ['wcag2a', 'wcag111'],
            abntSection: 'ABNT 5.2.6',
            help: 'CAPTCHA visual deve ter alternativa de audio',
            description: 'CAPTCHAs visuais excluem usuarios cegos. Forneca alternativa de audio ou use reCAPTCHA/hCaptcha que tem audio integrado.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
            selector: window.getSelector(img),
            fullPath: window.getSelector(img),
            xpath: window.getXPath(img),
            html: img.outerHTML.substring(0, 500),
            parentHtml: container?.outerHTML.substring(0, 300) || null,
            failureSummary: 'CAPTCHA visual customizado sem alternativa de audio',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * WCAG 2.2.2, 2.3.3 - Animacao sem controle de pausa
 *
 * Detecta animacoes CSS, GIFs e SVG animados sem botao de pausa.
 */
export async function checkAnimacaoSemPause(page: Page): Promise<CustomViolation[]> {
  const code = `
    (() => {
      const violations = [];
      const processed = new Set();

      // 1. Detectar CSS animations infinitas
      const allElements = document.querySelectorAll('*');

      allElements.forEach((el) => {
        const style = window.getComputedStyle(el);

        // Verificar animation
        const animationName = style.animationName;
        const animationDuration = parseFloat(style.animationDuration);
        const animationIterationCount = style.animationIterationCount;

        if (
          animationName &&
          animationName !== 'none' &&
          animationDuration > 0 &&
          animationIterationCount === 'infinite'
        ) {
          // Verificar se elemento esta visivel
          if (style.display === 'none' || style.visibility === 'hidden') return;

          // Verificar tamanho (ignorar animacoes muito pequenas)
          const rect = el.getBoundingClientRect();
          if (rect.width < 20 || rect.height < 20) return;

          const selector = window.getSelector(el);
          if (processed.has(selector)) return;

          // Verificar se ha botao de pause proximo
          const container = el.closest('section, article, div[class]') || el.parentElement;
          const hasPauseBtn = container?.querySelector(
            '[class*="pause" i], [aria-label*="pause" i], [aria-label*="pausar" i], ' +
            '[title*="pause" i], [title*="pausar" i], button[class*="play" i]'
          );

          if (!hasPauseBtn) {
            processed.add(selector);
            violations.push({
              ruleId: 'animacao-sem-pause',
              impact: 'moderate',
              wcagLevel: 'A',
              wcagVersion: '2.0',
              wcagCriteria: ['2.2.2'],
              wcagTags: ['wcag2a', 'wcag222'],
              abntSection: 'ABNT 5.5.2',
              help: 'Animacoes devem ter controle de pausa',
              description: 'Animacoes em loop infinito podem distrair usuarios. Forneca botao de pause ou use prefers-reduced-motion.',
              helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
              selector: selector,
              fullPath: selector,
              xpath: window.getXPath(el),
              html: el.outerHTML.substring(0, 500),
              parentHtml: container?.outerHTML.substring(0, 200) || null,
              failureSummary: 'Animacao CSS infinita (' + animationName + ') sem botao de pause',
            });
          }
        }
      });

      // 2. Detectar GIFs (assumir animados)
      const gifs = document.querySelectorAll('img[src$=".gif" i], img[src*=".gif?" i]');

      gifs.forEach((img) => {
        const style = window.getComputedStyle(img);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        // Verificar tamanho (ignorar GIFs muito pequenos - provavelmente icones)
        const rect = img.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 50) return;

        const selector = window.getSelector(img);
        if (processed.has(selector)) return;

        // Verificar se ha controle proximo
        const container = img.closest('figure, div, section') || img.parentElement;
        const hasPauseBtn = container?.querySelector(
          '[class*="pause" i], [aria-label*="pause" i], button, ' +
          '[class*="play" i], [class*="stop" i]'
        );

        // GIFs grandes sem controle
        if (!hasPauseBtn && (rect.width > 100 || rect.height > 100)) {
          processed.add(selector);
          violations.push({
            ruleId: 'animacao-sem-pause',
            impact: 'minor',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['2.2.2'],
            wcagTags: ['wcag2a', 'wcag222'],
            abntSection: 'ABNT 5.5.2',
            help: 'GIFs animados devem ter controle de pausa',
            description: 'GIFs animados podem distrair usuarios com TDAH ou autismo. Considere usar video com controles ou oferecer opcao de pausar.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
            selector: selector,
            fullPath: selector,
            xpath: window.getXPath(img),
            html: img.outerHTML.substring(0, 500),
            parentHtml: container?.outerHTML.substring(0, 200) || null,
            failureSummary: 'GIF animado (' + rect.width.toFixed(0) + 'x' + rect.height.toFixed(0) + 'px) sem controle de pausa',
          });
        }
      });

      // 3. Detectar SVG com animate
      const svgsAnimados = document.querySelectorAll('svg animate, svg animateTransform, svg animateMotion');

      svgsAnimados.forEach((animate) => {
        const svg = animate.closest('svg');
        if (!svg) return;

        const style = window.getComputedStyle(svg);
        if (style.display === 'none' || style.visibility === 'hidden') return;

        const selector = window.getSelector(svg);
        if (processed.has(selector)) return;

        // Verificar se animacao e infinita
        const repeatCount = animate.getAttribute('repeatCount');
        if (repeatCount !== 'indefinite') return;

        // Verificar se ha controle proximo
        const container = svg.closest('div, section, figure') || svg.parentElement;
        const hasPauseBtn = container?.querySelector(
          '[class*="pause" i], [aria-label*="pause" i], button'
        );

        if (!hasPauseBtn) {
          processed.add(selector);
          violations.push({
            ruleId: 'animacao-sem-pause',
            impact: 'moderate',
            wcagLevel: 'A',
            wcagVersion: '2.0',
            wcagCriteria: ['2.2.2'],
            wcagTags: ['wcag2a', 'wcag222'],
            abntSection: 'ABNT 5.5.2',
            help: 'SVG animado deve ter controle de pausa',
            description: 'SVG com animacao infinita pode distrair usuarios. Forneca controle de pausa ou use prefers-reduced-motion.',
            helpUrl: 'https://www.w3.org/WAI/WCAG21/Understanding/pause-stop-hide.html',
            selector: selector,
            fullPath: selector,
            xpath: window.getXPath(svg),
            html: svg.outerHTML.substring(0, 500),
            parentHtml: container?.outerHTML.substring(0, 200) || null,
            failureSummary: 'SVG com animacao infinita sem controle de pausa',
          });
        }
      });

      return violations;
    })()
  `
  return page.evaluate(code) as Promise<CustomViolation[]>
}

/**
 * Executa todas as regras COGA
 */
export async function getCogaViolations(page: Page): Promise<CustomViolation[]> {
  const violations: CustomViolation[] = []

  // Executar cada regra individualmente com try/catch para não perder todas se uma falhar
  const rules = [
    { name: 'legibilidade', fn: checkLegibilidadeTexto },
    { name: 'siglas', fn: checkSiglasSemExpansao },
    { name: 'linguagem', fn: checkLinguagemInconsistente },
    { name: 'timeout', fn: checkTimeoutSemAviso },
    { name: 'captcha', fn: checkCaptchaSemAlternativa },
    { name: 'animacao', fn: checkAnimacaoSemPause },
  ]

  for (const rule of rules) {
    try {
      const result = await rule.fn(page)
      violations.push(...result)
      console.log(`[COGA] ${rule.name}: ${result.length} violações`)
    } catch (error) {
      console.error(`[COGA] Erro em ${rule.name}:`, error instanceof Error ? error.message : error)
    }
  }

  console.log(`[COGA] Total: ${violations.length} violações`)
  return violations
}
