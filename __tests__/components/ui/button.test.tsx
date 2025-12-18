import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button, buttonVariants } from '@/components/ui/button'

describe('Button component', () => {
  it('renders with default variant and size', () => {
    render(<Button>Click me</Button>)
    const button = screen.getByRole('button', { name: 'Click me' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-slot', 'button')
  })

  it('renders with different variants', () => {
    const { rerender } = render(<Button variant="default">Default</Button>)
    expect(screen.getByRole('button').className).toContain('bg-primary')

    rerender(<Button variant="secondary">Secondary</Button>)
    expect(screen.getByRole('button').className).toContain('bg-secondary')

    rerender(<Button variant="destructive">Destructive</Button>)
    expect(screen.getByRole('button').className).toContain('bg-destructive')

    rerender(<Button variant="outline">Outline</Button>)
    expect(screen.getByRole('button').className).toContain('border')

    rerender(<Button variant="ghost">Ghost</Button>)
    expect(screen.getByRole('button').className).toContain('hover:bg-accent')

    rerender(<Button variant="link">Link</Button>)
    expect(screen.getByRole('button').className).toContain('underline-offset-4')
  })

  it('renders with different sizes', () => {
    const { rerender } = render(<Button size="default">Default</Button>)
    expect(screen.getByRole('button').className).toContain('h-9')

    rerender(<Button size="sm">Small</Button>)
    expect(screen.getByRole('button').className).toContain('h-8')

    rerender(<Button size="lg">Large</Button>)
    expect(screen.getByRole('button').className).toContain('h-10')

    rerender(<Button size="icon">Icon</Button>)
    expect(screen.getByRole('button').className).toContain('size-9')
  })

  it('accepts custom className', () => {
    render(<Button className="custom-class">Custom</Button>)
    expect(screen.getByRole('button').className).toContain('custom-class')
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    await user.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders as child element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link', { name: 'Link Button' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })

  it('passes through additional props', () => {
    render(
      <Button type="submit" form="my-form" data-testid="submit-btn">
        Submit
      </Button>
    )
    const button = screen.getByTestId('submit-btn')
    expect(button).toHaveAttribute('type', 'submit')
    expect(button).toHaveAttribute('form', 'my-form')
  })

  it('renders children correctly', () => {
    render(
      <Button>
        <span data-testid="icon">🔥</span>
        Fire
      </Button>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Fire')).toBeInTheDocument()
  })

  it('supports keyboard interaction', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Keyboard</Button>)

    const button = screen.getByRole('button')
    button.focus()
    expect(button).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(handleClick).toHaveBeenCalledTimes(1)

    await user.keyboard(' ')
    expect(handleClick).toHaveBeenCalledTimes(2)
  })
})

describe('buttonVariants', () => {
  it('returns base classes', () => {
    const classes = buttonVariants()
    expect(classes).toContain('inline-flex')
    expect(classes).toContain('items-center')
    expect(classes).toContain('justify-center')
    expect(classes).toContain('rounded-md')
  })

  it('returns correct classes for variants', () => {
    expect(buttonVariants({ variant: 'default' })).toContain('bg-primary')
    expect(buttonVariants({ variant: 'secondary' })).toContain('bg-secondary')
    expect(buttonVariants({ variant: 'destructive' })).toContain('bg-destructive')
    expect(buttonVariants({ variant: 'outline' })).toContain('border')
    expect(buttonVariants({ variant: 'ghost' })).toContain('hover:bg-accent')
    expect(buttonVariants({ variant: 'link' })).toContain('text-primary')
  })

  it('returns correct classes for sizes', () => {
    expect(buttonVariants({ size: 'default' })).toContain('h-9')
    expect(buttonVariants({ size: 'sm' })).toContain('h-8')
    expect(buttonVariants({ size: 'lg' })).toContain('h-10')
    expect(buttonVariants({ size: 'icon' })).toContain('size-9')
    expect(buttonVariants({ size: 'icon-sm' })).toContain('size-8')
    expect(buttonVariants({ size: 'icon-lg' })).toContain('size-10')
  })

  it('merges custom className', () => {
    const classes = buttonVariants({ className: 'my-custom-class' })
    expect(classes).toContain('my-custom-class')
  })

  it('combines variant and size', () => {
    const classes = buttonVariants({ variant: 'destructive', size: 'lg' })
    expect(classes).toContain('bg-destructive')
    expect(classes).toContain('h-10')
  })
})
