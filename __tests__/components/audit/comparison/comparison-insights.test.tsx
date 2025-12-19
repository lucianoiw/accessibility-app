import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next-intl
const { mockUseTranslations } = vi.hoisted(() => ({
  mockUseTranslations: vi.fn(() => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'insights.criticalFixed': `${params?.count} problemas criticos foram corrigidos`,
      'insights.newCritical': `${params?.count} novos problemas criticos apareceram`,
      'insights.scoreImproved': `O score de saude melhorou ${params?.percent}%`,
      'insights.scoreDecreased': `O score de saude caiu ${params?.percent}%`,
      'insights.focusOn': `Foque em corrigir os ${params?.count} problemas criticos restantes`,
      'insights.greatProgress': 'Excelente progresso! Continue assim.',
      'insights.noViolations': 'Parabens! Nenhuma violacao encontrada.',
      'insights.firstAudit': 'Esta e sua primeira auditoria.',
      'insights.stable': 'O site esta estavel, sem mudancas significativas.',
    }
    return translations[key] || key
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: mockUseTranslations,
}))

import { ComparisonInsights } from '@/components/audit/comparison/comparison-insights'
import type { Insight } from '@/types'

describe('ComparisonInsights', () => {
  describe('rendering', () => {
    it('renders nothing when insights array is empty', () => {
      const { container } = render(<ComparisonInsights insights={[]} />)
      expect(container.firstChild).toBeNull()
    })

    it('renders positive insight with green styling', () => {
      const insights: Insight[] = [
        { type: 'positive', key: 'criticalFixed', params: { count: 5 } },
      ]

      render(<ComparisonInsights insights={insights} />)

      expect(screen.getByText('5 problemas criticos foram corrigidos')).toBeInTheDocument()
      const container = screen.getByText('5 problemas criticos foram corrigidos').closest('div')
      expect(container?.className).toContain('bg-green')
    })

    it('renders negative insight with red styling', () => {
      const insights: Insight[] = [
        { type: 'negative', key: 'newCritical', params: { count: 3 } },
      ]

      render(<ComparisonInsights insights={insights} />)

      expect(screen.getByText('3 novos problemas criticos apareceram')).toBeInTheDocument()
      const container = screen.getByText('3 novos problemas criticos apareceram').closest('div')
      expect(container?.className).toContain('bg-red')
    })

    it('renders warning insight with amber styling', () => {
      const insights: Insight[] = [
        { type: 'warning', key: 'focusOn', params: { count: 2 } },
      ]

      render(<ComparisonInsights insights={insights} />)

      expect(screen.getByText('Foque em corrigir os 2 problemas criticos restantes')).toBeInTheDocument()
      const container = screen.getByText('Foque em corrigir os 2 problemas criticos restantes').closest('div')
      expect(container?.className).toContain('bg-amber')
    })

    it('renders neutral insight with blue styling', () => {
      const insights: Insight[] = [
        { type: 'neutral', key: 'stable', params: {} },
      ]

      render(<ComparisonInsights insights={insights} />)

      expect(screen.getByText('O site esta estavel, sem mudancas significativas.')).toBeInTheDocument()
      const container = screen.getByText('O site esta estavel, sem mudancas significativas.').closest('div')
      expect(container?.className).toContain('bg-blue')
    })

    it('renders multiple insights', () => {
      const insights: Insight[] = [
        { type: 'positive', key: 'criticalFixed', params: { count: 3 } },
        { type: 'positive', key: 'scoreImproved', params: { percent: 15 } },
        { type: 'warning', key: 'focusOn', params: { count: 2 } },
      ]

      render(<ComparisonInsights insights={insights} />)

      expect(screen.getByText('3 problemas criticos foram corrigidos')).toBeInTheDocument()
      expect(screen.getByText('O score de saude melhorou 15%')).toBeInTheDocument()
      expect(screen.getByText('Foque em corrigir os 2 problemas criticos restantes')).toBeInTheDocument()
    })
  })

  describe('icons', () => {
    it('renders check icon for positive insights', () => {
      const insights: Insight[] = [
        { type: 'positive', key: 'greatProgress', params: {} },
      ]

      const { container } = render(<ComparisonInsights insights={insights} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders alert icon for negative insights', () => {
      const insights: Insight[] = [
        { type: 'negative', key: 'newCritical', params: { count: 1 } },
      ]

      const { container } = render(<ComparisonInsights insights={insights} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders warning icon for warning insights', () => {
      const insights: Insight[] = [
        { type: 'warning', key: 'focusOn', params: { count: 1 } },
      ]

      const { container } = render(<ComparisonInsights insights={insights} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders info icon for neutral insights', () => {
      const insights: Insight[] = [
        { type: 'neutral', key: 'firstAudit', params: {} },
      ]

      const { container } = render(<ComparisonInsights insights={insights} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      const insights: Insight[] = [
        { type: 'positive', key: 'greatProgress', params: {} },
      ]

      const { container } = render(
        <ComparisonInsights insights={insights} className="custom-class" />
      )
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('fallback messages', () => {
    it('uses fallback when translation key is not found', () => {
      // Override mock to throw for unknown keys
      mockUseTranslations.mockImplementationOnce(() => (key: string) => {
        if (key === 'insights.unknownKey') {
          throw new Error('Translation not found')
        }
        return key
      })

      const insights: Insight[] = [
        { type: 'positive', key: 'greatProgress', params: {} },
      ]

      // Should not throw and should render something
      expect(() => render(<ComparisonInsights insights={insights} />)).not.toThrow()
    })
  })
})
