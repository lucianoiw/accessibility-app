import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-intl
const { mockUseTranslations } = vi.hoisted(() => ({
  mockUseTranslations: vi.fn((namespace: string) => {
    if (namespace === 'WcagPartial') {
      const translationFn = (key: string) => {
        // Simulate translation with placeholders
        if (key === 'withPlaceholder') {
          return 'Text with {placeholder} here'
        }
        return `${namespace}.${key}`
      }
      translationFn.raw = (key: string) => {
        if (key === 'withPlaceholder') {
          return 'Text with {placeholder} here'
        }
        return `${namespace}.${key}`
      }
      return translationFn
    }
    return (key: string) => `${namespace}.${key}`
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: mockUseTranslations,
}))

// Mock rule-knowledge
const mockGetRuleKnowledge = vi.fn()
vi.mock('@/lib/audit/rule-knowledge', () => ({
  getRuleKnowledge: (...args: unknown[]) => mockGetRuleKnowledge(...args),
}))

// Mock rule-labels
const mockGetRuleLabel = vi.fn()
vi.mock('@/lib/audit/rule-labels', () => ({
  getRuleLabel: (...args: unknown[]) => mockGetRuleLabel(...args),
}))

import { HelpModal } from '@/components/audit/help-modal'
import type { AggregatedViolation } from '@/types'

describe('HelpModal', () => {
  const user = userEvent.setup()

  const mockViolation: AggregatedViolation = {
    id: 'test-violation-1',
    audit_id: 'audit-123',
    rule_id: 'image-alt',
    description: 'Images must have alternate text',
    impact: 'critical',
    help: 'WcagPartial.imageAltHelp',
    help_url: 'https://dequeuniversity.com/rules/axe/4.7/image-alt',
    wcag_criteria: ['1.1.1'],
    emag_recommendations: [],
    abnt_sections: [],
    unique_elements: [],
    occurrence_count: 5,
    pages_affected: 3,
    priority_score: 95,
    status: 'open',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRuleLabel.mockReturnValue('Image without alt text')
    mockGetRuleKnowledge.mockReturnValue(null)
  })

  describe('rendering', () => {
    it('renders help button with icon', () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      expect(button).toBeInTheDocument()
    })

    it('does not render modal content initially', () => {
      render(<HelpModal violation={mockViolation} />)

      expect(screen.queryByText('HelpModal.title')).not.toBeInTheDocument()
    })

    it('renders rule label as description', async () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('Image without alt text')).toBeInTheDocument()
    })
  })

  describe('modal interactions', () => {
    it('opens modal when help button is clicked', async () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.title')).toBeInTheDocument()
    })

    it('closes modal when escape is pressed', async () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.title')).toBeInTheDocument()

      await user.keyboard('{Escape}')

      // Wait for modal animation
      await new Promise((resolve) => setTimeout(resolve, 300))
      expect(screen.queryByText('HelpModal.title')).not.toBeInTheDocument()
    })
  })

  describe('content rendering with knowledge', () => {
    it('renders whyItMatters section', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'This is important because...',
        fixSteps: ['Step 1'],
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.whyItMatters')).toBeInTheDocument()
      expect(screen.getByText('This is important because...')).toBeInTheDocument()
    })

    it('renders affected users section', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        affectedUsers: ['screenReader', 'lowVision', 'cognitive'],
        fixSteps: ['Step 1'],
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.affectedUsers')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_screenReader')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_lowVision')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_cognitive')).toBeInTheDocument()
    })

    it('renders all user types as badges', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        affectedUsers: ['screenReader', 'cognitive', 'motor', 'lowVision', 'deaf', 'colorBlind'],
        fixSteps: ['Step 1'],
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.userType_screenReader')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_cognitive')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_motor')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_lowVision')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_deaf')).toBeInTheDocument()
      expect(screen.getByText('HelpModal.userType_colorBlind')).toBeInTheDocument()
    })

    it('renders fix steps section', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: ['Add alt attribute', 'Describe the image', 'Use empty alt for decorative'],
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.howToFix')).toBeInTheDocument()
      expect(screen.getByText('Add alt attribute')).toBeInTheDocument()
      expect(screen.getByText('Describe the image')).toBeInTheDocument()
      expect(screen.getByText('Use empty alt for decorative')).toBeInTheDocument()
    })

    it('renders code examples section', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: ['Step 1'],
        codeExamples: [
          {
            description: 'Basic example',
            before: '<img src="photo.jpg">',
            after: '<img src="photo.jpg" alt="Team photo">',
          },
          {
            before: '<img src="decorative.png">',
            after: '<img src="decorative.png" alt="">',
          },
        ],
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.codeExample')).toBeInTheDocument()
      expect(screen.getByText('Basic example')).toBeInTheDocument()
      expect(screen.getByText('<img src="photo.jpg">')).toBeInTheDocument()
      expect(screen.getByText('<img src="photo.jpg" alt="Team photo">')).toBeInTheDocument()
      expect(screen.getByText('<img src="decorative.png">')).toBeInTheDocument()
      expect(screen.getByText('<img src="decorative.png" alt="">')).toBeInTheDocument()
      expect(screen.getAllByText('HelpModal.before')).toHaveLength(2)
      expect(screen.getAllByText('HelpModal.after')).toHaveLength(2)
    })

    it('renders false positive guidance section', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: ['Step 1'],
        falsePositiveGuidance: 'This may be a false positive if the image is purely decorative',
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.falsePositiveGuidance')).toBeInTheDocument()
      expect(
        screen.getByText('This may be a false positive if the image is purely decorative')
      ).toBeInTheDocument()
    })
  })

  describe('content rendering without knowledge', () => {
    it('renders default whyItMatters from violation help', async () => {
      mockGetRuleKnowledge.mockReturnValue(null)
      const violationWithHelp = {
        ...mockViolation,
        help: 'Default help message',
      }

      render(<HelpModal violation={violationWithHelp} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      // Help text appears in both whyItMatters and howToFix sections
      const helpTexts = screen.getAllByText('Default help message')
      expect(helpTexts.length).toBeGreaterThan(0)
    })

    it('renders default whyItMatters when no knowledge or help', async () => {
      mockGetRuleKnowledge.mockReturnValue(null)
      const violationWithoutHelp = {
        ...mockViolation,
        help: '',
      }

      render(<HelpModal violation={violationWithoutHelp} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.defaultWhyItMatters')).toBeInTheDocument()
    })

    it('renders default affectedUsers as screenReader', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: ['Step 1'],
        // No affectedUsers defined
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.userType_screenReader')).toBeInTheDocument()
    })

    it('renders default howToFix from violation help', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: [],
        // No fixSteps
      })

      const violationWithHelp = {
        ...mockViolation,
        help: 'Add alt text to images',
      }

      render(<HelpModal violation={violationWithHelp} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('Add alt text to images')).toBeInTheDocument()
    })

    it('renders default howToFix when no fixSteps or help', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: [],
      })

      const violationWithoutHelp = {
        ...mockViolation,
        help: '',
      }

      render(<HelpModal violation={violationWithoutHelp} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.defaultHowToFix')).toBeInTheDocument()
    })
  })

  describe('translateMessage function', () => {
    it('translates WcagPartial messages', async () => {
      mockGetRuleKnowledge.mockReturnValue(null)
      const violationWithWcagPartial = {
        ...mockViolation,
        help: 'WcagPartial.imageAltHelp',
      }

      render(<HelpModal violation={violationWithWcagPartial} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      const wcagTexts = screen.getAllByText('WcagPartial.imageAltHelp')
      expect(wcagTexts.length).toBeGreaterThan(0)
    })

    it('removes placeholders from WcagPartial messages', async () => {
      mockGetRuleKnowledge.mockReturnValue(null)
      const violationWithPlaceholders = {
        ...mockViolation,
        help: 'WcagPartial.withPlaceholder',
      }

      render(<HelpModal violation={violationWithPlaceholders} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      // Should show ... instead of {placeholder}
      const placeholderTexts = screen.getAllByText('Text with ... here')
      expect(placeholderTexts.length).toBeGreaterThan(0)
    })

    it('returns message as-is when not WcagPartial', async () => {
      mockGetRuleKnowledge.mockReturnValue(null)
      const violationWithRegularHelp = {
        ...mockViolation,
        help: 'Regular help message',
      }

      render(<HelpModal violation={violationWithRegularHelp} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      const regularTexts = screen.getAllByText('Regular help message')
      expect(regularTexts.length).toBeGreaterThan(0)
    })
  })

  describe('references section', () => {
    it('renders WCAG reference link', async () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      const wcagLink = screen.getByRole('link', { name: /WCAG 1.1.1/i })
      expect(wcagLink).toBeInTheDocument()
      expect(wcagLink).toHaveAttribute(
        'href',
        'https://www.w3.org/WAI/WCAG21/Understanding/111'
      )
      expect(wcagLink).toHaveAttribute('target', '_blank')
      expect(wcagLink).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('renders help URL link', async () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      const helpLink = screen.getByRole('link', { name: /HelpModal.learnMore/i })
      expect(helpLink).toBeInTheDocument()
      expect(helpLink).toHaveAttribute(
        'href',
        'https://dequeuniversity.com/rules/axe/4.7/image-alt'
      )
      expect(helpLink).toHaveAttribute('target', '_blank')
    })

    it('renders eMAG reference link when available', async () => {
      const violationWithEmag = {
        ...mockViolation,
        emag_recommendations: ['3.6'],
      }

      render(<HelpModal violation={violationWithEmag} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      const emagLink = screen.getByRole('link', { name: /eMAG 3.6/i })
      expect(emagLink).toBeInTheDocument()
      expect(emagLink).toHaveAttribute('href', 'https://emag.governoeletronico.gov.br/')
      expect(emagLink).toHaveAttribute('target', '_blank')
    })

    it('renders all reference links when available', async () => {
      const violationWithAllRefs = {
        ...mockViolation,
        wcag_criteria: ['1.1.1', '4.1.2'],
        emag_recommendations: ['3.6', '3.8'],
      }

      render(<HelpModal violation={violationWithAllRefs} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByRole('link', { name: /WCAG 1.1.1/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /HelpModal.learnMore/i })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /eMAG 3.6/i })).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has accessible help button', () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      expect(button).toBeEnabled()
      expect(button).toHaveAttribute('type', 'button')
    })

    it('modal has accessible title', async () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('HelpModal.title')).toBeInTheDocument()
    })

    it('external links have proper rel attribute', async () => {
      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      const links = screen.getAllByRole('link')
      for (const link of links) {
        if (link.getAttribute('target') === '_blank') {
          expect(link).toHaveAttribute('rel', 'noopener noreferrer')
        }
      }
    })
  })

  describe('edge cases', () => {
    it('handles violation without wcag_criteria', async () => {
      const violationWithoutWcag = {
        ...mockViolation,
        wcag_criteria: [],
      }

      render(<HelpModal violation={violationWithoutWcag} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.queryByRole('link', { name: /WCAG/i })).not.toBeInTheDocument()
    })

    it('handles violation without help_url', async () => {
      const violationWithoutHelpUrl = {
        ...mockViolation,
        help_url: '',
      }

      render(<HelpModal violation={violationWithoutHelpUrl} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.queryByRole('link', { name: /HelpModal.learnMore/i })).not.toBeInTheDocument()
    })

    it('handles knowledge with no code examples', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: ['Step 1'],
        // No codeExamples
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.queryByText('HelpModal.codeExample')).not.toBeInTheDocument()
    })

    it('handles knowledge with empty code examples array', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: ['Step 1'],
        codeExamples: [],
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.queryByText('HelpModal.codeExample')).not.toBeInTheDocument()
    })

    it('handles code example without description', async () => {
      mockGetRuleKnowledge.mockReturnValue({
        whyItMatters: 'Important',
        fixSteps: ['Step 1'],
        codeExamples: [
          {
            before: '<img>',
            after: '<img alt="description">',
          },
        ],
      })

      render(<HelpModal violation={mockViolation} />)

      const button = screen.getByRole('button', { name: /HelpModal.help/i })
      await user.click(button)

      expect(screen.getByText('<img>')).toBeInTheDocument()
      expect(screen.getByText('<img alt="description">')).toBeInTheDocument()
    })
  })
})
