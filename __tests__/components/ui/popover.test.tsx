import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Popover, PopoverTrigger, PopoverAnchor } from '@/components/ui/popover'

// Note: Full popover interaction tests with Portal are limited in jsdom.
// PopoverContent uses Portal which may not render properly.
// For comprehensive testing, E2E tests with Playwright are recommended.

describe('Popover components', () => {
  describe('PopoverTrigger', () => {
    it('renders with data-slot', () => {
      render(
        <Popover>
          <PopoverTrigger data-testid="trigger">Open Popover</PopoverTrigger>
        </Popover>
      )
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'popover-trigger')
    })

    it('can render as button', () => {
      render(
        <Popover>
          <PopoverTrigger asChild>
            <button>Toggle</button>
          </PopoverTrigger>
        </Popover>
      )
      expect(screen.getByRole('button', { name: 'Toggle' })).toBeInTheDocument()
    })

    it('passes through additional props', () => {
      render(
        <Popover>
          <PopoverTrigger data-testid="trigger" id="popover-trigger" className="custom-trigger">
            Trigger
          </PopoverTrigger>
        </Popover>
      )
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveAttribute('id', 'popover-trigger')
      expect(trigger.className).toContain('custom-trigger')
    })
  })

  describe('PopoverAnchor', () => {
    it('renders with data-slot', () => {
      render(
        <Popover>
          <PopoverAnchor data-testid="anchor">
            <span>Anchor element</span>
          </PopoverAnchor>
        </Popover>
      )
      const anchor = screen.getByTestId('anchor')
      expect(anchor).toBeInTheDocument()
      expect(anchor).toHaveAttribute('data-slot', 'popover-anchor')
    })

    it('renders children', () => {
      render(
        <Popover>
          <PopoverAnchor>
            <div>Anchor content</div>
          </PopoverAnchor>
        </Popover>
      )
      expect(screen.getByText('Anchor content')).toBeInTheDocument()
    })

    it('passes through additional props', () => {
      render(
        <Popover>
          <PopoverAnchor data-testid="anchor" id="my-anchor">
            <span>Anchor</span>
          </PopoverAnchor>
        </Popover>
      )
      expect(screen.getByTestId('anchor')).toHaveAttribute('id', 'my-anchor')
    })
  })

  describe('Popover composition', () => {
    it('renders trigger and anchor together', () => {
      render(
        <Popover>
          <PopoverAnchor data-testid="anchor">
            <span>Anchor here</span>
          </PopoverAnchor>
          <PopoverTrigger data-testid="trigger">Open</PopoverTrigger>
        </Popover>
      )

      expect(screen.getByTestId('anchor')).toBeInTheDocument()
      expect(screen.getByTestId('trigger')).toBeInTheDocument()
      expect(screen.getByText('Anchor here')).toBeInTheDocument()
      expect(screen.getByText('Open')).toBeInTheDocument()
    })

    it('can use custom button as trigger', () => {
      render(
        <Popover>
          <PopoverTrigger asChild>
            <button className="btn-primary">Show More</button>
          </PopoverTrigger>
        </Popover>
      )

      const button = screen.getByRole('button', { name: 'Show More' })
      expect(button).toBeInTheDocument()
      expect(button.className).toContain('btn-primary')
    })
  })
})
