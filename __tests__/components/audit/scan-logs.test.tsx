import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-intl
const { mockUseTranslations } = vi.hoisted(() => ({
  mockUseTranslations: vi.fn((namespace: string) => (key: string) => `${namespace}.${key}`),
}))

vi.mock('next-intl', () => ({
  useTranslations: mockUseTranslations,
}))

import { ScanLogs } from '@/components/audit/scan-logs'
import type { ScanLogEntry } from '@/lib/audit'

describe('ScanLogs', () => {
  const user = userEvent.setup()

  const mockEntries: ScanLogEntry[] = [
    {
      id: '1',
      url: 'https://example.com/page1',
      status: 'success',
      date: new Date('2024-01-01T10:00:00Z'),
      description: 'Page scanned successfully',
      score: 95,
    },
    {
      id: '2',
      url: 'https://example.com/page2',
      status: 'failure',
      date: new Date('2024-01-01T11:00:00Z'),
      description: 'Failed to load page',
      score: undefined,
    },
    {
      id: '3',
      url: 'https://example.com/page3',
      status: 'redirect',
      date: new Date('2024-01-01T12:00:00Z'),
      description: 'Redirected to new URL',
      score: 80,
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders card with title', () => {
      render(<ScanLogs entries={mockEntries} />)

      expect(screen.getByText('AuditComponents.scanLogs')).toBeInTheDocument()
    })

    it('renders all entries by default', () => {
      render(<ScanLogs entries={mockEntries} />)

      expect(screen.getByText('https://example.com/page1')).toBeInTheDocument()
      expect(screen.getByText('https://example.com/page2')).toBeInTheDocument()
      expect(screen.getByText('https://example.com/page3')).toBeInTheDocument()
    })

    it('renders status counts', () => {
      render(<ScanLogs entries={mockEntries} />)

      expect(screen.getByText('1 AuditComponents.statusSuccessLabel')).toBeInTheDocument()
      expect(screen.getByText('1 AuditComponents.statusFailuresLabel')).toBeInTheDocument()
      expect(screen.getByText('1 AuditComponents.statusRedirectsLabel')).toBeInTheDocument()
    })

    it('renders scores when available', () => {
      render(<ScanLogs entries={mockEntries} />)

      expect(screen.getByText('95')).toBeInTheDocument()
      expect(screen.getByText('80')).toBeInTheDocument()
    })

    it('renders dash when score is not available', () => {
      render(<ScanLogs entries={mockEntries} />)

      const dashElements = screen.getAllByText('-')
      expect(dashElements.length).toBeGreaterThan(0)
    })

    it('renders table headers', () => {
      render(<ScanLogs entries={mockEntries} />)

      expect(screen.getByText('AuditComponents.tableDate')).toBeInTheDocument()
      expect(screen.getByText('AuditComponents.tablePage')).toBeInTheDocument()
      expect(screen.getByText('AuditComponents.tableDescription')).toBeInTheDocument()
      expect(screen.getByText('AuditComponents.tableScore')).toBeInTheDocument()
    })

    it('renders empty state when no entries', () => {
      render(<ScanLogs entries={[]} />)

      expect(screen.getByText('AuditComponents.noEntriesFound')).toBeInTheDocument()
    })

    it('truncates long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(100)
      const entries: ScanLogEntry[] = [
        {
          id: '1',
          url: longUrl,
          status: 'success',
          date: new Date(),
          description: 'Test',
          score: 90,
        },
      ]

      render(<ScanLogs entries={entries} />)

      // Should contain ellipsis
      const linkElement = screen.getByRole('link')
      expect(linkElement.textContent).toContain('...')
    })

    it('renders status icons', () => {
      const { container } = render(<ScanLogs entries={mockEntries} />)

      // Check for icon presence (SVG elements with lucide classes)
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThan(0)

      // Check for specific icon classes
      const hasCheckIcon = Array.from(svgs).some(svg => svg.classList.contains('lucide-circle-check-big'))
      const hasXIcon = Array.from(svgs).some(svg => svg.classList.contains('lucide-circle-x'))
      const hasRefreshIcon = Array.from(svgs).some(svg => svg.classList.contains('lucide-refresh-cw'))

      expect(hasCheckIcon || hasXIcon || hasRefreshIcon).toBe(true)
    })
  })

  // NOTE: Filtering tests skipped because Radix UI Select component uses
  // hasPointerCapture which is not available in jsdom environment.
  // These interactions should be tested in E2E tests with Playwright.
  describe('filtering', () => {
    it('renders filter select', () => {
      render(<ScanLogs entries={mockEntries} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeInTheDocument()
    })
  })

  describe('links', () => {
    it('renders links with correct href', () => {
      render(<ScanLogs entries={mockEntries} />)

      const link = screen.getByRole('link', { name: /example.com\/page1/i })
      expect(link).toHaveAttribute('href', 'https://example.com/page1')
    })

    it('opens links in new tab', () => {
      render(<ScanLogs entries={mockEntries} />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link).toHaveAttribute('target', '_blank')
        expect(link).toHaveAttribute('rel', 'noopener noreferrer')
      })
    })

    it('shows full URL in title attribute', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(100)
      const entries: ScanLogEntry[] = [
        {
          id: '1',
          url: longUrl,
          status: 'success',
          date: new Date(),
          description: 'Test',
          score: 90,
        },
      ]

      render(<ScanLogs entries={entries} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('title', longUrl)
    })
  })

  describe('accessibility', () => {
    it('has proper table structure', () => {
      render(<ScanLogs entries={mockEntries} />)

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      const headers = screen.getAllByRole('columnheader')
      expect(headers).toHaveLength(4)
    })

    it('has accessible select for filtering', () => {
      render(<ScanLogs entries={mockEntries} />)

      const select = screen.getByRole('combobox')
      expect(select).toBeEnabled()
    })

    it('has accessible links with external link icon', () => {
      render(<ScanLogs entries={mockEntries} />)

      const links = screen.getAllByRole('link')
      links.forEach((link) => {
        expect(link.querySelector('.lucide-external-link')).toBeInTheDocument()
      })
    })
  })

  describe('custom className', () => {
    it('applies custom className to card', () => {
      const { container } = render(<ScanLogs entries={mockEntries} className="custom-class" />)

      const card = container.querySelector('.custom-class')
      expect(card).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles entries with missing optional fields', () => {
      const minimalEntry: ScanLogEntry = {
        id: '1',
        url: 'https://example.com',
        status: 'success',
        date: new Date(),
        description: 'Test',
        score: undefined,
      }

      render(<ScanLogs entries={[minimalEntry]} />)

      expect(screen.getByText('https://example.com')).toBeInTheDocument()
      expect(screen.getByText('-')).toBeInTheDocument()
    })

    it('handles very old dates', () => {
      const oldEntry: ScanLogEntry = {
        id: '1',
        url: 'https://example.com',
        status: 'success',
        date: new Date('2000-01-01'),
        description: 'Old scan',
        score: 90,
      }

      render(<ScanLogs entries={[oldEntry]} />)

      // Should not crash and should render something
      expect(screen.getByText('https://example.com')).toBeInTheDocument()
    })
  })
})
