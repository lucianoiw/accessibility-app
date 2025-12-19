import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { TrendIndicator } from '@/components/audit/comparison/trend-indicator'

describe('TrendIndicator', () => {
  describe('rendering', () => {
    it('renders with up direction', () => {
      const { container } = render(<TrendIndicator direction="up" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders with down direction', () => {
      const { container } = render(<TrendIndicator direction="down" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders with stable direction', () => {
      const { container } = render(<TrendIndicator direction="stable" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('renders value with percentage when provided', () => {
      render(<TrendIndicator direction="up" value={15} />)
      expect(screen.getByText('+15%')).toBeInTheDocument()
    })

    it('renders negative value with percentage', () => {
      render(<TrendIndicator direction="down" value={-10} />)
      expect(screen.getByText('-10%')).toBeInTheDocument()
    })

    it('renders label when showLabel is true', () => {
      render(<TrendIndicator direction="up" showLabel />)
      expect(screen.getByText('Subindo')).toBeInTheDocument()
    })

    it('renders stable label when showLabel is true', () => {
      render(<TrendIndicator direction="stable" showLabel />)
      expect(screen.getByText('Estavel')).toBeInTheDocument()
    })

    it('renders down label when showLabel is true', () => {
      render(<TrendIndicator direction="down" showLabel />)
      expect(screen.getByText('Descendo')).toBeInTheDocument()
    })
  })

  describe('colors for score type', () => {
    it('uses green for up direction (score improving)', () => {
      const { container } = render(<TrendIndicator direction="up" type="score" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-green')
    })

    it('uses red for down direction (score worsening)', () => {
      const { container } = render(<TrendIndicator direction="down" type="score" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-red')
    })

    it('uses gray for stable direction', () => {
      const { container } = render(<TrendIndicator direction="stable" type="score" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-gray')
    })
  })

  describe('colors for violations type', () => {
    it('uses red for up direction (violations increasing)', () => {
      const { container } = render(<TrendIndicator direction="up" type="violations" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-red')
    })

    it('uses green for down direction (violations decreasing)', () => {
      const { container } = render(<TrendIndicator direction="down" type="violations" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-green')
    })
  })

  describe('sizes', () => {
    it('applies small size classes', () => {
      const { container } = render(<TrendIndicator direction="up" size="sm" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-xs')
    })

    it('applies medium size classes by default', () => {
      const { container } = render(<TrendIndicator direction="up" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-sm')
    })

    it('applies large size classes', () => {
      const { container } = render(<TrendIndicator direction="up" size="lg" />)
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('text-base')
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <TrendIndicator direction="up" className="custom-class" />
      )
      const span = container.firstChild as HTMLElement
      expect(span.className).toContain('custom-class')
    })
  })
})
