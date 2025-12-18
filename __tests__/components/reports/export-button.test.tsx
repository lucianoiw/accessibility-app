import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock next-intl and navigation
const { mockUseTranslations } = vi.hoisted(() => ({
  mockUseTranslations: vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`),
}))

vi.mock('next-intl', () => ({
  useTranslations: mockUseTranslations,
}))

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { ExportButton } from '@/components/reports/export-button'

describe('ExportButton', () => {
  let fetchMock: any

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('rendering', () => {
    it('renders export button', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ reports: [] }),
      })

      render(<ExportButton auditId="audit-123" />)

      const button = screen.getByRole('button', { name: /ExportButton.export/i })
      expect(button).toBeInTheDocument()
    })

    it('renders button with download icon', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ reports: [] }),
      })

      render(<ExportButton auditId="audit-123" />)

      const icon = document.querySelector('.lucide-download')
      expect(icon).toBeInTheDocument()
    })

    it('disables button when disabled prop is true', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ reports: [] }),
      })

      render(<ExportButton auditId="audit-123" disabled={true} />)

      const button = screen.getByRole('button', { name: /ExportButton.export/i })
      expect(button).toBeDisabled()
    })
  })

  describe('fetching reports', () => {
    it('fetches reports on mount', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ reports: [] }),
      })

      render(<ExportButton auditId="audit-123" />)

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('/api/reports?auditId=audit-123')
      })
    })
  })

  describe('accessibility', () => {
    it('has accessible button', () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({ reports: [] }),
      })

      render(<ExportButton auditId="audit-123" />)

      const button = screen.getByRole('button', { name: /ExportButton.export/i })
      expect(button).toBeEnabled()
    })
  })

  // NOTE: DropdownMenu interaction tests, polling tests, and menu item tests
  // are skipped because Radix UI DropdownMenu uses portals and pointer events
  // that are not fully compatible with jsdom environment.
  // These interactions should be tested in E2E tests with Playwright.
})
