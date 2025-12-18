/**
 * Modulo de geracao de relatorios
 */

// Tipos
export * from './types'

// Data builder
export { buildReportData, generateReportFileName } from './data-builder'

// PDF Generator
export {
  generatePdf,
  generateExecutivePdf,
  generateTechnicalPdf,
  generatePdfFromHtml,
  closeBrowser,
} from './pdf-generator'

// Templates (para uso interno)
export { renderExecutiveReport } from './templates/executive'
export { renderTechnicalReport } from './templates/technical'
