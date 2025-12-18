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

import { ScoreCard } from '@/components/audit/score-card'
import type { ScoreData } from '@/lib/audit/score-calculator'

describe('ScoreCard', () => {
  const user = userEvent.setup()

  const mockScoreData: ScoreData = {
    score: 75,
    passedRules: {
      critical: 10,
      serious: 15,
      moderate: 20,
      minor: 30,
    },
    failedRules: {
      critical: 2,
      serious: 3,
      moderate: 5,
      minor: 8,
    },
    scoreImpact: {
      critical: -40,
      serious: -42,
      moderate: -30,
      minor: -16,
    },
    weightedPassed: 300,
    weightedFailed: 128,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders card with title', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('AuditComponents.accessibilityScore')).toBeInTheDocument()
    })

    it('renders card description', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('AuditComponents.scoreDescription')).toBeInTheDocument()
    })

    it('renders score gauge with correct value', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('75')).toBeInTheDocument()
    })

    it('renders score label', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('AuditComponents.score')).toBeInTheDocument()
    })

    it('renders help icon with tooltip trigger', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      const helpButton = screen.getByRole('button', { name: /AuditComponents.scoreTooltip/i })
      expect(helpButton).toBeInTheDocument()
    })

    it('renders severity table headers', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('AuditComponents.ruleSeverity')).toBeInTheDocument()
      expect(screen.getByText('AuditComponents.passedRules')).toBeInTheDocument()
      expect(screen.getByText('AuditComponents.failedRules')).toBeInTheDocument()
      expect(screen.getByText('AuditComponents.scoreImpact')).toBeInTheDocument()
    })

    it('renders all severity rows', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('Severity.critical')).toBeInTheDocument()
      expect(screen.getByText('Severity.serious')).toBeInTheDocument()
      expect(screen.getByText('Severity.moderate')).toBeInTheDocument()
      expect(screen.getByText('Severity.minor')).toBeInTheDocument()
    })

    it('renders passed rules counts', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('10')).toBeInTheDocument() // critical
      expect(screen.getByText('15')).toBeInTheDocument() // serious
      expect(screen.getByText('20')).toBeInTheDocument() // moderate
      expect(screen.getByText('30')).toBeInTheDocument() // minor
    })

    it('renders failed rules counts', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('2')).toBeInTheDocument() // critical
      expect(screen.getByText('3')).toBeInTheDocument() // serious
      expect(screen.getByText('5')).toBeInTheDocument() // moderate
      expect(screen.getByText('8')).toBeInTheDocument() // minor
    })

    it('renders score impact values', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      expect(screen.getByText('-40')).toBeInTheDocument()
      expect(screen.getByText('-42')).toBeInTheDocument()
      expect(screen.getByText('-30')).toBeInTheDocument()
      expect(screen.getByText('-16')).toBeInTheDocument()
    })

    it('renders link to view calculation', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      const link = screen.getByRole('button', { name: /AuditComponents.viewScoreCalculation/i })
      expect(link).toBeInTheDocument()
    })

    it('applies negative impact styling to red values', () => {
      const { container } = render(<ScoreCard scoreData={mockScoreData} />)

      const impactCells = container.querySelectorAll('td.text-red-500')
      expect(impactCells.length).toBeGreaterThan(0)
    })

    it('renders zero impact as "0"', () => {
      const zeroImpactData: ScoreData = {
        ...mockScoreData,
        scoreImpact: {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        },
      }

      render(<ScoreCard scoreData={zeroImpactData} />)

      const zeroValues = screen.getAllByText('0')
      expect(zeroValues.length).toBeGreaterThan(0)
    })
  })

  describe('gauge colors', () => {
    it('renders green gauge for excellent score (90+)', () => {
      const excellentData: ScoreData = { ...mockScoreData, score: 95 }
      const { container } = render(<ScoreCard scoreData={excellentData} />)

      const gauge = container.querySelector('.stroke-green-500')
      expect(gauge).toBeInTheDocument()
    })

    it('renders blue gauge for good score (70-89)', () => {
      const goodData: ScoreData = { ...mockScoreData, score: 80 }
      const { container } = render(<ScoreCard scoreData={goodData} />)

      const gauge = container.querySelector('.stroke-blue-500')
      expect(gauge).toBeInTheDocument()
    })

    it('renders yellow gauge for moderate score (50-69)', () => {
      const moderateData: ScoreData = { ...mockScoreData, score: 60 }
      const { container } = render(<ScoreCard scoreData={moderateData} />)

      const gauge = container.querySelector('.stroke-yellow-500')
      expect(gauge).toBeInTheDocument()
    })

    it('renders red gauge for poor score (<50)', () => {
      const poorData: ScoreData = { ...mockScoreData, score: 30 }
      const { container } = render(<ScoreCard scoreData={poorData} />)

      const gauge = container.querySelector('.stroke-red-500')
      expect(gauge).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('opens modal when calculation link is clicked', async () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      const link = screen.getByRole('button', { name: /AuditComponents.viewScoreCalculation/i })
      await user.click(link)

      // Modal should be open and display title
      expect(screen.getByText('ScoreModal.title')).toBeInTheDocument()
    })

    it('closes modal when escape is pressed', async () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      // Open modal
      const link = screen.getByRole('button', { name: /AuditComponents.viewScoreCalculation/i })
      await user.click(link)

      expect(screen.getByText('ScoreModal.title')).toBeInTheDocument()

      // Close with escape
      await user.keyboard('{Escape}')

      // Modal should be closed (wait a bit for animation)
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(screen.queryByText('ScoreModal.title')).not.toBeInTheDocument()
    })

    // NOTE: Tooltip hover test skipped because Radix UI Tooltip uses
    // ResizeObserver which is not fully compatible with jsdom environment.
    // Tooltip interactions should be tested in E2E tests with Playwright.
  })

  describe('custom className', () => {
    it('applies custom className to card', () => {
      const { container } = render(
        <ScoreCard scoreData={mockScoreData} className="custom-test-class" />
      )

      const card = container.querySelector('.custom-test-class')
      expect(card).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper table structure', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      const headers = screen.getAllByRole('columnheader')
      expect(headers).toHaveLength(4)
    })

    it('has accessible gauge with aria-label', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      const gauge = screen.getByRole('img', { name: /AuditComponents.score: 75/i })
      expect(gauge).toBeInTheDocument()
    })

    it('has accessible help button', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      const helpButton = screen.getByRole('button', { name: /AuditComponents.scoreTooltip/i })
      expect(helpButton).toBeEnabled()
      expect(helpButton).toHaveAttribute('type', 'button')
    })

    it('has accessible link to calculation', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      const link = screen.getByRole('button', { name: /AuditComponents.viewScoreCalculation/i })
      expect(link).toBeEnabled()
      expect(link).toHaveAttribute('type', 'button')
    })
  })

  describe('edge cases', () => {
    it('handles perfect score', () => {
      const perfectData: ScoreData = {
        score: 100,
        passedRules: {
          critical: 20,
          serious: 30,
          moderate: 40,
          minor: 50,
        },
        failedRules: {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        },
        scoreImpact: {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        },
        weightedPassed: 500,
        weightedFailed: 0,
      }

      render(<ScoreCard scoreData={perfectData} />)

      // Score value appears in both gauge scale and score display
      const scoreElements = screen.getAllByText('100')
      expect(scoreElements.length).toBeGreaterThanOrEqual(1)
    })

    it('handles zero score', () => {
      const zeroData: ScoreData = {
        score: 0,
        passedRules: {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        },
        failedRules: {
          critical: 10,
          serious: 10,
          moderate: 10,
          minor: 10,
        },
        scoreImpact: {
          critical: -200,
          serious: -140,
          moderate: -60,
          minor: -20,
        },
        weightedPassed: 0,
        weightedFailed: 420,
      }

      render(<ScoreCard scoreData={zeroData} />)

      // Score value appears in both gauge scale and score display
      const scoreElements = screen.getAllByText('0')
      expect(scoreElements.length).toBeGreaterThanOrEqual(1)
    })

    it('handles very high counts', () => {
      const highCountData: ScoreData = {
        ...mockScoreData,
        passedRules: {
          critical: 100,
          serious: 200,
          moderate: 300,
          minor: 400,
        },
        failedRules: {
          critical: 50,
          serious: 75,
          moderate: 100,
          minor: 125,
        },
      }

      render(<ScoreCard scoreData={highCountData} />)

      // Multiple elements may have "100" (gauge scale + passed rules)
      const hundredElements = screen.getAllByText('100')
      expect(hundredElements.length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText('200')).toBeInTheDocument()
      expect(screen.getByText('300')).toBeInTheDocument()
      expect(screen.getByText('400')).toBeInTheDocument()
    })
  })

  describe('gauge rendering', () => {
    it('renders SVG gauge element', () => {
      const { container } = render(<ScoreCard scoreData={mockScoreData} />)

      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders gauge min and max labels', () => {
      render(<ScoreCard scoreData={mockScoreData} />)

      // SVG text elements for 0 and 100
      const { container } = render(<ScoreCard scoreData={mockScoreData} />)
      const svgTexts = container.querySelectorAll('text')

      expect(svgTexts.length).toBeGreaterThanOrEqual(2)
    })
  })
})
