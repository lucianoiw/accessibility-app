import { http, HttpResponse } from 'msw'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'

export const handlers = [
  // Mock Supabase auth - get user
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'user-123',
      email: 'test@example.com',
      aud: 'authenticated',
      role: 'authenticated',
    })
  }),

  // Mock Supabase projects table
  http.get(`${SUPABASE_URL}/rest/v1/projects`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id === 'eq.valid-project') {
      return HttpResponse.json([
        {
          id: 'valid-project',
          user_id: 'user-123',
          name: 'Test Project',
          base_url: 'https://example.com',
          default_wcag_levels: ['A', 'AA'],
          default_max_pages: 50,
        },
      ])
    }

    return HttpResponse.json([])
  }),

  // Mock Supabase audits table - POST
  http.post(`${SUPABASE_URL}/rest/v1/audits`, () => {
    return HttpResponse.json([
      {
        id: 'audit-123',
        project_id: 'valid-project',
        status: 'CRAWLING',
        started_at: new Date().toISOString(),
      },
    ])
  }),

  // Mock Supabase audits table - GET
  http.get(`${SUPABASE_URL}/rest/v1/audits`, ({ request }) => {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')

    if (id === 'eq.audit-123') {
      return HttpResponse.json([
        {
          id: 'audit-123',
          project_id: 'valid-project',
          status: 'COMPLETED',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          summary: {
            total: 10,
            critical: 2,
            serious: 3,
            moderate: 3,
            minor: 2,
          },
        },
      ])
    }

    return HttpResponse.json([])
  }),

  // Mock Supabase aggregated_violations table
  http.get(`${SUPABASE_URL}/rest/v1/aggregated_violations`, () => {
    return HttpResponse.json([
      {
        id: 'violation-1',
        audit_id: 'audit-123',
        rule_id: 'color-contrast',
        impact: 'serious',
        wcag_tags: ['wcag2aa', 'wcag143'],
        occurrences: 5,
        pages_affected: 3,
        status: 'open',
      },
    ])
  }),

  // Mock Trigger.dev task trigger
  http.post('https://api.trigger.dev/api/v1/tasks/trigger', () => {
    return HttpResponse.json({
      id: 'trigger-456',
      status: 'pending',
    })
  }),

  // Mock internal API routes
  http.post('/api/audits', () => {
    return HttpResponse.json({
      auditId: 'audit-123',
      triggerId: 'trigger-456',
    })
  }),

  http.post('/api/violations/:id/verify', () => {
    return HttpResponse.json({
      success: true,
      remaining: 3,
      fixed: 2,
    })
  }),

  http.post('/api/violations/:id/suggest', () => {
    return HttpResponse.json({
      suggestion: {
        explanation: 'This element needs better color contrast.',
        fixedHtml: '<button class="btn-high-contrast">Click me</button>',
      },
    })
  }),
]
