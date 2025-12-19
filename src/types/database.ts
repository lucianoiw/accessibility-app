// Types gerados baseados no schema SQL
// Para gerar automaticamente: npx supabase gen types typescript --local > src/types/database.ts

export type PlanType = 'FREE' | 'PRO' | 'ENTERPRISE'

export type AuditStatus =
  | 'PENDING'
  | 'CRAWLING'
  | 'AUDITING'
  | 'AGGREGATING'
  | 'GENERATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type PageFoundVia = 'SITEMAP' | 'CRAWL' | 'MANUAL'

export type PageAuditStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'SKIPPED'

export type ImpactLevel = 'critical' | 'serious' | 'moderate' | 'minor'

export type ExportFormat = 'MARKDOWN' | 'PDF' | 'CSV' | 'JSON' | 'JIRA'

export type ViolationStatus = 'open' | 'in_progress' | 'fixed' | 'ignored' | 'false_positive'

export type ReportType = 'executive_pdf' | 'technical_pdf' | 'csv' | 'json'

export type ReportStatus = 'pending' | 'generating' | 'completed' | 'failed'

export type AuthType = 'none' | 'bearer' | 'cookie'

export type SubdomainPolicy = 'main_only' | 'all_subdomains' | 'specific'

export type BrokenPageErrorType = 'timeout' | 'http_error' | 'connection_error' | 'ssl_error' | 'other'

export type ViolationChangeType = 'new' | 'fixed' | 'persistent' | 'worsened' | 'improved'

export type TrendDirection = 'up' | 'down' | 'stable'

export type InsightType = 'positive' | 'negative' | 'neutral' | 'warning'

// ============================================
// Discovery Config Types
// ============================================

export type DiscoveryMethod = 'manual' | 'sitemap' | 'crawler'

// Configuração para modo Manual
export interface ManualDiscoveryConfig {
  urls: string[]
}

// Configuração para modo Sitemap
export interface SitemapDiscoveryConfig {
  sitemapUrl: string
  maxPages: number
}

// Configuração para modo Crawler/Rastreamento
export interface CrawlerDiscoveryConfig {
  startUrl: string
  depth: 1 | 2 | 3
  maxPages: number
  excludePaths?: string[]
}

// Union type para todas as configurações
export type DiscoveryConfig =
  | ManualDiscoveryConfig
  | SitemapDiscoveryConfig
  | CrawlerDiscoveryConfig

// Configuracao de autenticacao do projeto (estilo Postman)
export interface AuthConfig {
  type: AuthType
  // Bearer Token
  token?: string
  // Cookie Auth
  cookies?: string // formato: "name1=value1; name2=value2"
  // Futuro: Basic Auth
  // username?: string
  // password?: string
  // Futuro: API Key
  // apiKey?: string
  // apiKeyHeader?: string
  // apiKeyLocation?: 'header' | 'query'
}

// Snapshot completo das configuracoes do projeto no momento da auditoria
// Garante que todas as configs sejam capturadas, mesmo novas que sejam adicionadas
export interface ProjectConfigSnapshot {
  id: string
  name: string
  base_url: string
  description: string | null
  // Descoberta de páginas
  discovery_method: DiscoveryMethod
  discovery_config: DiscoveryConfig
  // Análise
  default_max_pages: number
  default_wcag_levels: string[]
  default_include_abnt: boolean
  default_include_emag: boolean
  default_include_coga: boolean
  default_include_wcag_partial: boolean
  // Auth e domínios
  auth_config: AuthConfig | null
  subdomain_policy: SubdomainPolicy
  allowed_subdomains: string[] | null
  // Metadados do snapshot
  snapshot_at: string
}

// ============================================
// Database Tables
// ============================================

export interface Profile {
  id: string
  email: string
  name: string | null
  avatar_url: string | null
  plan: PlanType
  stripe_customer_id: string | null
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  base_url: string
  description: string | null
  // Configuração de descoberta de páginas
  discovery_method: DiscoveryMethod
  discovery_config: DiscoveryConfig
  // Configuração padrão de análise
  default_max_pages: number
  default_wcag_levels: string[]
  default_include_abnt: boolean
  default_include_emag: boolean
  default_include_coga: boolean
  default_include_wcag_partial: boolean
  auth_config: AuthConfig | null
  subdomain_policy: SubdomainPolicy
  allowed_subdomains: string[] | null
  created_at: string
  updated_at: string
}

