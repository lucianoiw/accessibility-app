/**
 * Parser de comandos cURL para extrair headers e cookies
 *
 * Uso:
 * 1. Usuário copia cURL do DevTools (Network → Copy as cURL)
 * 2. Cola na plataforma
 * 3. Extraímos cookies, headers, user-agent, tudo
 */

export interface ParsedCurl {
  url: string
  method: string
  headers: Record<string, string>
  cookies: Record<string, string>
  cookieString: string  // Formato: "name1=value1; name2=value2"
  userAgent: string | null
}

/**
 * Parseia um comando cURL e extrai todas as informações úteis
 */
export function parseCurl(curlCommand: string): ParsedCurl {
  const result: ParsedCurl = {
    url: '',
    method: 'GET',
    headers: {},
    cookies: {},
    cookieString: '',
    userAgent: null,
  }

  // Normalizar o comando (remover quebras de linha e backslashes de continuação)
  const normalized = curlCommand
    .replace(/\\\n/g, ' ')
    .replace(/\\\r\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Extrair URL (pode estar com ou sem aspas)
  const urlMatch = normalized.match(/curl\s+(?:(?:-[A-Za-z]+\s+(?:'[^']*'|"[^"]*"|\S+)\s+)*)?['"]?(https?:\/\/[^\s'"]+)['"]?/)
  if (urlMatch) {
    result.url = urlMatch[1]
  } else {
    // Tentar outro padrão - URL após 'curl'
    const simpleUrlMatch = normalized.match(/curl\s+['"]?(https?:\/\/[^\s'"]+)['"]?/)
    if (simpleUrlMatch) {
      result.url = simpleUrlMatch[1]
    }
  }

  // Extrair método (-X ou --request)
  const methodMatch = normalized.match(/-X\s+['"]?(\w+)['"]?|--request\s+['"]?(\w+)['"]?/)
  if (methodMatch) {
    result.method = methodMatch[1] || methodMatch[2]
  }

  // Extrair headers (-H ou --header)
  const headerRegex = /-H\s+['"]([^'"]+)['"]|--header\s+['"]([^'"]+)['"]/g
  let headerMatch
  while ((headerMatch = headerRegex.exec(normalized)) !== null) {
    const headerStr = headerMatch[1] || headerMatch[2]
    const colonIndex = headerStr.indexOf(':')
    if (colonIndex > 0) {
      const name = headerStr.substring(0, colonIndex).trim().toLowerCase()
      const value = headerStr.substring(colonIndex + 1).trim()
      result.headers[name] = value

      // Capturar user-agent especificamente
      if (name === 'user-agent') {
        result.userAgent = value
      }
    }
  }

  // Extrair cookies (-b ou --cookie)
  const cookieMatch = normalized.match(/-b\s+['"]([^'"]+)['"]|--cookie\s+['"]([^'"]+)['"]/)
  if (cookieMatch) {
    const cookieStr = cookieMatch[1] || cookieMatch[2]
    result.cookieString = cookieStr

    // Parsear cookies individuais
    const cookiePairs = cookieStr.split(';').map(c => c.trim()).filter(Boolean)
    for (const pair of cookiePairs) {
      const eqIndex = pair.indexOf('=')
      if (eqIndex > 0) {
        const name = pair.substring(0, eqIndex).trim()
        const value = pair.substring(eqIndex + 1).trim()
        result.cookies[name] = value
      }
    }
  }

  return result
}

/**
 * Valida se o cURL parseado tem o mínimo necessário
 */
export function validateParsedCurl(parsed: ParsedCurl): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!parsed.url) {
    errors.push('URL não encontrada no comando cURL')
  }

  if (!parsed.url.startsWith('http://') && !parsed.url.startsWith('https://')) {
    errors.push('URL deve começar com http:// ou https://')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Extrai informações relevantes para exibição na UI
 */
export function summarizeParsedCurl(parsed: ParsedCurl): {
  domain: string
  cookieCount: number
  headerCount: number
  hasAuth: boolean
  authType: string | null
} {
  let domain = ''
  try {
    domain = new URL(parsed.url).hostname
  } catch {
    domain = 'URL inválida'
  }

  const hasToken = 'token' in parsed.cookies || 'jwt' in parsed.cookies || 'access_token' in parsed.cookies
  const hasSession = 'session' in parsed.cookies || 'sessionid' in parsed.cookies || 'PHPSESSID' in parsed.cookies
  const hasCfClearance = 'cf_clearance' in parsed.cookies
  const hasAuthHeader = 'authorization' in parsed.headers

  let authType: string | null = null
  if (hasAuthHeader) {
    authType = 'Bearer Token (header)'
  } else if (hasToken) {
    authType = 'JWT Token (cookie)'
  } else if (hasSession) {
    authType = 'Session (cookie)'
  } else if (Object.keys(parsed.cookies).length > 0) {
    authType = 'Cookies'
  }

  return {
    domain,
    cookieCount: Object.keys(parsed.cookies).length,
    headerCount: Object.keys(parsed.headers).length,
    hasAuth: hasAuthHeader || hasToken || hasSession || Object.keys(parsed.cookies).length > 0,
    authType,
  }
}

/**
 * Converte ParsedCurl para o formato de AuthConfig do sistema
 */
export function parsedCurlToAuthConfig(parsed: ParsedCurl): {
  type: 'curl_import'
  cookies: string
  headers: Record<string, string>
  userAgent: string | null
} {
  return {
    type: 'curl_import',
    cookies: parsed.cookieString,
    headers: parsed.headers,
    userAgent: parsed.userAgent,
  }
}
