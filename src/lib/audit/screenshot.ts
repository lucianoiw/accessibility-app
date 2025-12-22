import type { Page } from 'playwright'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getScreenshotConfig } from './screenshot-rules'

// ========================================
// CONSTANTES DE SEGURANÇA
// ========================================

/** Regex para validar UUID v4 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Largura máxima global do screenshot (previne DoS/OOM) */
const MAX_SCREENSHOT_WIDTH = 2000

/** Altura máxima global do screenshot (previne DoS/OOM) */
const MAX_SCREENSHOT_HEIGHT = 2000

/** Máximo de pixels total (4 megapixels = ~16MB PNG no pior caso) */
const MAX_SCREENSHOT_PIXELS = 4_000_000

/** Dimensão mínima do screenshot */
const MIN_SCREENSHOT_DIMENSION = 10

/** Tempo de estabilização do scroll em ms */
const SCROLL_STABILIZATION_MS = 100

/** Timeout padrão para localizar elemento em ms */
const DEFAULT_ELEMENT_TIMEOUT_MS = 5000

/** Padding padrão ao redor do elemento */
const DEFAULT_PADDING = 20

/**
 * Valida se string é um UUID v4 válido
 */
function isValidUUID(str: string): boolean {
  return UUID_REGEX.test(str)
}

/**
 * Resultado da captura de screenshot
 */
export interface ScreenshotResult {
  buffer: Buffer
  width: number
  height: number
}

/**
 * Opções para captura de screenshot
 */
export interface CaptureOptions {
  /** Pixels de respiro ao redor do elemento (default: 20) */
  padding?: number
  /** Largura máxima do screenshot (default: 2000) */
  maxWidth?: number
  /** Altura máxima do screenshot (default: 2000) */
  maxHeight?: number
  /** Timeout em ms para localizar elemento (default: 5000) */
  timeout?: number
}

/**
 * Captura screenshot de um elemento com padding (respiro)
 *
 * @param page - Página do Playwright
 * @param selector - Seletor CSS ou XPath do elemento
 * @param options - Opções de captura
 * @returns Buffer da imagem PNG ou null se elemento não encontrado
 */
