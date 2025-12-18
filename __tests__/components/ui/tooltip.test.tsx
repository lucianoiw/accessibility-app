import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'

// Note: Full tooltip interaction tests are skipped because Radix Tooltip
// uses Portal and ResizeObserver which don't work well in jsdom.
// For full testing, E2E tests with Playwright are recommended.

describe('Tooltip components', () => {
  it('renders trigger without showing content initially', () => {
    render(
      <Tooltip>
        <TooltipTrigger>Hover me</TooltipTrigger>
        <TooltipContent>Tooltip text</TooltipContent>
      </Tooltip>
    )

    expect(screen.getByText('Hover me')).toBeInTheDocument()
    // Content is not visible initially (rendered in portal)
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
  })

  it('trigger has correct data-slot', () => {
    render(
      <Tooltip>
        <TooltipTrigger data-testid="trigger">Hover</TooltipTrigger>
        <TooltipContent>Content</TooltipContent>
      </Tooltip>
    )

    expect(screen.getByTestId('trigger')).toHaveAttribute('data-slot', 'tooltip-trigger')
  })

  it('renders with button as trigger using asChild', () => {
    render(
      <Tooltip>
        <TooltipTrigger asChild>
          <button>Button trigger</button>
        </TooltipTrigger>
        <TooltipContent>Tooltip for button</TooltipContent>
      </Tooltip>
    )

    expect(screen.getByRole('button', { name: 'Button trigger' })).toBeInTheDocument()
  })

  it('trigger can have custom className', () => {
    render(
      <Tooltip>
        <TooltipTrigger className="custom-trigger" data-testid="trigger">
          Trigger
        </TooltipTrigger>
        <TooltipContent>Content</TooltipContent>
      </Tooltip>
    )

    expect(screen.getByTestId('trigger').className).toContain('custom-trigger')
  })

  it('passes through additional props to trigger', () => {
    render(
      <Tooltip>
        <TooltipTrigger id="my-trigger" data-testid="trigger">
          Trigger
        </TooltipTrigger>
        <TooltipContent>Content</TooltipContent>
      </Tooltip>
    )

    expect(screen.getByTestId('trigger')).toHaveAttribute('id', 'my-trigger')
  })
})

describe('TooltipProvider', () => {
  it('renders children', () => {
    render(
      <TooltipProvider>
        <div>Child content</div>
      </TooltipProvider>
    )

    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('accepts custom delayDuration', () => {
    // This mainly tests that the prop is accepted without error
    render(
      <TooltipProvider delayDuration={500}>
        <div>Content</div>
      </TooltipProvider>
    )

    expect(screen.getByText('Content')).toBeInTheDocument()
  })

  it('can wrap multiple tooltips', () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Trigger 1</TooltipTrigger>
          <TooltipContent>Content 1</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger>Trigger 2</TooltipTrigger>
          <TooltipContent>Content 2</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )

    expect(screen.getByText('Trigger 1')).toBeInTheDocument()
    expect(screen.getByText('Trigger 2')).toBeInTheDocument()
  })
})
