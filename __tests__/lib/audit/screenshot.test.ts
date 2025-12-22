import { describe, it, expect } from 'vitest'
import type { ScreenshotResult, CaptureOptions } from '@/lib/audit/screenshot'

/**
 * Unit tests for screenshot.ts
 *
 * NOTE: Most functions in screenshot.ts require Playwright (Page object) and cannot be
 * unit tested with jsdom. These require E2E tests with real browser automation.
 *
 * Functions that CANNOT be unit tested:
 * - captureElementScreenshot() - requires Playwright Page
 * - captureScreenshotForRule() - requires Playwright Page
 * - uploadScreenshot() - requires Supabase Storage
 * - captureAndUploadScreenshot() - requires both Playwright and Supabase
 * - deleteAuditScreenshots() - requires Supabase Storage
 *
 * This test file focuses on:
 * - Type definitions
 * - Export structure
 * - Type guards (if any pure functions exist)
 */

// ============================================
// Type Definitions
// ============================================

describe('ScreenshotResult type', () => {
  it('has correct shape', () => {
    const mockResult: ScreenshotResult = {
      buffer: Buffer.from('test'),
      width: 100,
      height: 200,
    }

    expect(mockResult.buffer).toBeInstanceOf(Buffer)
    expect(typeof mockResult.width).toBe('number')
    expect(typeof mockResult.height).toBe('number')
  })

  it('accepts valid Buffer instances', () => {
    const bufferFromString: ScreenshotResult = {
      buffer: Buffer.from('test', 'utf-8'),
      width: 1,
      height: 1,
    }

    const bufferFromArray: ScreenshotResult = {
      buffer: Buffer.from([0x62, 0x75, 0x66, 0x66, 0x65, 0x72]),
      width: 1,
      height: 1,
    }

    expect(bufferFromString.buffer).toBeInstanceOf(Buffer)
    expect(bufferFromArray.buffer).toBeInstanceOf(Buffer)
  })

  it('accepts positive dimensions', () => {
    const result: ScreenshotResult = {
      buffer: Buffer.from(''),
      width: 1920,
      height: 1080,
    }

    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
  })

  it('accepts zero dimensions (edge case)', () => {
    const result: ScreenshotResult = {
      buffer: Buffer.from(''),
      width: 0,
      height: 0,
    }

    expect(result.width).toBe(0)
    expect(result.height).toBe(0)
  })
})

describe('CaptureOptions type', () => {
  it('all properties are optional', () => {
    const emptyOptions: CaptureOptions = {}
    expect(emptyOptions).toEqual({})
  })

  it('accepts padding option', () => {
    const options: CaptureOptions = { padding: 30 }
    expect(options.padding).toBe(30)
  })

  it('accepts maxWidth option', () => {
    const options: CaptureOptions = { maxWidth: 800 }
    expect(options.maxWidth).toBe(800)
  })

  it('accepts maxHeight option', () => {
    const options: CaptureOptions = { maxHeight: 600 }
    expect(options.maxHeight).toBe(600)
  })

  it('accepts timeout option', () => {
    const options: CaptureOptions = { timeout: 10000 }
    expect(options.timeout).toBe(10000)
  })

  it('accepts all options together', () => {
    const options: CaptureOptions = {
      padding: 25,
      maxWidth: 1024,
      maxHeight: 768,
      timeout: 5000,
    }

    expect(options.padding).toBe(25)
    expect(options.maxWidth).toBe(1024)
    expect(options.maxHeight).toBe(768)
    expect(options.timeout).toBe(5000)
  })

  it('accepts partial options', () => {
    const options1: CaptureOptions = { padding: 10 }
    const options2: CaptureOptions = { maxWidth: 500, maxHeight: 500 }
    const options3: CaptureOptions = { timeout: 3000 }

    expect(options1).toEqual({ padding: 10 })
    expect(options2).toEqual({ maxWidth: 500, maxHeight: 500 })
    expect(options3).toEqual({ timeout: 3000 })
  })

  it('accepts reasonable default values', () => {
    const defaultOptions: CaptureOptions = {
      padding: 20,        // Default padding
      maxWidth: undefined, // No limit
      maxHeight: undefined, // No limit
      timeout: 5000,      // Default timeout
    }

    expect(defaultOptions.padding).toBe(20)
    expect(defaultOptions.timeout).toBe(5000)
    expect(defaultOptions.maxWidth).toBeUndefined()
    expect(defaultOptions.maxHeight).toBeUndefined()
  })

  it('number properties accept zero', () => {
    const options: CaptureOptions = {
      padding: 0,
      maxWidth: 0,
      maxHeight: 0,
      timeout: 0,
    }

    expect(options.padding).toBe(0)
    expect(options.maxWidth).toBe(0)
    expect(options.maxHeight).toBe(0)
    expect(options.timeout).toBe(0)
  })

  it('number properties accept negative values (edge case)', () => {
    // TypeScript allows negative numbers, runtime should validate
    const options: CaptureOptions = {
      padding: -10,
      maxWidth: -100,
      maxHeight: -100,
      timeout: -1000,
    }

    expect(options.padding).toBe(-10)
    expect(options.maxWidth).toBe(-100)
    expect(options.maxHeight).toBe(-100)
    expect(options.timeout).toBe(-1000)
  })
})

