import { z } from 'zod'

// ============================================
// Discovery Config Schemas
// ============================================

/**
 * Schema para URL válida
 */
const UrlSchema = z.string().url('URL inválida')

/**
 * Schema para configuração de descoberta Manual
 */
export const ManualDiscoveryConfigSchema = z.object({
  urls: z.array(UrlSchema)
    .min(1, 'Adicione pelo menos uma URL')
    .max(500, 'Máximo de 500 URLs'),
})

export type ManualDiscoveryConfigInput = z.infer<typeof ManualDiscoveryConfigSchema>

/**
 * Schema para configuração de descoberta via Sitemap
 */
export const SitemapDiscoveryConfigSchema = z.object({
  sitemapUrl: UrlSchema,
  maxPages: z.number().int().min(1, 'Mínimo 1 página').max(500, 'Máximo 500 páginas'),
})

export type SitemapDiscoveryConfigInput = z.infer<typeof SitemapDiscoveryConfigSchema>

/**
 * Schema para configuração de descoberta via Rastreamento (Crawler)
 */
export const CrawlerDiscoveryConfigSchema = z.object({
  startUrl: UrlSchema,
  depth: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  maxPages: z.number().int().min(1, 'Mínimo 1 página').max(500, 'Máximo 500 páginas'),
  excludePaths: z.array(z.string().max(200, 'Caminho muito longo')).max(50, 'Máximo 50 caminhos').optional(),
})

export type CrawlerDiscoveryConfigInput = z.infer<typeof CrawlerDiscoveryConfigSchema>

/**
 * Schema discriminado para descoberta de páginas
 */
export const DiscoverySchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('manual'),
    config: ManualDiscoveryConfigSchema,
  }),
  z.object({
    method: z.literal('sitemap'),
    config: SitemapDiscoveryConfigSchema,
  }),
  z.object({
    method: z.literal('crawler'),
    config: CrawlerDiscoveryConfigSchema,
  }),
])

export type DiscoveryInput = z.infer<typeof DiscoverySchema>

// ============================================
// Audit Schemas
// ============================================

/**
 * Schema para criação de auditoria (v3 - usa config do projeto)
 * Apenas projectId é necessário, todas as outras configs vêm do projeto
 */
export const CreateAuditSchema = z.object({
  projectId: z.string().uuid('projectId deve ser UUID válido'),
})

export type CreateAuditInput = z.infer<typeof CreateAuditSchema>

/**
 * Schema para criação de auditoria (v2 - com discovery config inline)
 * @deprecated Use CreateAuditSchema (v3) - config agora vem do projeto
 */
export const CreateAuditWithDiscoverySchema = z.object({
  projectId: z.string().uuid('projectId deve ser UUID válido'),
  // Configuração de descoberta de páginas
  discovery: DiscoverySchema,
  // Configuração de análise
  wcagLevels: z.array(z.enum(['A', 'AA', 'AAA'])).min(1, 'Selecione pelo menos um nível WCAG').max(3),
  includeAbnt: z.boolean().optional(),
  includeEmag: z.boolean().optional(),
  includeCoga: z.boolean().optional(),
})

export type CreateAuditWithDiscoveryInput = z.infer<typeof CreateAuditWithDiscoverySchema>

/**
 * Schema para configuração de autenticação
 */
export const AuthConfigSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('none') }),
  z.object({
    type: z.literal('bearer'),
    // Token deve ser seguro, sem newlines ou caracteres de controle
    token: z.string()
      .min(10, 'Token muito curto')
      .max(2048, 'Token muito longo')
      .refine(
        (val) => !/[\r\n]/.test(val),
        'Token não pode conter quebras de linha'
      ),
  }),
  z.object({
    type: z.literal('cookie'),
    // Cookies devem estar no formato correto
    cookies: z.string()
      .min(5, 'Cookies muito curtos')
      .max(4096, 'Cookies muito longos (max 4KB)')
      .refine(
        (val) => !/[\r\n]/.test(val),
        'Cookies não podem conter quebras de linha'
      ),
  }),
])

export type AuthConfigInput = z.infer<typeof AuthConfigSchema>

/**
 * Schema para política de subdomínios
 */
export const SubdomainPolicySchema = z.object({
  subdomainPolicy: z.enum(['main_only', 'all_subdomains', 'specific']),
  allowedSubdomains: z
    .array(
      z.string()
        .min(1, 'Subdomínio vazio')
        .max(253, 'Subdomínio muito longo')
        // Validar formato de subdomain (sem protocol, sem path)
        .regex(
          /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/i,
          'Formato de subdomínio inválido'
        )
    )
    .max(50, 'Máximo 50 subdomínios permitidos')
    .nullable()
    .optional(),
}).refine(
  (data) => {
    if (data.subdomainPolicy === 'specific') {
      return data.allowedSubdomains && data.allowedSubdomains.length > 0
    }
    return true
  },
  {
    message: 'Lista de subdomínios é obrigatória para política "specific"',
    path: ['allowedSubdomains'],
  }
)

export type SubdomainPolicyInput = z.infer<typeof SubdomainPolicySchema>

/**
 * Schema para atualização de status de violação
 */
export const UpdateViolationStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'fixed', 'ignored', 'false_positive']),
  resolution_notes: z.string().max(1000, 'Máximo 1000 caracteres').optional(),
})

export type UpdateViolationStatusInput = z.infer<typeof UpdateViolationStatusSchema>

/**
 * Helper para validar e retornar erro formatado
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string; details?: unknown } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  // Formatar mensagem de erro amigável
  const firstIssue = result.error.issues[0]
  const errorMessage = firstIssue?.message || 'Dados inválidos'

  return {
    success: false,
    error: errorMessage,
    details: result.error.flatten(),
  }
}
