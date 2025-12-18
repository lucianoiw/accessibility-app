import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to declare mocks that will be used in vi.mock
const { mockCreateBrowserClient } = vi.hoisted(() => ({
  mockCreateBrowserClient: vi.fn(() => ({
    auth: { getSession: vi.fn() },
    from: vi.fn(),
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

import { createClient } from '@/lib/supabase/client'

describe('Supabase browser client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls createBrowserClient with correct parameters', () => {
    createClient()

    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
  })

  it('returns a supabase client instance', () => {
    const client = createClient()

    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.from).toBeDefined()
  })

  it('creates a new client each time called', () => {
    createClient()
    createClient()

    expect(mockCreateBrowserClient).toHaveBeenCalledTimes(2)
  })
})
