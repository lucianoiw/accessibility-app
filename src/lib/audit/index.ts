export {
  crawlWebsite,
  discoverInitialUrls,
  discoverFromSitemap,
  discoverWithPathScope,
  extractLinksFromPage,
  getPathFromUrl,
  normalizeUrl,
  type CrawlResult,
  type CrawlerOptions,
  type SubdomainConfig,
  type DiscoveryOptions,
  type DiscoveryResult,
  type SitemapDiscoveryOptions,
  type SitemapDiscoveryResult,
  type PathScopedDiscoveryOptions,
  type PathScopedDiscoveryResult,
} from './crawler'
export {
  auditPage,
  aggregateViolations,
  calculatePriority,
  type AuditResult,
  type ViolationResult,
  type AuditorOptions,
  type UniqueElementData,
} from './auditor'
export { getCustomViolations, type CustomViolation } from './custom-rules'
export { ABNT_MAP } from './abnt-map'
export {
  // Constantes
  SEVERITY_WEIGHTS,
  WCAG_CRITERIA_COUNTS,
  VALID_WCAG_LEVELS,
  EMAG_TOTAL_RECOMMENDATIONS,
  // Funcoes
  calculateHealthScore,
  getHealthLabel,
  getHealthColor,
  getGuidanceMessage,
  getPriorityBgColor,
  getPriorityTextColor,
  getProgressColorClass,
  calculateDashboardSummary,
  calculateWcagConformance,
  calculateEmagConformance,
  calculateWcagPrincipleBreakdown,
  // Tipos
  type HealthLabel,
  type GuidancePriority,
  type GuidanceMessage,
  type SeveritySummary,
  type DashboardSummary,
  type WcagPrincipleBreakdown,
} from './health'

// Score Calculator (formula estilo BrowserStack)
export {
  calculateAccessibilityScore,
  calculateRulesFromAudit,
  getScoreLabel,
  getScoreColor,
  PASS_WEIGHTS,
  FAIL_WEIGHTS,
  type ScoreData,
  type SeverityBreakdown,
} from './score-calculator'

// Category Mapper
export {
  getCategoryForRule,
  groupViolationsByCategory,
  getCategoriesSortedByCount,
  CATEGORY_DEFINITIONS,
  CATEGORY_ORDER,
  type CategoryCount,
} from './category-mapper'

// Conformance Standards
export {
  WCAG_22_CRITERIA,
  WCAG_PRINCIPLES,
  EMAG_31_RECOMMENDATIONS,
  EMAG_SECTIONS,
  STANDARDS_CONFIG,
  type CriterionStatus,
  type SuccessCriterion,
  type ConformanceStandard,
  type StandardId,
} from './conformance-standards'

// Scan Logs
export {
  createScanLogEntries,
  type ScanLogEntry,
} from './scan-logs'