export interface Page {
  id: string
  project_id: string
  url: string
  path: string
  title: string | null
  found_via: PageFoundVia
  depth: number
  created_at: string
}

export interface Audit {
  id: string
  project_id: string
  status: AuditStatus
  // Snapshot completo das configs do projeto (fonte autoritativa)
  project_config_snapshot: ProjectConfigSnapshot | null
  // Configuração de descoberta de páginas (mantidas por compatibilidade)
  discovery_method: DiscoveryMethod
  discovery_config: DiscoveryConfig
  // Configuração de análise (mantidas por compatibilidade/queries)
  max_pages: number
  wcag_levels: string[]
  include_abnt: boolean
  include_emag: boolean
  include_coga: boolean
  // Progresso
  total_pages: number
  processed_pages: number
  failed_pages: number
  broken_pages_count: number
  crawl_iterations: number
  // Trigger.dev
  trigger_run_id: string | null
  // Score e comparacao
  health_score: number | null
  previous_audit_id: string | null
  // Timestamps
  started_at: string | null
  completed_at: string | null
  summary: AuditSummary | null
  created_at: string
  updated_at: string
}

export interface AuditSummary {
  critical: number
  serious: number
  moderate: number
  minor: number
  total: number
  // Contagem de padrões únicos por severidade (templates/componentes reutilizados)
  patterns?: {
    critical: number
    serious: number
    moderate: number
    minor: number
    total: number
  }
}

// Resultado da verificação de correção de violação
export interface VerificationResult {
  remaining: number      // Quantas ocorrências ainda existem
  fixed: number          // Quantas foram corrigidas
  pages_checked: string[] // URLs verificadas
  checked_at: string     // Timestamp da verificação
}

// Elemento único dentro de uma violação agregada
export interface UniqueElement {
  html: string           // HTML do elemento
  selector: string       // Seletor CSS
  fullPath: string | null // Caminho completo do elemento no DOM
  xpath: string | null   // XPath (mais estável para sites com CSS-in-JS)
  count: number          // Quantas ocorrências deste elemento
  pages: string[]        // URLs onde aparece
}

export interface AuditPage {
  id: string
  audit_id: string
  page_id: string
  status: PageAuditStatus
  screenshot_url: string | null
  raw_results: unknown | null
  error_message: string | null
  violation_count: number
  load_time: number | null
  processed_at: string | null
  created_at: string
}

export interface Violation {
  id: string
  audit_id: string
  audit_page_id: string
  rule_id: string
  is_custom_rule: boolean
  impact: ImpactLevel
  wcag_level: string | null
  wcag_version: string | null
  wcag_criteria: string[]
  wcag_tags: string[]
  abnt_section: string | null
  help: string
  description: string
  help_url: string | null
  selector: string
  html: string
  parent_html: string | null
  failure_summary: string | null
  technical_data: unknown | null
  fingerprint: string
  created_at: string
}

export interface AggregatedViolation {
  id: string
  audit_id: string
  rule_id: string
  is_custom_rule: boolean
  fingerprint: string
  impact: ImpactLevel
  wcag_level: string | null
  wcag_version: string | null
  wcag_criteria: string[]
  abnt_section: string | null
  emag_recommendations: string[]
  help: string
  description: string
  help_url: string | null
  occurrences: number
  page_count: number
  affected_pages: string[]
  sample_selector: string
  sample_html: string
  sample_parent_html: string | null
  sample_page_url: string
  ai_suggestion: string | null
  ai_suggested_html: string | null
  ai_generated_at: string | null
  priority: number
  // Elementos únicos dentro desta violação agregada
  unique_elements: UniqueElement[]
  // Campos de status de verificação
  status: ViolationStatus
  last_verified_at: string | null
  verification_result: VerificationResult | null
  resolution_notes: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  audit_id: string
  type: ReportType
  status: ReportStatus
  file_url: string | null
  file_name: string | null
  file_size: number | null
  error_message: string | null
  created_at: string
  completed_at: string | null
}

export interface BrokenPage {
  id: string
  audit_id: string
  url: string
  error_type: BrokenPageErrorType
  http_status: number | null
  error_message: string
  discovered_from: string | null
  attempted_at: string
  created_at: string
}

// ============================================
// Audit Comparison Types
// ============================================

