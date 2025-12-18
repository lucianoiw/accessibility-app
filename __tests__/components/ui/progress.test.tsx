import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Progress } from '@/components/ui/progress'

describe('Progress component', () => {
  it('renders with default value (0)', () => {
    render(<Progress data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    expect(progress).toBeInTheDocument()
    expect(progress).toHaveAttribute('data-slot', 'progress')
  })

  it('renders with specified value', () => {
    render(<Progress value={50} data-testid="progress" />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toBeInTheDocument()
    // Radix Progress stores value internally
    const indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-50%)' })
  })

  it('renders with 0% progress', () => {
    render(<Progress value={0} data-testid="progress" />)
    const progress = screen.getByRole('progressbar')
    const indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('renders with 100% progress', () => {
    render(<Progress value={100} data-testid="progress" />)
    const progress = screen.getByRole('progressbar')
    const indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-0%)' })
  })

  it('accepts custom className', () => {
    render(<Progress className="custom-progress" data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    expect(progress.className).toContain('custom-progress')
  })

  it('has correct base styles', () => {
    render(<Progress data-testid="progress" />)
    const progress = screen.getByTestId('progress')
    expect(progress.className).toContain('rounded-full')
    expect(progress.className).toContain('overflow-hidden')
  })

  it('renders indicator with correct transform', () => {
    render(<Progress value={75} />)
    const progress = screen.getByRole('progressbar')
    const indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toBeInTheDocument()
    expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' })
  })

  it('handles undefined value as 0', () => {
    render(<Progress value={undefined} />)
    const progress = screen.getByRole('progressbar')
    const indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-100%)' })
  })

  it('passes through additional props', () => {
    render(<Progress data-testid="progress" id="my-progress" />)
    const progress = screen.getByTestId('progress')
    expect(progress).toHaveAttribute('id', 'my-progress')
  })

  it('has accessible role', () => {
    render(<Progress value={50} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toBeInTheDocument()
  })

  it('updates indicator when value changes', () => {
    const { rerender } = render(<Progress value={25} />)
    let progress = screen.getByRole('progressbar')
    let indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-75%)' })

    rerender(<Progress value={75} />)
    progress = screen.getByRole('progressbar')
    indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator).toHaveStyle({ transform: 'translateX(-25%)' })
  })

  it('renders indicator with bg-primary class', () => {
    render(<Progress value={50} />)
    const progress = screen.getByRole('progressbar')
    const indicator = progress.querySelector('[data-slot="progress-indicator"]')
    expect(indicator?.className).toContain('bg-primary')
  })
})
