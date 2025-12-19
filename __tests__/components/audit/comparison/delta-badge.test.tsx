import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'

import { DeltaBadge } from '@/components/audit/comparison/delta-badge'

describe('DeltaBadge', () => {
  describe('rendering', () => {
    it('renders with positive value', () => {
      render(<DeltaBadge value={5} type="violations" />)
      expect(screen.getByText('+5')).toBeInTheDocument()
    })

    it('renders with negative value', () => {
      render(<DeltaBadge value={-3} type="violations" />)
      expect(screen.getByText('-3')).toBeInTheDocument()
    })

    it('renders with zero value', () => {
      render(<DeltaBadge value={0} type="violations" />)
      expect(screen.getByText('0')).toBeInTheDocument()
    })

    it('renders percentage suffix for score type', () => {
      render(<DeltaBadge value={10} type="score" />)
      expect(screen.getByText('+10%')).toBeInTheDocument()
    })

    it('does not render percentage for violations type', () => {
      render(<DeltaBadge value={5} type="violations" />)
      expect(screen.getByText('+5')).toBeInTheDocument()
      expect(screen.queryByText('+5%')).not.toBeInTheDocument()
    })
  })

  describe('colors', () => {
    it('uses green for decreased violations (positive outcome)', () => {
      const { container } = render(<DeltaBadge value={-5} type="violations" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-green')
    })

    it('uses red for increased violations (negative outcome)', () => {
      const { container } = render(<DeltaBadge value={5} type="violations" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-red')
    })

    it('uses green for increased score (positive outcome)', () => {
      const { container } = render(<DeltaBadge value={10} type="score" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-green')
    })

    it('uses red for decreased score (negative outcome)', () => {
      const { container } = render(<DeltaBadge value={-10} type="score" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-red')
    })

    it('uses gray for neutral/zero value', () => {
      const { container } = render(<DeltaBadge value={0} type="violations" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-gray')
    })

    it('uses neutral color for pages type', () => {
      const { container } = render(<DeltaBadge value={5} type="pages" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('bg-gray')
    })
  })

  describe('sizes', () => {
    it('applies small size classes', () => {
      const { container } = render(<DeltaBadge value={5} type="violations" size="sm" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('text-xs')
    })

    it('applies medium size classes by default', () => {
      const { container } = render(<DeltaBadge value={5} type="violations" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('text-sm')
    })

    it('applies large size classes', () => {
      const { container } = render(<DeltaBadge value={5} type="violations" size="lg" />)
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('text-base')
    })
  })

  describe('icon', () => {
    it('shows up arrow for positive values', () => {
      const { container } = render(<DeltaBadge value={5} type="violations" />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })

    it('hides icon when showIcon is false', () => {
      const { container } = render(<DeltaBadge value={5} type="violations" showIcon={false} />)
      const svg = container.querySelector('svg')
      expect(svg).not.toBeInTheDocument()
    })
  })

  describe('sign', () => {
    it('hides sign when showSign is false', () => {
      render(<DeltaBadge value={5} type="violations" showSign={false} />)
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.queryByText('+5')).not.toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <DeltaBadge value={5} type="violations" className="custom-class" />
      )
      const badge = container.firstChild as HTMLElement
      expect(badge.className).toContain('custom-class')
    })
  })
})