export interface AuditComparison {
  id: string
  audit_id: string
  previous_audit_id: string
  // Deltas de summary por severidade
  delta_critical: number
  delta_serious: number
  delta_moderate: number
  delta_minor: number
  delta_total: number
  // Delta de score de saude
  delta_health_score: number
  // Deltas de paginas
  delta_pages_audited: number
  delta_broken_pages: number
  // Contagens de violacoes por tipo de mudanca
  new_violations_count: number
  fixed_violations_count: number
  persistent_violations_count: number
  worsened_violations_count: number
  improved_violations_count: number
  // Timestamps
  created_at: string
}

export interface ViolationChange {
  id: string
  comparison_id: string
  rule_id: string
  fingerprint: string
  change_type: ViolationChangeType
  // Dados da violacao atual
  current_occurrences: number | null
  current_page_count: number | null
  current_impact: ImpactLevel | null
  // Dados da violacao anterior
  previous_occurrences: number | null
  previous_page_count: number | null
  previous_impact: ImpactLevel | null
  // Delta
  delta_occurrences: number
  delta_page_count: number
  // Metadados para exibicao
  help: string | null
  description: string | null
  created_at: string
}

// ============================================
// Comparison API Response Types
// ============================================

export interface AuditComparisonSummary {
  id: string
  createdAt: string
  completedAt: string | null
  healthScore: number | null
  summary: AuditSummary | null
  pagesAudited: number
  brokenPagesCount: number
}

export interface ComparisonDelta {
  healthScore: number
  critical: number
  serious: number
  moderate: number
  minor: number
  total: number
  pagesAudited: number
  brokenPages: number
}

export interface ViolationChangeDetail {
  type: ViolationChangeType
  ruleId: string
  fingerprint: string
  help: string
  description: string
  current: {
    occurrences: number
    pageCount: number
    impact: ImpactLevel
  } | null
  previous: {
    occurrences: number
    pageCount: number
    impact: ImpactLevel
  } | null
  delta: {
    occurrences: number
    pageCount: number
  }
}

export interface ComparisonViolations {
  new: ViolationChangeDetail[]
  fixed: ViolationChangeDetail[]
  persistent: ViolationChangeDetail[]
  worsened: ViolationChangeDetail[]
  improved: ViolationChangeDetail[]
}

export interface AvailableAuditForComparison {
  id: string
  createdAt: string
  summary: AuditSummary | null
  healthScore: number | null
}

export interface ComparisonResponse {
  current: AuditComparisonSummary
  previous: AuditComparisonSummary | null
  delta: ComparisonDelta
  violations: ComparisonViolations
  availableAudits: AvailableAuditForComparison[]
}

// ============================================
// Evolution API Response Types
// ============================================

export interface TrendData {
  direction: TrendDirection
  changePercent: number
  changeAbsolute: number
  values: Array<{ date: string; value: number }>
}

export interface EvolutionTrends {
  healthScore: TrendData
  critical: TrendData
  serious: TrendData
  moderate: TrendData
  minor: TrendData
  total: TrendData
}

export interface Insight {
  type: InsightType
  key: string
  params: Record<string, string | number>
}

export interface EvolutionAudit {
  id: string
  createdAt: string
  completedAt: string | null
  healthScore: number | null
  summary: AuditSummary | null
  pagesAudited: number
  brokenPagesCount: number
  wcagLevels: string[]
  includeEmag: boolean
}

export interface EvolutionResponse {
  audits: EvolutionAudit[]
  trends: EvolutionTrends
  insights: Insight[]
}

// ============================================
// Supabase Database Type
// ============================================

// Tipos para Insert (campos com default são opcionais)
export type ProjectInsert = {
  user_id: string
  name: string
  base_url: string
  description?: string | null
  // Configuração de descoberta de páginas
  discovery_method?: DiscoveryMethod
  discovery_config?: DiscoveryConfig
  // Configuração padrão de análise
  default_max_pages?: number
  default_wcag_levels?: string[]
  default_include_abnt?: boolean
  default_include_emag?: boolean
  default_include_coga?: boolean
  default_include_wcag_partial?: boolean
  auth_config?: AuthConfig | null
  subdomain_policy?: SubdomainPolicy
  allowed_subdomains?: string[] | null
}