export async function captureElementScreenshot(
  page: Page,
  selector: string,
  options: CaptureOptions = {}
): Promise<ScreenshotResult | null> {
  const {
    padding = DEFAULT_PADDING,
    maxWidth = MAX_SCREENSHOT_WIDTH,
    maxHeight = MAX_SCREENSHOT_HEIGHT,
    timeout = DEFAULT_ELEMENT_TIMEOUT_MS,
  } = options

  try {
    // Determinar se é XPath ou CSS selector
    const isXPath = selector.startsWith('/') || selector.startsWith('(')

    // Localizar elemento
    const locator = isXPath
      ? page.locator(`xpath=${selector}`)
      : page.locator(selector)

    // Esperar elemento existir no DOM
    await locator.first().waitFor({ state: 'attached', timeout })

    // Fazer scroll até o elemento para garantir que está visível
    await locator.first().scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {
      // Ignora erro se scroll falhar - tentaremos capturar mesmo assim
    })

    // Pequena pausa para o scroll estabilizar
    await page.waitForTimeout(SCROLL_STABILIZATION_MS)

    // Obter bounding box do elemento
    const box = await locator.first().boundingBox()

    if (!box) {
      console.warn(`[Screenshot] Elemento não tem bounding box: ${selector}`)
      return null
    }

    // Verificar se elemento tem dimensões válidas
    if (box.width <= 0 || box.height <= 0) {
      console.warn(`[Screenshot] Elemento com dimensões inválidas: ${selector} (${box.width}x${box.height})`)
      return null
    }

    // Obter dimensões da viewport
    const viewport = page.viewportSize() || { width: 1280, height: 720 }

    // Calcular região do screenshot com padding
    let x = Math.max(0, box.x - padding)
    let y = Math.max(0, box.y - padding)
    let width = box.width + (padding * 2)
    let height = box.height + (padding * 2)

    // Limitar ao viewport (elemento deve estar visível após scroll)
    if (x + width > viewport.width) {
      width = viewport.width - x
    }
    if (y + height > viewport.height) {
      height = viewport.height - y
    }

    // Verificar se temos área válida para capturar
    if (width <= 0 || height <= 0) {
      console.warn(`[Screenshot] Área de captura inválida após ajustes: ${selector}`)
      return null
    }

    // Aplicar limites máximos (SEGURANÇA: previne DoS/OOM)
    width = Math.min(width, maxWidth)
    height = Math.min(height, maxHeight)

    // Prevenir memory bombs - limitar pixels totais
    if (width * height > MAX_SCREENSHOT_PIXELS) {
      const ratio = Math.sqrt(MAX_SCREENSHOT_PIXELS / (width * height))
      width = Math.floor(width * ratio)
      height = Math.floor(height * ratio)
      console.warn(`[Screenshot] Downscaled oversized screenshot to ${width}x${height}`)
    }

    // Garantir dimensões mínimas
    width = Math.max(MIN_SCREENSHOT_DIMENSION, width)
    height = Math.max(MIN_SCREENSHOT_DIMENSION, height)

    // Garantir que as coordenadas estão dentro da página
    x = Math.max(0, Math.min(x, viewport.width - MIN_SCREENSHOT_DIMENSION))
    y = Math.max(0, Math.min(y, viewport.height - MIN_SCREENSHOT_DIMENSION))

    // Capturar screenshot da região
    const buffer = await page.screenshot({
      type: 'png',
      clip: {
        x: Math.round(x),
        y: Math.round(y),
        width: Math.round(width),
        height: Math.round(height),
      },
    })

    return {
      buffer: Buffer.from(buffer),
      width: Math.round(width),
      height: Math.round(height),
    }
  } catch (error) {
    // Erro comum: elemento não encontrado ou não visível
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[Screenshot] Erro ao capturar ${selector}: ${message}`)
    return null
  }
}

/**
 * Captura screenshot para uma regra específica usando configuração padrão
 *
 * @param page - Página do Playwright
 * @param selector - Seletor do elemento
 * @param ruleId - ID da regra (para obter configuração específica)
 * @returns Buffer da imagem PNG ou null
 */
export async function captureScreenshotForRule(
  page: Page,
  selector: string,
  ruleId: string
): Promise<ScreenshotResult | null> {
  const config = getScreenshotConfig(ruleId)
  return captureElementScreenshot(page, selector, config)
}

/**
 * Faz upload de screenshot para Supabase Storage
 *
 * @param supabase - Cliente Supabase (admin)
 * @param auditId - ID da auditoria (deve ser UUID válido)
 * @param violationId - ID da violação agregada (deve ser UUID válido)
 * @param buffer - Buffer da imagem PNG
 * @returns URL pública do screenshot
 * @throws Error se IDs não forem UUIDs válidos (previne path traversal)
 */
export async function uploadScreenshot(
  supabase: SupabaseClient,
  auditId: string,
  violationId: string,
  buffer: Buffer
): Promise<string> {
  // SEGURANÇA: Validar UUIDs para prevenir path traversal (CWE-22)
  if (!isValidUUID(auditId)) {
    throw new Error(`Invalid auditId format: must be a valid UUID`)
  }
  if (!isValidUUID(violationId)) {
    throw new Error(`Invalid violationId format: must be a valid UUID`)
  }

  const storagePath = `${auditId}/${violationId}.png`

  const { error: uploadError } = await supabase.storage
    .from('screenshots')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true, // Substituir se já existir
    })

  if (uploadError) {
    throw new Error(`Erro ao fazer upload do screenshot: ${uploadError.message}`)
  }

  // Obter URL pública
  const { data: urlData } = supabase.storage
    .from('screenshots')
    .getPublicUrl(storagePath)

  return urlData.publicUrl
}

/**
 * Captura e faz upload de screenshot em uma única operação
 *
 * @param page - Página do Playwright
 * @param supabase - Cliente Supabase (admin)
 * @param auditId - ID da auditoria
 * @param violationId - ID da violação agregada
 * @param selector - Seletor do elemento
 * @param ruleId - ID da regra
 * @returns URL pública ou null se falhar
 */
export async function captureAndUploadScreenshot(
  page: Page,
  supabase: SupabaseClient,
  auditId: string,
  violationId: string,
  selector: string,
  ruleId: string
): Promise<string | null> {
  try {
    const result = await captureScreenshotForRule(page, selector, ruleId)

    if (!result) {
      return null
    }

    const url = await uploadScreenshot(supabase, auditId, violationId, result.buffer)
    return url
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[Screenshot] Erro ao capturar/upload para ${violationId}: ${message}`)
    return null
  }
}

/**
 * Deleta screenshots de uma auditoria
 * Útil para limpeza ao deletar auditoria
 *
 * @param supabase - Cliente Supabase (admin)
 * @param auditId - ID da auditoria (deve ser UUID válido)
 */
export async function deleteAuditScreenshots(
  supabase: SupabaseClient,
  auditId: string
): Promise<void> {
  // SEGURANÇA: Validar UUID para prevenir path traversal
  if (!isValidUUID(auditId)) {
    console.warn(`[Screenshot] Invalid auditId format, skipping delete: ${auditId}`)
    return
  }

  try {
    // Listar todos os arquivos da auditoria
    const { data: files } = await supabase.storage
      .from('screenshots')
      .list(auditId)

    if (files && files.length > 0) {
      const paths = files.map(f => `${auditId}/${f.name}`)
      await supabase.storage
        .from('screenshots')
        .remove(paths)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[Screenshot] Erro ao deletar screenshots da auditoria ${auditId}: ${message}`)
  }
}