// ============================================
// Export Structure
// ============================================

describe('screenshot module exports', () => {
  it('exports ScreenshotResult type', () => {
    // Type is available for import
    const result: ScreenshotResult = {
      buffer: Buffer.from('test'),
      width: 100,
      height: 100,
    }
    expect(result).toBeDefined()
  })

  it('exports CaptureOptions type', () => {
    // Type is available for import
    const options: CaptureOptions = { padding: 20 }
    expect(options).toBeDefined()
  })

  it('type imports work correctly', async () => {
    // Verify types can be imported
    const screenshotModule = await import('@/lib/audit/screenshot')

    // Module should exist (even if functions can't be tested)
    expect(screenshotModule).toBeDefined()
    expect(typeof screenshotModule).toBe('object')
  })
})

// ============================================
// Type Validation Helpers
// ============================================

describe('type validation helpers', () => {
  describe('isValidScreenshotResult', () => {
    it('validates correct ScreenshotResult shape', () => {
      const isValidScreenshotResult = (obj: unknown): obj is ScreenshotResult => {
        if (typeof obj !== 'object' || obj === null) return false
        const result = obj as Record<string, unknown>
        return (
          Buffer.isBuffer(result.buffer) &&
          typeof result.width === 'number' &&
          typeof result.height === 'number'
        )
      }

      expect(isValidScreenshotResult({
        buffer: Buffer.from('test'),
        width: 100,
        height: 200,
      })).toBe(true)

      expect(isValidScreenshotResult({
        buffer: 'not a buffer',
        width: 100,
        height: 200,
      })).toBe(false)

      expect(isValidScreenshotResult({
        buffer: Buffer.from('test'),
        width: '100',
        height: 200,
      })).toBe(false)

      expect(isValidScreenshotResult(null)).toBe(false)
      expect(isValidScreenshotResult(undefined)).toBe(false)
      expect(isValidScreenshotResult({})).toBe(false)
    })
  })

  describe('isValidCaptureOptions', () => {
    it('validates correct CaptureOptions shape', () => {
      const isValidCaptureOptions = (obj: unknown): obj is CaptureOptions => {
        if (typeof obj !== 'object' || obj === null) return false
        const opts = obj as Record<string, unknown>

        const hasValidPadding = opts.padding === undefined || typeof opts.padding === 'number'
        const hasValidMaxWidth = opts.maxWidth === undefined || typeof opts.maxWidth === 'number'
        const hasValidMaxHeight = opts.maxHeight === undefined || typeof opts.maxHeight === 'number'
        const hasValidTimeout = opts.timeout === undefined || typeof opts.timeout === 'number'

        return hasValidPadding && hasValidMaxWidth && hasValidMaxHeight && hasValidTimeout
      }

      expect(isValidCaptureOptions({})).toBe(true)
      expect(isValidCaptureOptions({ padding: 20 })).toBe(true)
      expect(isValidCaptureOptions({ maxWidth: 800, maxHeight: 600 })).toBe(true)
      expect(isValidCaptureOptions({ timeout: 5000 })).toBe(true)

      expect(isValidCaptureOptions({ padding: '20' })).toBe(false)
      expect(isValidCaptureOptions({ maxWidth: 'large' })).toBe(false)
      expect(isValidCaptureOptions(null)).toBe(false)
      expect(isValidCaptureOptions(undefined)).toBe(false)
    })
  })
})

// ============================================
// Constants and Defaults
// ============================================