export type AuditInsert = {
  project_id: string
  status?: AuditStatus
  // Snapshot completo das configs do projeto
  project_config_snapshot?: ProjectConfigSnapshot | null
  // Configuração de descoberta de páginas
  discovery_method?: DiscoveryMethod
  discovery_config?: DiscoveryConfig
  // Configuração de análise
  max_pages?: number
  wcag_levels?: string[]
  include_abnt?: boolean
  include_emag?: boolean
  include_coga?: boolean
  // Progresso
  total_pages?: number
  processed_pages?: number
  failed_pages?: number
  broken_pages_count?: number
  crawl_iterations?: number
  // Score e comparacao
  health_score?: number | null
  previous_audit_id?: string | null
  // Timestamps
  started_at?: string | null
  completed_at?: string | null
  summary?: AuditSummary | null
}

export type AuditComparisonInsert = {
  audit_id: string
  previous_audit_id: string
  delta_critical?: number
  delta_serious?: number
  delta_moderate?: number
  delta_minor?: number
  delta_total?: number
  delta_health_score?: number
  delta_pages_audited?: number
  delta_broken_pages?: number
  new_violations_count?: number
  fixed_violations_count?: number
  persistent_violations_count?: number
  worsened_violations_count?: number
  improved_violations_count?: number
}

export type ViolationChangeInsert = {
  comparison_id: string
  rule_id: string
  fingerprint: string
  change_type: ViolationChangeType
  current_occurrences?: number | null
  current_page_count?: number | null
  current_impact?: ImpactLevel | null
  previous_occurrences?: number | null
  previous_page_count?: number | null
  previous_impact?: ImpactLevel | null
  delta_occurrences?: number
  delta_page_count?: number
  help?: string | null
  description?: string | null
}

export type BrokenPageInsert = {
  audit_id: string
  url: string
  error_type: BrokenPageErrorType
  http_status?: number | null
  error_message: string
  discovered_from?: string | null
  attempted_at: string
}

export type PageInsert = {
  project_id: string
  url: string
  path: string
  title?: string | null
  found_via?: PageFoundVia
  depth?: number
}

export type AuditPageInsert = {
  audit_id: string
  page_id: string
  status?: PageAuditStatus
  screenshot_url?: string | null
  raw_results?: unknown | null
  error_message?: string | null
  violation_count?: number
  load_time?: number | null
  processed_at?: string | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string; email: string }
        Update: Partial<Profile>
      }
      projects: {
        Row: Project
        Insert: ProjectInsert
        Update: Partial<Project>
      }
      pages: {
        Row: Page
        Insert: PageInsert
        Update: Partial<Page>
      }
      audits: {
        Row: Audit
        Insert: AuditInsert
        Update: Partial<Audit>
      }
      audit_pages: {
        Row: AuditPage
        Insert: AuditPageInsert
        Update: Partial<AuditPage>
      }
      violations: {
        Row: Violation
        Insert: Partial<Violation> & {
          audit_id: string
          audit_page_id: string
          rule_id: string
          impact: ImpactLevel
          help: string
          description: string
          selector: string
          html: string
          fingerprint: string
        }
        Update: Partial<Violation>
      }
      aggregated_violations: {
        Row: AggregatedViolation
        Insert: Partial<AggregatedViolation> & {
          audit_id: string
          rule_id: string
          fingerprint: string
          impact: ImpactLevel
          help: string
          description: string
          occurrences: number
          page_count: number
          sample_selector: string
          sample_html: string
          sample_page_url: string
        }
        Update: Partial<AggregatedViolation>
      }
      reports: {
        Row: Report
        Insert: Partial<Report> & {
          audit_id: string
          type: ReportType
        }
        Update: Partial<Report>
      }
      broken_pages: {
        Row: BrokenPage
        Insert: BrokenPageInsert
        Update: Partial<BrokenPage>
      }
      audit_comparisons: {
        Row: AuditComparison
        Insert: AuditComparisonInsert
        Update: Partial<AuditComparison>
      }
      violation_changes: {
        Row: ViolationChange
        Insert: ViolationChangeInsert
        Update: Partial<ViolationChange>
      }
    }
    Enums: {
      plan_type: PlanType
      audit_status: AuditStatus
      page_found_via: PageFoundVia
      page_audit_status: PageAuditStatus
      impact_level: ImpactLevel
      export_format: ExportFormat
      violation_status: ViolationStatus
      report_type: ReportType
      report_status: ReportStatus
      broken_page_error_type: BrokenPageErrorType
      discovery_method: DiscoveryMethod
      violation_change_type: ViolationChangeType
      trend_direction: TrendDirection
      insight_type: InsightType
    }
  }
}
