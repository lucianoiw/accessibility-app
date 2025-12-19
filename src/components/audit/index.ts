/**
 * Audit Components
 *
 * Componentes modulares para exibicao de resultados de auditoria de acessibilidade.
 * Baseados no design do BrowserStack com adaptacoes para o contexto brasileiro.
 */

// Score Card - Gauge com tabela de passed/failed rules
export { ScoreCard } from './score-card'
export { ScoreModal } from './score-modal'

// Issue Summary - Donut chart de severidade
export { IssueSummaryChart } from './issue-summary-chart'

// Category Chart - Bar chart horizontal por categoria
export { CategoryChart } from './category-chart'

// Conformance Tabs - Tabs de conformidade WCAG/eMAG
export { ConformanceTabs } from './conformance-tabs'

// Scan Logs - Tabela de historico de scans
export { ScanLogs } from './scan-logs'

// Delete Audit Button - Botao com confirmacao para excluir auditoria
export { DeleteAuditButton } from './delete-audit-button'