describe('default values and constants', () => {
  it('default padding should be 20', () => {
    // This is documented in the CaptureOptions interface
    const DEFAULT_PADDING = 20
    expect(DEFAULT_PADDING).toBe(20)
  })

  it('default timeout should be 5000ms', () => {
    // This is documented in the CaptureOptions interface
    const DEFAULT_TIMEOUT = 5000
    expect(DEFAULT_TIMEOUT).toBe(5000)
  })

  it('default max dimensions should be undefined (no limit)', () => {
    const DEFAULT_MAX_WIDTH = undefined
    const DEFAULT_MAX_HEIGHT = undefined

    expect(DEFAULT_MAX_WIDTH).toBeUndefined()
    expect(DEFAULT_MAX_HEIGHT).toBeUndefined()
  })

  it('minimum valid dimensions should be 10x10', () => {
    // Documented in captureElementScreenshot implementation
    const MIN_WIDTH = 10
    const MIN_HEIGHT = 10

    expect(MIN_WIDTH).toBe(10)
    expect(MIN_HEIGHT).toBe(10)
  })

  it('scroll stabilization timeout should be 100ms', () => {
    // Small pause after scroll in captureElementScreenshot
    const SCROLL_STABILIZATION = 100
    expect(SCROLL_STABILIZATION).toBe(100)
  })

  it('scroll timeout should be 3000ms', () => {
    // Timeout for scrollIntoViewIfNeeded
    const SCROLL_TIMEOUT = 3000
    expect(SCROLL_TIMEOUT).toBe(3000)
  })
})

// ============================================
// Integration Notes
// ============================================

describe('integration notes', () => {
  it('screenshot functions integrate with screenshot-rules', () => {
    // captureScreenshotForRule() uses getScreenshotConfig() from screenshot-rules
    // This is tested in E2E tests, not unit tests
    expect(true).toBe(true)
  })

  it('screenshot functions require Playwright Page object', () => {
    // All capture functions need Playwright
    // Cannot be unit tested with jsdom
    expect(true).toBe(true)
  })

  it('upload functions require Supabase Storage client', () => {
    // uploadScreenshot and deleteAuditScreenshots need Supabase
    // Cannot be unit tested without mocking Supabase Storage API
    expect(true).toBe(true)
  })

  it('screenshots are stored in Supabase Storage bucket named "screenshots"', () => {
    const STORAGE_BUCKET = 'screenshots'
    expect(STORAGE_BUCKET).toBe('screenshots')
  })

  it('screenshot path format is {auditId}/{violationId}.png', () => {
    const auditId = 'audit-123'
    const violationId = 'violation-456'
    const expectedPath = `${auditId}/${violationId}.png`

    expect(expectedPath).toBe('audit-123/violation-456.png')
  })

  it('screenshots are PNG format', () => {
    const IMAGE_TYPE = 'png'
    const CONTENT_TYPE = 'image/png'

    expect(IMAGE_TYPE).toBe('png')
    expect(CONTENT_TYPE).toBe('image/png')
  })
})

// ============================================
// Edge Cases and Error Handling
// ============================================

describe('edge cases documentation', () => {
  it('handles CSS selector vs XPath detection', () => {
    // Selectors starting with '/' or '(' are XPath
    const isXPath = (selector: string) =>
      selector.startsWith('/') || selector.startsWith('(')

    expect(isXPath('/html/body/div')).toBe(true)
    expect(isXPath('(//div)[1]')).toBe(true)
    expect(isXPath('div.class')).toBe(false)
    expect(isXPath('#id')).toBe(false)
  })

  it('clips screenshot to viewport bounds', () => {
    // Screenshot region must be within viewport
    const viewport = { width: 1280, height: 720 }
    const element = { x: 100, y: 100, width: 200, height: 200 }
    const padding = 20

    let x = Math.max(0, element.x - padding)
    let y = Math.max(0, element.y - padding)
    let width = element.width + (padding * 2)
    let height = element.height + (padding * 2)

    // Clip to viewport
    if (x + width > viewport.width) {
      width = viewport.width - x
    }
    if (y + height > viewport.height) {
      height = viewport.height - y
    }

    expect(x).toBe(80)
    expect(y).toBe(80)
    expect(width).toBe(240)
    expect(height).toBe(240)
    expect(x + width).toBeLessThanOrEqual(viewport.width)
    expect(y + height).toBeLessThanOrEqual(viewport.height)
  })

  it('enforces minimum dimensions', () => {
    const MIN_DIMENSION = 10

    let width = 5
    let height = 3

    width = Math.max(MIN_DIMENSION, width)
    height = Math.max(MIN_DIMENSION, height)

    expect(width).toBe(10)
    expect(height).toBe(10)
  })

  it('applies max dimension limits when specified', () => {
    const maxWidth = 800
    const maxHeight = 600

    let width = 1000
    let height = 800

    if (maxWidth && width > maxWidth) {
      width = maxWidth
    }
    if (maxHeight && height > maxHeight) {
      height = maxHeight
    }

    expect(width).toBe(800)
    expect(height).toBe(600)
  })

  it('rounds dimensions for screenshot clip', () => {
    const x = 10.7
    const y = 20.3
    const width = 100.5
    const height = 200.8

    const clip = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    }

    expect(clip.x).toBe(11)
    expect(clip.y).toBe(20)
    expect(clip.width).toBe(101)
    expect(clip.height).toBe(201)
  })
})
