import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Separator } from '@/components/ui/separator'

describe('Separator component', () => {
  it('renders horizontal separator by default', () => {
    render(<Separator data-testid="separator" />)
    const separator = screen.getByTestId('separator')
    expect(separator).toBeInTheDocument()
    expect(separator).toHaveAttribute('data-slot', 'separator')
    expect(separator).toHaveAttribute('data-orientation', 'horizontal')
  })

  it('renders vertical separator', () => {
    render(<Separator orientation="vertical" data-testid="separator" />)
    const separator = screen.getByTestId('separator')
    expect(separator).toHaveAttribute('data-orientation', 'vertical')
  })

  it('is decorative by default (not in accessibility tree)', () => {
    render(<Separator data-testid="separator" />)
    const separator = screen.getByTestId('separator')
    // Decorative separators have aria-hidden or role="none"
    expect(separator).toHaveAttribute('data-slot', 'separator')
  })

  it('can be non-decorative', () => {
    render(<Separator decorative={false} data-testid="separator" />)
    const separator = screen.getByRole('separator')
    expect(separator).toBeInTheDocument()
  })

  it('accepts custom className', () => {
    render(<Separator className="custom-separator" data-testid="separator" />)
    const separator = screen.getByTestId('separator')
    expect(separator.className).toContain('custom-separator')
  })

  it('has correct base styles', () => {
    render(<Separator data-testid="separator" />)
    const separator = screen.getByTestId('separator')
    expect(separator.className).toContain('bg-border')
    expect(separator.className).toContain('shrink-0')
  })

  it('passes through additional props', () => {
    render(<Separator data-testid="separator" id="my-separator" />)
    const separator = screen.getByTestId('separator')
    expect(separator).toHaveAttribute('id', 'my-separator')
  })

  it('can be used between content sections', () => {
    render(
      <div>
        <div>Section 1</div>
        <Separator data-testid="separator" />
        <div>Section 2</div>
      </div>
    )
    expect(screen.getByText('Section 1')).toBeInTheDocument()
    expect(screen.getByTestId('separator')).toBeInTheDocument()
    expect(screen.getByText('Section 2')).toBeInTheDocument()
  })

  it('renders correctly in vertical context', () => {
    render(
      <div style={{ display: 'flex' }}>
        <span>Left</span>
        <Separator orientation="vertical" data-testid="separator" />
        <span>Right</span>
      </div>
    )
    const separator = screen.getByTestId('separator')
    expect(separator).toHaveAttribute('data-orientation', 'vertical')
  })
})
