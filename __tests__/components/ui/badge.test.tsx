import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, badgeVariants } from '@/components/ui/badge'

describe('Badge component', () => {
  it('renders with default variant', () => {
    render(<Badge>Default Badge</Badge>)
    const badge = screen.getByText('Default Badge')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute('data-slot', 'badge')
  })

  it('renders with secondary variant', () => {
    render(<Badge variant="secondary">Secondary</Badge>)
    const badge = screen.getByText('Secondary')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-secondary')
  })

  it('renders with destructive variant', () => {
    render(<Badge variant="destructive">Destructive</Badge>)
    const badge = screen.getByText('Destructive')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('bg-destructive')
  })

  it('renders with outline variant', () => {
    render(<Badge variant="outline">Outline</Badge>)
    const badge = screen.getByText('Outline')
    expect(badge).toBeInTheDocument()
    expect(badge.className).toContain('text-foreground')
  })

  it('accepts custom className', () => {
    render(<Badge className="custom-class">With Custom Class</Badge>)
    const badge = screen.getByText('With Custom Class')
    expect(badge.className).toContain('custom-class')
  })

  it('renders as span by default', () => {
    render(<Badge>Span Badge</Badge>)
    const badge = screen.getByText('Span Badge')
    expect(badge.tagName.toLowerCase()).toBe('span')
  })

  it('renders as child element when asChild is true', () => {
    render(
      <Badge asChild>
        <a href="/test">Link Badge</a>
      </Badge>
    )
    const badge = screen.getByText('Link Badge')
    expect(badge.tagName.toLowerCase()).toBe('a')
    expect(badge).toHaveAttribute('href', '/test')
  })

  it('passes through additional props', () => {
    render(<Badge data-testid="test-badge" id="my-badge">Props Badge</Badge>)
    const badge = screen.getByTestId('test-badge')
    expect(badge).toHaveAttribute('id', 'my-badge')
  })

  it('renders children correctly', () => {
    render(
      <Badge>
        <span>Icon</span>
        Text
      </Badge>
    )
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Text')).toBeInTheDocument()
  })
})

describe('badgeVariants', () => {
  it('returns base classes without variant', () => {
    const classes = badgeVariants()
    expect(classes).toContain('inline-flex')
    expect(classes).toContain('items-center')
    expect(classes).toContain('rounded-full')
  })

  it('returns correct classes for default variant', () => {
    const classes = badgeVariants({ variant: 'default' })
    expect(classes).toContain('bg-primary')
    expect(classes).toContain('text-primary-foreground')
  })

  it('returns correct classes for secondary variant', () => {
    const classes = badgeVariants({ variant: 'secondary' })
    expect(classes).toContain('bg-secondary')
    expect(classes).toContain('text-secondary-foreground')
  })

  it('returns correct classes for destructive variant', () => {
    const classes = badgeVariants({ variant: 'destructive' })
    expect(classes).toContain('bg-destructive')
    expect(classes).toContain('text-white')
  })

  it('returns correct classes for outline variant', () => {
    const classes = badgeVariants({ variant: 'outline' })
    expect(classes).toContain('text-foreground')
  })
})
