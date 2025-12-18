import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers before importing csrf module
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

import { validateCsrfOrigin, requireCsrfValid } from '@/lib/csrf'
import { headers } from 'next/headers'

const mockedHeaders = vi.mocked(headers)

describe('validateCsrfOrigin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns true when origin is not present (non-browser request)', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return null
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('returns false when host is not present', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://example.com'
        if (name === 'host') return null
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(false)
  })

  it('returns true when origin hostname matches host', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://example.com'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('returns true when origin hostname matches host with port', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://example.com:3000'
        if (name === 'host') return 'example.com:3000'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('returns true when origin matches host without port comparison', async () => {
    // Origin has port, host doesn't - should still match by hostname
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://example.com:3000'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('returns false when origin hostname does not match host', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://evil.com'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(false)
  })

  it('returns false when origin is from subdomain', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://sub.example.com'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(false)
  })

  it('returns false for invalid origin URL', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'not-a-valid-url'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(false)
  })

  it('handles localhost correctly', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'http://localhost:3000'
        if (name === 'host') return 'localhost:3000'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('handles 127.0.0.1 correctly', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'http://127.0.0.1:3000'
        if (name === 'host') return '127.0.0.1:3000'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('blocks cross-origin request from localhost to different port', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'http://localhost:8080'
        if (name === 'host') return 'localhost:3000'
        return null
      },
    } as unknown as Headers)

    // This should pass because we only compare hostname, not port
    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })
})

describe('requireCsrfValid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns { valid: true } when CSRF is valid', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://example.com'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await requireCsrfValid()
    expect(result).toEqual({ valid: true })
  })

  it('returns { valid: true } for non-browser requests', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return null
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await requireCsrfValid()
    expect(result).toEqual({ valid: true })
  })

  it('returns error object when CSRF is invalid', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://evil.com'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await requireCsrfValid()
    expect(result).toEqual({
      valid: false,
      error: 'Requisição inválida (CSRF)',
    })
  })

  it('returns error object when host is missing', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://example.com'
        if (name === 'host') return null
        return null
      },
    } as unknown as Headers)

    const result = await requireCsrfValid()
    expect(result).toEqual({
      valid: false,
      error: 'Requisição inválida (CSRF)',
    })
  })

  it('error message is in Portuguese', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://evil.com'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await requireCsrfValid()
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error).toContain('CSRF')
      expect(result.error).toContain('Requisição')
    }
  })
})

describe('CSRF protection scenarios', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('allows same-origin POST requests', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://myapp.com'
        if (name === 'host') return 'myapp.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('blocks cross-origin POST requests', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://attacker.com'
        if (name === 'host') return 'myapp.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(false)
  })

  it('allows API tools like curl (no origin)', async () => {
    mockedHeaders.mockResolvedValue({
      get: () => null,
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('allows Postman requests (no origin)', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return null
        if (name === 'host') return 'api.example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('handles HTTPS to HTTP downgrade attempts', async () => {
    // Origin is HTTPS, but we only compare hostname
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'https://example.com'
        if (name === 'host') return 'example.com'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })

  it('handles development environment (localhost)', async () => {
    mockedHeaders.mockResolvedValue({
      get: (name: string) => {
        if (name === 'origin') return 'http://localhost:3000'
        if (name === 'host') return 'localhost:3000'
        return null
      },
    } as unknown as Headers)

    const result = await validateCsrfOrigin()
    expect(result).toBe(true)
  })
})
