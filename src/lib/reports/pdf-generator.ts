/**
 * Gerador de PDF usando Playwright
 * Converte HTML para PDF de alta qualidade
 */

import { chromium, type Browser, type Page } from 'playwright'
import type { ReportData, ReportType } from './types'
import { renderExecutiveReport } from './templates/executive'
import { renderTechnicalReport } from './templates/technical'

interface PdfOptions {
  format?: 'A4' | 'Letter'
  landscape?: boolean
  margin?: {
    top?: string
    bottom?: string
    left?: string
    right?: string
  }
  printBackground?: boolean
  displayHeaderFooter?: boolean
  headerTemplate?: string
  footerTemplate?: string
}

const DEFAULT_OPTIONS: PdfOptions = {
  format: 'A4',
  landscape: false,
  margin: {
    top: '20mm',
    bottom: '25mm',
    left: '15mm',
    right: '15mm',
  },
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `
    <div style="font-size:9px;color:#6B7280;width:100%;text-align:center;padding:0 20mm;">
      Relatorio de Acessibilidade
    </div>
  `,
  footerTemplate: `
    <div style="font-size:9px;color:#6B7280;width:100%;display:flex;justify-content:space-between;padding:0 20mm;">
      <span>Gerado automaticamente</span>
      <span>Pagina <span class="pageNumber"></span> de <span class="totalPages"></span></span>
    </div>
  `,
}

let browserInstance: Browser | null = null

/**
 * Obtem ou cria instancia do browser
 */
async function getBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })
  }
  return browserInstance
}

/**
 * Fecha instancia do browser
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close()
    browserInstance = null
  }
}

/**
 * Gera PDF a partir de HTML string
 */
export async function generatePdfFromHtml(
  html: string,
  options: Partial<PdfOptions> = {}
): Promise<Buffer> {
  const browser = await getBrowser()
  const page = await browser.newPage()

  try {
    // Configurar viewport para A4
    await page.setViewportSize({
      width: 794, // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
    })

    // Carregar HTML
    await page.setContent(html, {
      waitUntil: 'networkidle',
    })

    // Aguardar fontes e imagens
    await page.evaluate(() => document.fonts.ready)

    // Mesclar opcoes
    const pdfOptions = { ...DEFAULT_OPTIONS, ...options }

    // Gerar PDF
    const pdfBuffer = await page.pdf({
      format: pdfOptions.format,
      landscape: pdfOptions.landscape,
      margin: pdfOptions.margin,
      printBackground: pdfOptions.printBackground,
      displayHeaderFooter: pdfOptions.displayHeaderFooter,
      headerTemplate: pdfOptions.headerTemplate,
      footerTemplate: pdfOptions.footerTemplate,
    })

    return Buffer.from(pdfBuffer)
  } finally {
    await page.close()
  }
}

/**
 * Gera PDF do relatorio executivo
 */
export async function generateExecutivePdf(data: ReportData): Promise<Buffer> {
  const html = renderExecutiveReport(data)
  return generatePdfFromHtml(html, {
    headerTemplate: `
      <div style="font-size:9px;color:#6B7280;width:100%;text-align:center;padding:0 20mm;">
        Relatorio Executivo - ${data.projectName}
      </div>
    `,
  })
}

/**
 * Gera PDF do relatorio tecnico
 */
export async function generateTechnicalPdf(data: ReportData): Promise<Buffer> {
  const html = renderTechnicalReport(data)
  return generatePdfFromHtml(html, {
    headerTemplate: `
      <div style="font-size:9px;color:#6B7280;width:100%;text-align:center;padding:0 20mm;">
        Relatorio Tecnico - ${data.projectName}
      </div>
    `,
  })
}

/**
 * Gera PDF baseado no tipo
 */
export async function generatePdf(
  data: ReportData,
  type: 'executive_pdf' | 'technical_pdf'
): Promise<Buffer> {
  switch (type) {
    case 'executive_pdf':
      return generateExecutivePdf(data)
    case 'technical_pdf':
      return generateTechnicalPdf(data)
    default:
      throw new Error(`Tipo de relatorio PDF nao suportado: ${type}`)
  }
}
