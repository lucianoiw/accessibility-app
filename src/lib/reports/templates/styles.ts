/**
 * Estilos CSS inline para geracao de PDF
 * Otimizado para renderizacao via Playwright
 */

export const COLORS = {
  // Severidade
  critical: {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#EF4444',
  },
  serious: {
    bg: '#FFEDD5',
    text: '#9A3412',
    border: '#F97316',
  },
  moderate: {
    bg: '#FEF3C7',
    text: '#92400E',
    border: '#F59E0B',
  },
  minor: {
    bg: '#DBEAFE',
    text: '#1E40AF',
    border: '#3B82F6',
  },
  // Status
  pass: {
    bg: '#D1FAE5',
    text: '#065F46',
    border: '#10B981',
  },
  fail: {
    bg: '#FEE2E2',
    text: '#991B1B',
    border: '#EF4444',
  },
  notTested: {
    bg: '#F3F4F6',
    text: '#6B7280',
    border: '#9CA3AF',
  },
  // Branding
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  secondary: '#64748B',
  // Neutros
  white: '#FFFFFF',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
}

export const BASE_STYLES = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html, body {
    font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: ${COLORS.gray900};
    background: ${COLORS.white};
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.25;
    margin-bottom: 0.5em;
  }

  h1 { font-size: 28px; }
  h2 { font-size: 22px; }
  h3 { font-size: 18px; }
  h4 { font-size: 16px; }

  p { margin-bottom: 0.75em; }

  a {
    color: ${COLORS.primary};
    text-decoration: none;
  }

  code {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 12px;
    background: ${COLORS.gray100};
    padding: 2px 6px;
    border-radius: 4px;
  }

  pre {
    font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
    font-size: 11px;
    background: ${COLORS.gray900};
    color: ${COLORS.gray100};
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
  }

  th, td {
    padding: 10px 12px;
    text-align: left;
    border-bottom: 1px solid ${COLORS.gray200};
  }

  th {
    background: ${COLORS.gray50};
    font-weight: 600;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: ${COLORS.gray700};
  }

  tr:hover td {
    background: ${COLORS.gray50};
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 20mm;
    margin: 0 auto;
    background: ${COLORS.white};
    page-break-after: always;
  }

  .page:last-child {
    page-break-after: auto;
  }

  .cover {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
    height: calc(297mm - 40mm);
  }

  .cover h1 {
    font-size: 36px;
    margin-bottom: 24px;
    color: ${COLORS.primary};
  }

  .cover .url {
    font-size: 20px;
    color: ${COLORS.gray700};
    margin-bottom: 16px;
  }

  .cover .date {
    font-size: 16px;
    color: ${COLORS.gray500};
  }

  .cover .logo {
    margin-bottom: 48px;
  }

  .section {
    margin-bottom: 32px;
  }

  .section-title {
    font-size: 20px;
    color: ${COLORS.primary};
    border-bottom: 2px solid ${COLORS.primary};
    padding-bottom: 8px;
    margin-bottom: 16px;
  }

  .card {
    background: ${COLORS.white};
    border: 1px solid ${COLORS.gray200};
    border-radius: 8px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }

  .badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .badge-critical {
    background: ${COLORS.critical.bg};
    color: ${COLORS.critical.text};
  }

  .badge-serious {
    background: ${COLORS.serious.bg};
    color: ${COLORS.serious.text};
  }

  .badge-moderate {
    background: ${COLORS.moderate.bg};
    color: ${COLORS.moderate.text};
  }

  .badge-minor {
    background: ${COLORS.minor.bg};
    color: ${COLORS.minor.text};
  }

  .badge-pass {
    background: ${COLORS.pass.bg};
    color: ${COLORS.pass.text};
  }

  .badge-fail {
    background: ${COLORS.fail.bg};
    color: ${COLORS.fail.text};
  }

  .badge-not-tested {
    background: ${COLORS.notTested.bg};
    color: ${COLORS.notTested.text};
  }

  .badge-wcag {
    background: ${COLORS.gray100};
    color: ${COLORS.gray700};
  }

  .badge-abnt {
    background: #D1FAE5;
    color: #065F46;
  }

  .badge-br {
    background: #EDE9FE;
    color: #5B21B6;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }

  .stat-card {
    background: ${COLORS.gray50};
    border-radius: 8px;
    padding: 16px;
    text-align: center;
  }

  .stat-value {
    font-size: 32px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 12px;
    color: ${COLORS.gray500};
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-critical .stat-value { color: ${COLORS.critical.text}; }
  .stat-serious .stat-value { color: ${COLORS.serious.text}; }
  .stat-moderate .stat-value { color: ${COLORS.moderate.text}; }
  .stat-minor .stat-value { color: ${COLORS.minor.text}; }

  .flex {
    display: flex;
  }

  .flex-col {
    flex-direction: column;
  }

  .items-center {
    align-items: center;
  }

  .justify-between {
    justify-content: space-between;
  }

  .gap-2 {
    gap: 8px;
  }

  .gap-4 {
    gap: 16px;
  }

  .mt-2 {
    margin-top: 8px;
  }

  .mt-4 {
    margin-top: 16px;
  }

  .mb-2 {
    margin-bottom: 8px;
  }

  .mb-4 {
    margin-bottom: 16px;
  }

  .text-sm {
    font-size: 12px;
  }

  .text-xs {
    font-size: 11px;
  }

  .text-muted {
    color: ${COLORS.gray500};
  }

  .text-center {
    text-align: center;
  }

  .font-bold {
    font-weight: 700;
  }

  .font-medium {
    font-weight: 500;
  }

  .violation-card {
    border-left: 4px solid;
    padding: 16px;
    margin-bottom: 16px;
    background: ${COLORS.white};
    border-radius: 0 8px 8px 0;
    page-break-inside: avoid;
  }

  .violation-critical {
    border-left-color: ${COLORS.critical.border};
    background: ${COLORS.critical.bg}20;
  }

  .violation-serious {
    border-left-color: ${COLORS.serious.border};
    background: ${COLORS.serious.bg}20;
  }

  .violation-moderate {
    border-left-color: ${COLORS.moderate.border};
    background: ${COLORS.moderate.bg}20;
  }

  .violation-minor {
    border-left-color: ${COLORS.minor.border};
    background: ${COLORS.minor.bg}20;
  }

  .violation-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .violation-help {
    font-size: 14px;
    color: ${COLORS.gray700};
    margin-bottom: 8px;
  }

  .violation-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    font-size: 12px;
    color: ${COLORS.gray500};
  }

  .code-block {
    margin: 12px 0;
  }

  .code-label {
    font-size: 11px;
    font-weight: 600;
    color: ${COLORS.gray500};
    margin-bottom: 4px;
    text-transform: uppercase;
  }

  .ai-suggestion {
    background: #EFF6FF;
    border: 1px solid #BFDBFE;
    border-radius: 8px;
    padding: 12px;
    margin-top: 12px;
  }

  .ai-suggestion-title {
    font-size: 12px;
    font-weight: 600;
    color: ${COLORS.primary};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .progress-bar {
    background: ${COLORS.gray200};
    border-radius: 9999px;
    height: 16px;
    overflow: hidden;
  }

  .progress-fill {
    background: ${COLORS.primary};
    height: 100%;
    border-radius: 9999px;
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 28px;
    font-weight: 700;
    color: ${COLORS.primary};
  }

  .top-violations {
    counter-reset: violation;
  }

  .top-violation {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: ${COLORS.gray50};
    border-radius: 8px;
    margin-bottom: 8px;
  }

  .top-violation::before {
    counter-increment: violation;
    content: counter(violation);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: ${COLORS.primary};
    color: ${COLORS.white};
    border-radius: 50%;
    font-weight: 700;
    font-size: 14px;
  }

  .top-violation-content {
    flex: 1;
  }

  .top-violation-title {
    font-weight: 600;
    margin-bottom: 2px;
  }

  .top-violation-meta {
    font-size: 12px;
    color: ${COLORS.gray500};
  }

  .chart-container {
    display: flex;
    justify-content: center;
    margin: 24px 0;
  }

  .principle-row {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid ${COLORS.gray200};
  }

  .principle-name {
    width: 120px;
    font-weight: 500;
  }

  .principle-bar {
    flex: 1;
    height: 24px;
    background: ${COLORS.gray100};
    border-radius: 4px;
    overflow: hidden;
  }

  .principle-fill {
    height: 100%;
    background: ${COLORS.primary};
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding-right: 8px;
    font-size: 11px;
    font-weight: 600;
    color: ${COLORS.white};
    min-width: fit-content;
  }

  .principle-count {
    width: 80px;
    text-align: right;
    font-size: 14px;
    font-weight: 600;
    color: ${COLORS.gray700};
  }

  @media print {
    .page {
      width: 100%;
      min-height: auto;
      padding: 0;
      margin: 0;
    }
  }
`

export function getImpactBadgeClass(impact: string): string {
  return `badge badge-${impact}`
}

export function getViolationCardClass(impact: string): string {
  return `violation-card violation-${impact}`
}

export function getStatusBadgeClass(status: 'pass' | 'fail' | 'not_tested'): string {
  const classMap = {
    pass: 'badge-pass',
    fail: 'badge-fail',
    not_tested: 'badge-not-tested',
  }
  return `badge ${classMap[status]}`
}
