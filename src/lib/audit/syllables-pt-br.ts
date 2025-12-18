/**
 * Separacao silabica para Portugues Brasileiro
 *
 * Baseado em node-stress-pt (https://github.com/andrefs/node-stress-pt)
 * Convertido para TypeScript e adaptado para uso sem dependencias externas.
 *
 * Licenca original: MIT
 */

// =============================================================================
// CONSTANTES - Padroes de caracteres
// =============================================================================

/** Vogais acentuadas */
const ACENTO = '[áéíóúâêôãõüöäëï]'

/** Todas as vogais (incluindo acentuadas) */
const VOGAL = '[áéíóúâêôãõàèaeiouüöäëï]'

/** Consoantes */
const CONSOANTE = '[bcçdfghjklmñnpqrstvwyxz]'

// =============================================================================
// PRIORIDADES DE CONSOANTES
// Sistema de prioridades para determinar onde quebrar silabas.
// Valores maiores = mais provavel de iniciar nova silaba.
// =============================================================================

const PRIORITY_MAP: Record<string, number> = {
  // Prioridade 20 - Separadores (espacos, pontuacao)
  ' ': 20, '-': 20, '.': 20, '!': 20, '?': 20, ':': 20, ';': 20,

  // Prioridade 10 - Consoantes oclusivas e fricativas fortes
  'b': 10, 'ç': 10, 'd': 10, 'f': 10, 'g': 10, 'j': 10, 'k': 10, 'p': 10, 'q': 10, 't': 10, 'v': 10,

  // Prioridade 8 - SC (digrafos sibilantes)
  's': 8, 'c': 8,

  // Prioridade 7 - M (nasal bilabial)
  'm': 7,

  // Prioridade 6 - Lateral e outras
  'l': 6, 'z': 6, 'x': 6,

  // Prioridade 5 - Nasais e vibrantes
  'n': 5, 'r': 5,

  // Prioridade 4 - H (mudo em portugues)
  'h': 4,

  // Prioridade 3 - Semivogais/aproximantes
  'w': 3, 'y': 3,

  // Prioridade 2 - Vogais (exceto i, u)
  'e': 2, 'a': 2, 'o': 2,
  'á': 2, 'é': 2, 'í': 2, 'ó': 2, 'ú': 2,
  'ô': 2, 'â': 2, 'ê': 2, 'û': 2, 'à': 2,
  'ã': 2, 'õ': 2,
  'ä': 2, 'ë': 2, 'ï': 2, 'ö': 2, 'ü': 2,

  // Prioridade 1 - Semivogais altas (formam ditongos)
  'i': 1, 'u': 1,
}

// =============================================================================
// PARES QUE SEMPRE SEPARAM
// Combinacoes de consoantes que sempre devem ser separadas em silabas distintas.
// Ex: "sl" em "isla" -> "is-la"
// =============================================================================

const BREAK_PAIRS = [
  'sl', 'sm', 'sn', 'sc', 'sr', 'rn',
  'bc', 'lr', 'lz', 'bd', 'bj', 'bg', 'bq', 'bt', 'bv',
  'pt', 'pc', 'dj', 'pç', 'ln', 'nr', 'mn', 'tp', 'bf', 'bp',
  'xc', 'sç', 'ss', 'rr',
]

/**
 * Gera regex para pares que sempre separam
 * Usa lookbehind e lookahead para inserir separador entre os pares
 */
function buildBreakPairRegex(): RegExp {
  const pattern = BREAK_PAIRS.map(pair => {
    const [c1, c2] = pair.split('')
    return `(?<=${c1})(?=${c2})`
  }).join('|')
  return new RegExp(pattern, 'gi')
}

const BREAK_PAIR_REGEX = buildBreakPairRegex()

// =============================================================================
// FUNCAO PRINCIPAL - SEPARACAO SILABICA
// =============================================================================

/**
 * Separa uma palavra em silabas
 *
 * @param word - Palavra a ser separada
 * @param separator - Separador de silabas (padrao: '|')
 * @returns Palavra com silabas separadas
 *
 * @example
 * syllabify('computador') // 'com|pu|ta|dor'
 * syllabify('linguas', '-') // 'lin-guas'
 */
