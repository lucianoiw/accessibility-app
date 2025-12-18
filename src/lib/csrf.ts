import { headers } from 'next/headers'

/**
 * Valida que a requisição vem do mesmo origin (proteção CSRF)
 *
 * Esta é uma proteção simples mas efetiva baseada em verificação de Origin.
 * Para APIs que recebem POST/PUT/PATCH/DELETE, verificamos se o Origin
 * da requisição corresponde ao Host do servidor.
 *
 * @returns true se a requisição é válida, false caso contrário
 */
export async function validateCsrfOrigin(): Promise<boolean> {
  const headersList = await headers()
  const origin = headersList.get('origin')
  const host = headersList.get('host')

  // Se não tem origin (request direto, não de browser), permitir
  // Isso permite ferramentas como curl, Postman, etc
  if (!origin) {
    return true
  }

  // Se não tem host, bloquear por segurança
  if (!host) {
    return false
  }

  try {
    const originUrl = new URL(origin)
    // Comparar hostname (sem porta para ser mais flexível em dev)
    return originUrl.hostname === host.split(':')[0]
  } catch {
    return false
  }
}

/**
 * Helper para usar em API routes
 * Retorna NextResponse com erro 403 se CSRF inválido
 */
export async function requireCsrfValid(): Promise<{ valid: true } | { valid: false; error: string }> {
  const isValid = await validateCsrfOrigin()

  if (!isValid) {
    return { valid: false, error: 'Requisição inválida (CSRF)' }
  }

  return { valid: true }
}
