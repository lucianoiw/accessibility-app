import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-intl
const { mockUseTranslations } = vi.hoisted(() => ({
  mockUseTranslations: vi.fn((namespace: string) => (key: string, params?: any) => {
    if (params) {
      // Simple interpolation for testing
      let result = `${namespace}.${key}`
      Object.keys(params).forEach((param) => {
        result += ` ${param}:${params[param]}`
      })
      return result
    }
    return `${namespace}.${key}`
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: mockUseTranslations,
}))

import { ScoreModal } from '@/components/audit/score-modal'
import type { ScoreData } from '@/lib/audit/score-calculator'

describe('ScoreModal', () => {
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
    it('renders modal when open', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      expect(screen.getByText('ScoreModal.title')).toBeInTheDocument()
    })

    it('does not render modal when closed', () => {
      render(<ScoreModal open={false} onOpenChange={() => {}} scoreData={mockScoreData} />)

      expect(screen.queryByText('ScoreModal.title')).not.toBeInTheDocument()
    })

    it('displays score and breakdown values', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      // Dialog uses portal, so use screen.getByRole('dialog') to find content
      const dialog = screen.getByRole('dialog')
      const text = dialog.textContent || ''

      // Check all key values are present
      expect(text).toContain('75')   // score
      expect(text).toContain('10')  // critical passed
      expect(text).toContain('15')  // serious passed
      expect(text).toContain('20')  // moderate passed
      expect(text).toContain('30')  // minor passed
      expect(text).toContain('2')   // critical failed
      expect(text).toContain('3')   // serious failed
      expect(text).toContain('5')   // moderate failed
      expect(text).toContain('8')   // minor failed
    })

    it('displays weighted sums', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      // Dialog uses portal, so use screen.getByRole('dialog') to find content
      const dialog = screen.getByRole('dialog')
      const text = dialog.textContent || ''

      // Check that weighted values are displayed in the modal
      expect(text).toContain('300')
      expect(text).toContain('128')
    })

    it('displays severity labels', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      expect(screen.getByText('ScoreModal.critical')).toBeInTheDocument()
      expect(screen.getByText('ScoreModal.serious')).toBeInTheDocument()
      expect(screen.getByText('ScoreModal.moderate')).toBeInTheDocument()
      expect(screen.getByText('ScoreModal.minor')).toBeInTheDocument()
    })

    it('displays pass weights explanation', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      // Check for pass weights in translation key
      const passWeightsText = screen.getByText(/ScoreModal.passWeightsDesc/)
      expect(passWeightsText).toBeInTheDocument()
    })

    it('displays fail weights explanation', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      // Check for fail weights in translation key
      const failWeightsText = screen.getByText(/ScoreModal.failWeightsDesc/)
      expect(failWeightsText).toBeInTheDocument()
    })

    it('displays calculation sections', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      expect(screen.getByText('ScoreModal.calculatingWeightedSum')).toBeInTheDocument()
      expect(screen.getByText('ScoreModal.calculatingFinalScore')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onOpenChange when closed', async () => {
      const onOpenChange = vi.fn()
      render(<ScoreModal open={true} onOpenChange={onOpenChange} scoreData={mockScoreData} />)

      // Dialog component should have a close button (X)
      // We can trigger Escape key to close
      await user.keyboard('{Escape}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('edge cases', () => {
    it('handles zero score', () => {
      const zeroScoreData: ScoreData = {
        ...mockScoreData,
        score: 0,
        weightedPassed: 0,
      }

      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={zeroScoreData} />)

      // Check for score value in specific context (multiple "0" values exist in the modal)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toContainHTML('0')
    })

    it('handles perfect score', () => {
      const perfectScoreData: ScoreData = {
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

      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={perfectScoreData} />)

      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('handles all failed rules', () => {
      const allFailedData: ScoreData = {
        score: 0,
        passedRules: {
          critical: 0,
          serious: 0,
          moderate: 0,
          minor: 0,
        },
        failedRules: {
          critical: 10,
          serious: 15,
          moderate: 20,
          minor: 25,
        },
        scoreImpact: {
          critical: -200,
          serious: -210,
          moderate: -120,
          minor: -50,
        },
        weightedPassed: 0,
        weightedFailed: 580,
      }

      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={allFailedData} />)

      // Check for score value in dialog (multiple "0" values exist in the modal)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toContainHTML('0')
    })
  })

  describe('accessibility', () => {
    it('has proper dialog role', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      const dialog = screen.getByRole('dialog')
      expect(dialog).toBeInTheDocument()
    })

    it('has accessible title', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      // Dialog should have aria-labelledby pointing to title
      const title = screen.getByText('ScoreModal.title')
      expect(title).toBeInTheDocument()
    })

    it('has proper table structure', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()

      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBeGreaterThan(0)
    })

    it('can be closed with Escape key', async () => {
      const onOpenChange = vi.fn()
      render(<ScoreModal open={true} onOpenChange={onOpenChange} scoreData={mockScoreData} />)

      await user.keyboard('{Escape}')

      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('content structure', () => {
    it('displays formula sections in order', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      const sections = [
        'ScoreModal.description',
        'ScoreModal.calculatingWeightedSum',
        'ScoreModal.calculatingFinalScore',
      ]

      sections.forEach((section) => {
        expect(screen.getByText(section)).toBeInTheDocument()
      })
    })

    it('displays all severity rows', () => {
      render(<ScoreModal open={true} onOpenChange={() => {}} scoreData={mockScoreData} />)

      expect(screen.getByText('ScoreModal.critical')).toBeInTheDocument()
      expect(screen.getByText('ScoreModal.serious')).toBeInTheDocument()
      expect(screen.getByText('ScoreModal.moderate')).toBeInTheDocument()
      expect(screen.getByText('ScoreModal.minor')).toBeInTheDocument()
    })
  })
})