export function syllabify(word: string, separator = '|'): string {
  if (!word || word.length === 0) return word

  let result = word

  // =========================================================================
  // REGRA 1: Pares que sempre separam
  // Ex: "ss" -> "s|s", "rr" -> "r|r"
  // =========================================================================
  result = result.replace(BREAK_PAIR_REGEX, '|')

  // =========================================================================
  // REGRA 2: Separacao por prioridade de consoantes
  // Se temos 3 letras consecutivas ABC, separamos apos A se:
  // - prioridade(A) < prioridade(B) E prioridade(B) >= prioridade(C)
  // Ex: "trans" -> T tem prioridade menor que R, entao "t|rans"
  // =========================================================================
  result = result.replace(/(\p{L})(?=(\p{L})(\p{L}))/gu, (match, m1, m2, m3) => {
    const p1 = PRIORITY_MAP[m1.toLowerCase()] || 5
    const p2 = PRIORITY_MAP[m2.toLowerCase()] || 5
    const p3 = PRIORITY_MAP[m3.toLowerCase()] || 5
    return (p1 < p2 && p2 >= p3) ? m1 + '|' : m1
  })

  // =========================================================================
  // REGRAS 3-15: DITONGOS DECRESCENTES
  // Vogal + semivogal no final de silaba
  // =========================================================================

  // ai + r/u no final (ex: "sair" -> "sa|ir")
  result = result.replace(/([a])(i[ru])$/i, '$1|$2')

  // Hiatos com E (ex: "ideia" -> "idei|a")
  result = result.replace(/(?<!^h)([ioeê])([e])/ig, '$1|$2')

  // Hiatos vogal + a/o (ex: "teatro" -> "te|a|tro")
  result = result.replace(/([ioeêé])([ao])/ig, '$1|$2')

  // U apos consoante (exceto Q e G) + ditongo (ex: "sua" -> "su|a")
  result = result.replace(/([^qg]u)(ai|ou|a)/i, '$1|$2')

  // U apos consoante + vogal/ditongo
  result = result.replace(new RegExp('([^qgc]u)(i|ei|iu|ir|' + ACENTO + '|e)', 'i'), '$1|$2')

  // Correcao: reunir "ui" antes de vogal (ex: "tui|a" -> "tuia")
  result = result.replace(/([lpt]u)\|(i)(?=\|[ao])/ig, '$1$2')

  // U + O (ex: "duo" -> "du|o")
  result = result.replace(/([^q]u)(o)/i, '$1|$2')

  // Vogal + vogal acentuada (hiato)
  result = result.replace(new RegExp('([aeio])(' + ACENTO + ')', 'i'), '$1|$2')

  // Vogal acentuada + vogal (hiato)
  result = result.replace(new RegExp('([íúô])(' + VOGAL + ')', 'i'), '$1|$2')

  // A inicial + o/e (ex: "aonde" -> "a|onde")
  result = result.replace(/^a(o|e)/i, 'a|$1')

  // =========================================================================
  // REGRAS 16-30: CASOS ESPECIAIS COM PALAVRAS COMPOSTAS E HIATOS
  // =========================================================================

  // Verificar palavras com hifen e acento
  if (result.match(new RegExp('([\\p{L}\\|]*' + ACENTO + '[\\p{L}\\|]*)\\-', 'u'))) {
    if (result.match(/([eiou])\|([aeio])\-/)) {
      if (RegExp.$1 !== RegExp.$2) {
        result = result.replace(/([eiou])\|([aeio])(?=\-)/ig, '$1$2')
      }
    }
  }

  // Verificar palavras terminando com acento
  if (result.match(new RegExp('([\\p{L}\\|]*' + ACENTO + '[\\p{L}\\|]*)$', 'u'))) {
    if (result.match(/([eiou])\|([aeio])$/)) {
      if (RegExp.$1 !== RegExp.$2) {
        result = result.replace(/([eiou])\|([aeio])$/ig, '$1$2')
      }
    }
  }

  // =========================================================================
  // REGRAS 31-70: CASOS ESPECIFICOS DE HIATOS E DITONGOS
  // =========================================================================

  // Prefixo "re-" antes de "in" (ex: "reiniciar" -> "re|iniciar")
  result = result.replace(/rein/ig, 're|in')

  // "ae" sempre separa (ex: "aereo" -> "a|ereo")
  result = result.replace(/ae/ig, 'a|e')

  // "ain" separa (ex: "ainda" -> "a|inda")
  result = result.replace(/ain/ig, 'a|in')

  // "ao" separa exceto no final com S (ex: "caos" fica junto)
  result = result.replace(/ao(?!s)/ig, 'a|o')

  // "cue" -> "cu|e" (ex: "acue" -> "a|cu|e")
  result = result.replace(/cue/ig, 'cu|e')

  // "cui" antes de m/n/r -> "cu|i"
  result = result.replace(/cui(?=\|?[mnr])/ig, 'cu|i')
  result = result.replace(/cui(?=\|da\|de$)/ig, 'cu|i')

  // "coi" antes de m/n -> "co|i"
  result = result.replace(/coi(?=[mn])/ig, 'co|i')

  // "cai" antes de m/n/d -> "ca|i"
  result = result.replace(/cai(?=\|?[mnd])/ig, 'ca|i')
  result = result.replace(new RegExp('ca\\|i(?=\\|?[m]' + ACENTO + ')', 'ig'), 'cai')

  // "cu" + vogal acentuada
  result = result.replace(/cu([áó])/ig, 'cu|$1')

  // "ai" antes de z -> "a|i"
  result = result.replace(/ai(?=\|?[z])/ig, 'a|i')

  // =========================================================================
  // REGRAS 71-90: CASOS COM I E U
  // =========================================================================

  // "iu" + n/r/v/l separa
  result = result.replace(/i(u\|?)n/ig, 'i|$1n')
  result = result.replace(/i(u\|?)r/ig, 'i|$1r')
  result = result.replace(/i(u\|?)v/ig, 'i|$1v')
  result = result.replace(/i(u\|?)l/ig, 'i|$1l')

  // "ium" -> "i|um"
  result = result.replace(/ium/ig, 'i|um')

  // "tiu" ou "aiu" -> separa
  result = result.replace(/([ta])iu/ig, '$1i|u')

  // "miu|d" -> "mi|u|d"
  result = result.replace(/miu\|d/ig, 'mi|u|d')

  // "auto" antes de i
  result = result.replace(/au\|to(?=i)/ig, 'au|to|')

  // "inh" entre vogais
  result = result.replace(new RegExp('(?<=' + VOGAL + ')i\\|nh(?=[ao])', 'ig'), '|i|nh')

  // "oi" + m/n -> "o|i"
  result = result.replace(/oi([mn])/ig, 'o|i$1')

  // "oi|b" -> "o|i|b"
  result = result.replace(/oi\|b/ig, 'o|i|b')

  // "ois" no meio -> "o|is"
  result = result.replace(/ois(?!$)/ig, 'o|is')
  result = result.replace(new RegExp('o(i\\|?)s(?=' + ACENTO + ')', 'ig'), 'o|$1s')

  // "taoi", "daoi", "maoi" -> separa
  result = result.replace(/([dtm])aoi/ig, '$1a|o|i')

  // "ui" entre consoantes especificas
  result = result.replace(/(?<=[trm])u\|i(?=\|?[tvb][oa])/ig, 'ui')

  // =========================================================================
  // REGRAS 91-110: PREFIXOS E CASOS ESPECIAIS
  // =========================================================================

  // "gastro-" antes de vogal
  result = result.replace(/^gas\|tro(?!-)/ig, 'gas|tro|')

  // "fais" inicial -> "fa|is"
  result = result.replace(/^fais/ig, 'fa|is')

  // "hie" inicial -> "hi|e"
  result = result.replace(/^hie/ig, 'hi|e')

  // "ciu" inicial -> "ci|u"
  result = result.replace(/^ciu/ig, 'ci|u')

  // "alcai" -> nao separa
  result = result.replace(/(?<=^al\|ca)\|i/ig, 'i')

  // Prefixo "anti-"
  result = result.replace(/(?<=^an\|ti)(p)\|?/ig, '|$1')
  result = result.replace(/(?<=^an\|ti)(\-p)\|?/ig, '$1')

  // Prefixo "neuro-"
  result = result.replace(/(?<=^neu\|ro)p\|/ig, '|p')

  // Prefixo "para-"
  result = result.replace(/(?<=^pa\|ra)p\|/ig, '|p')

  // "neo-"
  result = result.replace(/(?<=^ne\|)op\|/ig, 'o|p')

  // Prefixo "re-" antes de vogal
  result = result.replace(/^re(?=[i]\|?[md])/ig, 're|')
  result = result.replace(/^re(?=i\|n[ií]\|c)/ig, 're|')
  result = result.replace(/^re(?=i\|nau\|g)/ig, 're|')
  result = result.replace(/^re(?=[u]\|?[ntsr])/ig, 're|')

  // "video" + vogal
  result = result.replace(new RegExp('(?<=^vi\\|de\\|)o(' + VOGAL + ')', 'ig'), 'o|$1')

  // =========================================================================
  // REGRAS 111-125: PREFIXO "SUB-"
  // =========================================================================

  // "sub" antes de consoante
  result = result.replace(new RegExp('^su\\|b(?!' + VOGAL + ')', 'ig'), 'sub|')
  result = result.replace(new RegExp('(?<=[\\|\\-])su\\|b(?!' + VOGAL + ')', 'ig'), 'sub|')

  // "subl" antes de "im" ou "inh"
  result = result.replace(/^sub\|l(?=i\|?m)/ig, 'su|bl')
  result = result.replace(/(?<=\|)sub\|l(?=i\|?m)/ig, 'su|bl')
  result = result.replace(/^sub\|l(?=i\|?nh)/ig, 'su|bl')
  result = result.replace(/(?<=\|)sub\|l(?=i\|?nh)/ig, 'su|bl')

  // "subs" antes de vogal ou consoante
  result = result.replace(new RegExp('^sub\\|s(?=\\|?' + VOGAL + ')', 'ig'), 'sub|s')
  result = result.replace(new RegExp('(?<=\\|)sub\\|s(?=\\|?' + VOGAL + ')', 'ig'), 'sub|s')
  result = result.replace(new RegExp('^sub\\|s(?=\\|?' + CONSOANTE + ')', 'ig'), 'subs|')
  result = result.replace(new RegExp('(?<=\\|)sub\\|s(?=\\|?' + CONSOANTE + ')', 'ig'), 'subs|')

  // "sobs"
  result = result.replace(/so\|bs/ig, 'sobs')

  // =========================================================================
  // REGRAS 126-135: CASOS FINAIS E LIMPEZA
  // =========================================================================

  // "trai" antes de d
  result = result.replace(/(?<=\|)trai(?=\|d)/ig, 'tra|i')

  // "eczema"
  result = result.replace(/^e\|cze/ig, 'ec|ze')

  // Prefixo "extra-" antes de vogal
  result = result.replace(new RegExp('^ex\\|tra(?=' + VOGAL + ')', 'ig'), 'ex|tra|')

  // "ui" no final -> nao separa
  result = result.replace(/u\|i$/ig, 'ui')

  // Ditongo "oi" + a/o no final
  result = result.replace(/\|?ói([ao])$/ig, 'ói|$1')

  // "ei" + o/a no final ou antes de hifen
  result = result.replace(/ei([oa])(?=$|\-)/ig, 'ei|$1')

  // =========================================================================
  // REGRAS 136-140: PREFIXOS "AB-" E "OB-"
  // =========================================================================

  result = result.replace(new RegExp('^a\\|([bd])([svqnmgfz])(' + VOGAL + ')', 'ig'), 'a$1|$2$3')
  result = result.replace(new RegExp('(?<=\\|)a\\|([bd])([svqnmgfz])(' + VOGAL + ')', 'ig'), 'a$1|$2$3')
  result = result.replace(/^a\|(b)(r)(o)(?=\|g)/ig, 'a$1|$2$3')
  result = result.replace(new RegExp('^a\\|([bd])([s])\\|?(' + CONSOANTE + ')', 'ig'), 'a$1$2|$3')
  result = result.replace(new RegExp('^o\\|([bd])([svqnmgfz])(' + VOGAL + ')', 'ig'), 'o$1|$2$3')
  result = result.replace(new RegExp('^o\\|([bd])([s])\\|?(' + CONSOANTE + ')', 'ig'), 'o$1$2|$3')

  // =========================================================================
  // REGRAS 141-145: QU e GU (digrafos)
  // =========================================================================

  // "qu" e "gu" + vogal -> nao separa
  result = result.replace(/([qg]u)\|([aeií])/i, '$1$2')
  result = result.replace(/([qg]u)\|([o])$/i, '$1$2')

  // =========================================================================
  // REGRAS 146-150: LIMPEZA FINAL
  // =========================================================================

  // Consoante inicial isolada
  result = result.replace(new RegExp('^(' + CONSOANTE + ')\\|', 'i'), '$1')

  // "tungs" (tungsten)
  result = result.replace(/tun\|gs/ig, 'tungs')

  // "ps" no final
  result = result.replace(/p\|s$/i, 'ps')
  result = result.replace(/(^p|\-p)\|s([ií])/i, '$1s$2')

  // "ss" no final
  result = result.replace(/s\|s$/i, 'ss')

  // Remover separadores duplicados
  result = result.replace(/\|\|/g, '|')

  // Aplicar separador customizado
  return separator === '|' ? result : result.replace(/\|/g, separator)
}

