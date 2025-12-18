import { describe, it, expect, vi, beforeEach } from 'vitest'

// Use vi.hoisted to declare mocks that will be used in vi.mock
const { mockCreateServerClient, mockCookies } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({
    auth: { getSession: vi.fn(), getUser: vi.fn() },
    from: vi.fn(),
  })),
  mockCookies: {
    getAll: vi.fn(() => []),
    set: vi.fn(),
  },
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => mockCookies),
}))

import { createClient } from '@/lib/supabase/server'

describe('Supabase server client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls createServerClient with correct parameters', async () => {
    await createClient()

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    )
  })

  it('returns a supabase client instance', async () => {
    const client = await createClient()

    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
    expect(client.from).toBeDefined()
  })

  it('creates a new client each time called', async () => {
    await createClient()
    await createClient()

    expect(mockCreateServerClient).toHaveBeenCalledTimes(2)
  })

  it('provides getAll function that returns cookies', async () => {
    mockCookies.getAll.mockReturnValue([{ name: 'session', value: 'abc123' }])

    await createClient()

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies
    const allCookies = cookiesConfig.getAll()

    expect(allCookies).toEqual([{ name: 'session', value: 'abc123' }])
  })

  it('provides setAll function that sets cookies', async () => {
    await createClient()

    const cookiesConfig = mockCreateServerClient.mock.calls[0][2].cookies
    const cookiesToSet = [{ name: 'session', value: 'xyz789', options: { path: '/' } }]

    // This should not throw even in Server Component context
    expect(() => cookiesConfig.setAll(cookiesToSet)).not.toThrow()
  })
})
