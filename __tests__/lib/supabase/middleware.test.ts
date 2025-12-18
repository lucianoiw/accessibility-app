import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// Use vi.hoisted to declare mocks that will be used in vi.mock
const { mockGetUser, mockSupabaseClient } = vi.hoisted(() => {
  const mockGetUser = vi.fn()
  return {
    mockGetUser,
    mockSupabaseClient: {
      auth: { getUser: mockGetUser },
    },
  }
})

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}))

import { updateSession } from '@/lib/supabase/middleware'

// Helper to create mock NextRequest
function createMockRequest(pathname: string, cookies: Record<string, string> = {}) {
  const url = new URL(`http://localhost:3000${pathname}`)
  const request = new NextRequest(url)

  // Mock cookies
  const cookieStore = {
    getAll: vi.fn(() =>
      Object.entries(cookies).map(([name, value]) => ({ name, value }))
    ),
    set: vi.fn(),
  }
  Object.defineProperty(request, 'cookies', {
    value: cookieStore,
    writable: true,
  })

  return request
}

describe('Supabase middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('protected routes', () => {
    it('redirects to login when user is not authenticated on /projects', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const request = createMockRequest('/projects')

      const response = await updateSession(request)

      expect(response.status).toBe(307) // Redirect status
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects to login when user is not authenticated on /settings', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const request = createMockRequest('/settings')

      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('redirects to login when user is not authenticated on /dashboard', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const request = createMockRequest('/dashboard')

      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/login')
    })

    it('allows authenticated user to access /projects', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } })
      const request = createMockRequest('/projects')

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('auth pages', () => {
    it('redirects authenticated user from /login to /projects', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } })
      const request = createMockRequest('/login')

      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/projects')
    })

    it('redirects authenticated user from /register to /projects', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } })
      const request = createMockRequest('/register')

      const response = await updateSession(request)

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toContain('/projects')
    })

    it('allows unauthenticated user to access /login', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const request = createMockRequest('/login')

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('allows unauthenticated user to access /register', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const request = createMockRequest('/register')

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })

  describe('public routes', () => {
    it('allows unauthenticated user to access public routes', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const request = createMockRequest('/')

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('allows authenticated user to access public routes', async () => {
      mockGetUser.mockResolvedValue({ data: { user: { id: '123' } } })
      const request = createMockRequest('/')

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })

    it('allows access to /api routes', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } })
      const request = createMockRequest('/api/health')

      const response = await updateSession(request)

      expect(response.status).toBe(200)
    })
  })
})