// =============================================================================
// FUNCOES AUXILIARES
// =============================================================================

/**
 * Divide uma palavra em array de silabas
 *
 * @param word - Palavra a ser dividida
 * @returns Array de silabas
 *
 * @example
 * splitSyllables('computador') // ['com', 'pu', 'ta', 'dor']
 */
export function splitSyllables(word: string): string[] {
  if (!word || word.length === 0) return []
  return syllabify(word).split('|').filter(s => s.length > 0)
}

/**
 * Conta o numero de silabas em uma palavra
 *
 * @param word - Palavra para contar silabas
 * @returns Numero de silabas
 *
 * @example
 * countSyllables('computador') // 4
 */
export function countSyllables(word: string): number {
  if (!word || word.length === 0) return 0
  return splitSyllables(word).length
}

/**
 * Conta silabas em um texto inteiro
 *
 * @param text - Texto para contar silabas
 * @returns Total de silabas
 */
export function countSyllablesInText(text: string): number {
  if (!text || text.length === 0) return 0

  // Extrair apenas palavras
  const words = text.match(/[\p{L}]+/gu) || []
  return words.reduce((total, word) => total + countSyllables(word), 0)
}

// =============================================================================
// INDICE DE LEGIBILIDADE FLESCH-KINCAID PARA PORTUGUES
// =============================================================================

