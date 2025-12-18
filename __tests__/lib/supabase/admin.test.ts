import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Use vi.hoisted to declare mocks that will be used in vi.mock
const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: mockCreateClient,
}))

import { createAdminClient } from '@/lib/supabase/admin'

describe('Supabase admin client', () => {
  const originalEnv = process.env.SUPABASE_SERVICE_ROLE_KEY

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
  })

  afterEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalEnv
  })

  it('calls createClient with correct parameters', () => {
    createAdminClient()

    expect(mockCreateClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-service-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  })

  it('returns a supabase admin client instance', () => {
    const client = createAdminClient()

    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.from).toBeDefined()
  })

  it('throws error when SUPABASE_SERVICE_ROLE_KEY is not set', () => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = ''

    expect(() => createAdminClient()).toThrow('SUPABASE_SERVICE_ROLE_KEY não configurada')
  })

  it('creates a new client each time called', () => {
    createAdminClient()
    createAdminClient()

    expect(mockCreateClient).toHaveBeenCalledTimes(2)
  })

  it('configures client to not auto-refresh tokens', () => {
    createAdminClient()

    const options = mockCreateClient.mock.calls[0][2]
    expect(options.auth.autoRefreshToken).toBe(false)
  })

  it('configures client to not persist session', () => {
    createAdminClient()

    const options = mockCreateClient.mock.calls[0][2]
    expect(options.auth.persistSession).toBe(false)
  })
})
