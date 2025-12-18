import { describe, it, expect } from 'vitest'
import {
  CreateAuditSchema,
  AuthConfigSchema,
  SubdomainPolicySchema,
  UpdateViolationStatusSchema,
  validateInput,
} from '@/lib/validations'

// ============================================
// CreateAuditSchema
// ============================================

describe('CreateAuditSchema', () => {
  // CreateAuditSchema v3 only accepts projectId (config comes from project)
  describe('valid inputs', () => {
    it('accepts valid projectId', () => {
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
      }
      const result = CreateAuditSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts valid projectId with extra fields (ignored)', () => {
      const input = {
        projectId: '123e4567-e89b-12d3-a456-426614174000',
        extraField: 'ignored',
      }
      const result = CreateAuditSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects invalid UUID', () => {
      const input = {
        projectId: 'not-a-uuid',
      }
      const result = CreateAuditSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('UUID')
      }
    })

    it('rejects missing projectId', () => {
      const input = {}
      const result = CreateAuditSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty projectId', () => {
      const input = { projectId: '' }
      const result = CreateAuditSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects null projectId', () => {
      const input = { projectId: null }
      const result = CreateAuditSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// AuthConfigSchema (Discriminated Union)
// ============================================

describe('AuthConfigSchema', () => {
  describe('type: none', () => {
    it('accepts valid none config', () => {
      const input = { type: 'none' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts none with extra fields stripped', () => {
      const input = { type: 'none', extra: 'field' }
      const result = AuthConfigSchema.safeParse(input)
      // Discriminated unions are strict about shape
      expect(result.success).toBe(true)
    })
  })

  describe('type: bearer', () => {
    it('accepts valid bearer token', () => {
      const input = {
        type: 'bearer',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
      }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects token too short (< 10 chars)', () => {
      const input = { type: 'bearer', token: 'short' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('curto')
      }
    })

    it('rejects token too long (> 2048 chars)', () => {
      const input = { type: 'bearer', token: 'x'.repeat(2049) }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('longo')
      }
    })

    it('rejects token with newlines', () => {
      const input = { type: 'bearer', token: 'valid-token\nwith-newline' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('quebras de linha')
      }
    })

    it('rejects token with carriage return', () => {
      const input = { type: 'bearer', token: 'valid-token\rwith-return' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects bearer without token', () => {
      const input = { type: 'bearer' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('type: cookie', () => {
    it('accepts valid cookies string', () => {
      const input = {
        type: 'cookie',
        cookies: 'session=abc123; user=john; token=xyz789',
      }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects cookies too short (< 5 chars)', () => {
      const input = { type: 'cookie', cookies: 'a=b' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('curto')
      }
    })

    it('rejects cookies too long (> 4096 chars)', () => {
      const input = { type: 'cookie', cookies: 'session=' + 'x'.repeat(4100) }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('longo')
      }
    })

    it('rejects cookies with newlines', () => {
      const input = { type: 'cookie', cookies: 'session=abc\nuser=john' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects cookie without cookies field', () => {
      const input = { type: 'cookie' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('invalid discriminator', () => {
    it('rejects unknown type', () => {
      const input = { type: 'basic', username: 'user', password: 'pass' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing type', () => {
      const input = { token: 'some-token' }
      const result = AuthConfigSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// SubdomainPolicySchema
// ============================================

describe('SubdomainPolicySchema', () => {
  describe('main_only policy', () => {
    it('accepts main_only without subdomains', () => {
      const input = { subdomainPolicy: 'main_only' }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts main_only with null subdomains', () => {
      const input = { subdomainPolicy: 'main_only', allowedSubdomains: null }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('all_subdomains policy', () => {
    it('accepts all_subdomains without subdomains list', () => {
      const input = { subdomainPolicy: 'all_subdomains' }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('specific policy', () => {
    it('accepts specific with valid subdomains', () => {
      const input = {
        subdomainPolicy: 'specific',
        allowedSubdomains: ['blog', 'docs', 'api'],
      }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('rejects specific without subdomains', () => {
      const input = { subdomainPolicy: 'specific' }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('obrigatória')
      }
    })

    it('rejects specific with empty subdomains array', () => {
      const input = { subdomainPolicy: 'specific', allowedSubdomains: [] }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects specific with null subdomains', () => {
      const input = { subdomainPolicy: 'specific', allowedSubdomains: null }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('subdomain format validation', () => {
    it('accepts valid subdomain formats', () => {
      const validSubdomains = ['blog', 'docs', 'api-v2', 'my-app', 'app1', 'a']
      for (const subdomain of validSubdomains) {
        const input = {
          subdomainPolicy: 'specific',
          allowedSubdomains: [subdomain],
        }
        const result = SubdomainPolicySchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('rejects subdomain with protocol', () => {
      const input = {
        subdomainPolicy: 'specific',
        allowedSubdomains: ['https://blog'],
      }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects subdomain with dots', () => {
      const input = {
        subdomainPolicy: 'specific',
        allowedSubdomains: ['sub.domain'],
      }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects subdomain starting with hyphen', () => {
      const input = {
        subdomainPolicy: 'specific',
        allowedSubdomains: ['-invalid'],
      }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects subdomain ending with hyphen', () => {
      const input = {
        subdomainPolicy: 'specific',
        allowedSubdomains: ['invalid-'],
      }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects empty subdomain', () => {
      const input = {
        subdomainPolicy: 'specific',
        allowedSubdomains: [''],
      }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects too many subdomains (> 50)', () => {
      const input = {
        subdomainPolicy: 'specific',
        allowedSubdomains: Array.from({ length: 51 }, (_, i) => `sub${i}`),
      }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('invalid policy', () => {
    it('rejects unknown policy type', () => {
      const input = { subdomainPolicy: 'some_unknown_policy' }
      const result = SubdomainPolicySchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// UpdateViolationStatusSchema
// ============================================

describe('UpdateViolationStatusSchema', () => {
  describe('valid inputs', () => {
    it('accepts valid status without notes', () => {
      const statuses = ['open', 'in_progress', 'fixed', 'ignored', 'false_positive']
      for (const status of statuses) {
        const input = { status }
        const result = UpdateViolationStatusSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('accepts status with notes', () => {
      const input = {
        status: 'fixed',
        resolution_notes: 'Fixed by updating color contrast',
      }
      const result = UpdateViolationStatusSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('accepts empty notes', () => {
      const input = {
        status: 'fixed',
        resolution_notes: '',
      }
      const result = UpdateViolationStatusSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })

  describe('invalid inputs', () => {
    it('rejects unknown status', () => {
      const input = { status: 'unknown_status' }
      const result = UpdateViolationStatusSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects notes too long (> 1000 chars)', () => {
      const input = {
        status: 'fixed',
        resolution_notes: 'x'.repeat(1001),
      }
      const result = UpdateViolationStatusSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('rejects missing status', () => {
      const input = { resolution_notes: 'Some notes' }
      const result = UpdateViolationStatusSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

// ============================================
// validateInput Helper
// ============================================

describe('validateInput', () => {
  it('returns success with parsed data on valid input', () => {
    const input = {
      projectId: '123e4567-e89b-12d3-a456-426614174000',
    }
    const result = validateInput(CreateAuditSchema, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual(input)
    }
  })

  it('returns formatted error on invalid input', () => {
    const input = {
      projectId: 'invalid-uuid',
    }
    const result = validateInput(CreateAuditSchema, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toContain('UUID')
      expect(result.details).toBeDefined()
    }
  })

  it('returns first error message', () => {
    const input = {
      projectId: 'invalid',
      wcagLevels: [],
      maxPages: 0,
    }
    const result = validateInput(CreateAuditSchema, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      // Should return first error (projectId UUID error)
      expect(typeof result.error).toBe('string')
      expect(result.error.length).toBeGreaterThan(0)
    }
  })

  it('includes flattened error details', () => {
    const input = {
      projectId: 'invalid',
      wcagLevels: ['A'],
      maxPages: 50,
    }
    const result = validateInput(CreateAuditSchema, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.details).toBeDefined()
      expect(result.details).toHaveProperty('fieldErrors')
    }
  })

  it('works with different schemas', () => {
    // Test with AuthConfigSchema
    const validAuth = { type: 'none' }
    const authResult = validateInput(AuthConfigSchema, validAuth)
    expect(authResult.success).toBe(true)

    // Test with UpdateViolationStatusSchema
    const validStatus = { status: 'fixed' }
    const statusResult = validateInput(UpdateViolationStatusSchema, validStatus)
    expect(statusResult.success).toBe(true)
  })
})