export interface FleschKincaidResult {
  /** Score de legibilidade (0-100) */
  score: number
  /** Media de palavras por sentenca (ASL) */
  asl: number
  /** Media de silabas por palavra (ASW) */
  asw: number
  /** Numero total de palavras */
  words: number
  /** Numero total de sentencas */
  sentences: number
  /** Numero total de silabas */
  syllables: number
  /** Interpretacao do score */
  interpretation: string
}

/**
 * Calcula o indice de legibilidade Flesch-Kincaid adaptado para Portugues Brasileiro
 *
 * Formula PT-BR (Martins et al., 1996):
 * score = 248.835 - (1.015 * ASL) - (84.6 * ASW)
 *
 * Onde:
 * - ASL = media de palavras por sentenca
 * - ASW = media de silabas por palavra
 *
 * Interpretacao:
 * - 75-100: Muito facil (4a serie / ensino fundamental I)
 * - 50-74: Facil (5a-8a serie / ensino fundamental II)
 * - 25-49: Dificil (ensino medio)
 * - 0-24: Muito dificil (ensino superior)
 *
 * @param text - Texto para analisar
 * @returns Resultado da analise ou null se texto invalido
 *
 * @example
 * const result = fleschKincaidPtBr('O sol brilha no ceu azul.')
 * // { score: 85.2, asl: 6, asw: 1.5, ... }
 */
export function fleschKincaidPtBr(text: string): FleschKincaidResult | null {
  if (!text || text.trim().length === 0) return null

  // Contar sentencas (terminadas por . ! ? : ;)
  const sentences = text.split(/[.!?:;]+/).filter(s => s.trim().length > 0)
  const sentenceCount = sentences.length || 1

  // Extrair palavras (apenas letras)
  const words = text.match(/[\p{L}]+/gu) || []
  const wordCount = words.length

  if (wordCount === 0) return null

  // Contar silabas total
  const syllableCount = words.reduce((total, word) => total + countSyllables(word), 0)

  // Calcular medias
  const asl = wordCount / sentenceCount // Average Sentence Length
  const asw = syllableCount / wordCount // Average Syllables per Word

  // Formula Flesch para Portugues Brasileiro
  // Referencia: Martins, T. B. F., Ghiraldelo, C. M., Nunes, M. G. V., & Oliveira Junior, O. N. (1996)
  const score = Math.max(0, Math.min(100, 248.835 - (1.015 * asl) - (84.6 * asw)))

  // Interpretacao do score
  let interpretation: string
  if (score >= 75) {
    interpretation = 'Muito facil - Nivel ensino fundamental I (4a serie)'
  } else if (score >= 50) {
    interpretation = 'Facil - Nivel ensino fundamental II (5a-8a serie)'
  } else if (score >= 25) {
    interpretation = 'Dificil - Nivel ensino medio'
  } else {
    interpretation = 'Muito dificil - Nivel ensino superior'
  }

  return {
    score: Math.round(score * 10) / 10,
    asl: Math.round(asl * 10) / 10,
    asw: Math.round(asw * 100) / 100,
    words: wordCount,
    sentences: sentenceCount,
    syllables: syllableCount,
    interpretation,
  }
}

/**
 * Verifica se um texto esta acima do nivel de leitura recomendado
 *
 * O eMAG 3.11 recomenda que o conteudo seja compreensivel pelo
 * maior numero possivel de pessoas. Score >= 50 e o alvo.
 *
 * @param text - Texto para verificar
 * @param minScore - Score minimo aceitavel (padrao: 50)
 * @returns true se o texto esta acima do nivel recomendado (dificil demais)
 */
export function isTextTooComplex(text: string, minScore = 50): boolean {
  const result = fleschKincaidPtBr(text)
  if (!result) return false
  return result.score < minScore
}
