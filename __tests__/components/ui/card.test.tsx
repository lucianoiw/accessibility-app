import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '@/components/ui/card'

describe('Card component', () => {
  it('renders with default styles', () => {
    render(<Card data-testid="card">Card content</Card>)
    const card = screen.getByTestId('card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('data-slot', 'card')
    expect(card.className).toContain('bg-card')
    expect(card.className).toContain('rounded-xl')
  })

  it('accepts custom className', () => {
    render(<Card className="custom-class">Content</Card>)
    const card = screen.getByText('Content')
    expect(card.className).toContain('custom-class')
  })

  it('renders children correctly', () => {
    render(
      <Card>
        <span>Child 1</span>
        <span>Child 2</span>
      </Card>
    )
    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
  })
})

describe('CardHeader component', () => {
  it('renders with default styles', () => {
    render(<CardHeader data-testid="header">Header content</CardHeader>)
    const header = screen.getByTestId('header')
    expect(header).toBeInTheDocument()
    expect(header).toHaveAttribute('data-slot', 'card-header')
    expect(header.className).toContain('px-6')
  })

  it('accepts custom className', () => {
    render(<CardHeader className="custom-header">Header</CardHeader>)
    expect(screen.getByText('Header').className).toContain('custom-header')
  })
})

describe('CardTitle component', () => {
  it('renders with default styles', () => {
    render(<CardTitle>Title</CardTitle>)
    const title = screen.getByText('Title')
    expect(title).toBeInTheDocument()
    expect(title).toHaveAttribute('data-slot', 'card-title')
    expect(title.className).toContain('font-semibold')
  })

  it('accepts custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>)
    expect(screen.getByText('Title').className).toContain('custom-title')
  })
})

describe('CardDescription component', () => {
  it('renders with default styles', () => {
    render(<CardDescription>Description</CardDescription>)
    const desc = screen.getByText('Description')
    expect(desc).toBeInTheDocument()
    expect(desc).toHaveAttribute('data-slot', 'card-description')
    expect(desc.className).toContain('text-muted-foreground')
    expect(desc.className).toContain('text-sm')
  })

  it('accepts custom className', () => {
    render(<CardDescription className="custom-desc">Description</CardDescription>)
    expect(screen.getByText('Description').className).toContain('custom-desc')
  })
})

describe('CardAction component', () => {
  it('renders with default styles', () => {
    render(<CardAction data-testid="action">Action</CardAction>)
    const action = screen.getByTestId('action')
    expect(action).toBeInTheDocument()
    expect(action).toHaveAttribute('data-slot', 'card-action')
    expect(action.className).toContain('self-start')
  })

  it('accepts custom className', () => {
    render(<CardAction className="custom-action">Action</CardAction>)
    expect(screen.getByText('Action').className).toContain('custom-action')
  })
})

describe('CardContent component', () => {
  it('renders with default styles', () => {
    render(<CardContent data-testid="content">Content</CardContent>)
    const content = screen.getByTestId('content')
    expect(content).toBeInTheDocument()
    expect(content).toHaveAttribute('data-slot', 'card-content')
    expect(content.className).toContain('px-6')
  })

  it('accepts custom className', () => {
    render(<CardContent className="custom-content">Content</CardContent>)
    expect(screen.getByText('Content').className).toContain('custom-content')
  })
})

describe('CardFooter component', () => {
  it('renders with default styles', () => {
    render(<CardFooter data-testid="footer">Footer</CardFooter>)
    const footer = screen.getByTestId('footer')
    expect(footer).toBeInTheDocument()
    expect(footer).toHaveAttribute('data-slot', 'card-footer')
    expect(footer.className).toContain('flex')
    expect(footer.className).toContain('px-6')
  })

  it('accepts custom className', () => {
    render(<CardFooter className="custom-footer">Footer</CardFooter>)
    expect(screen.getByText('Footer').className).toContain('custom-footer')
  })
})

describe('Card composition', () => {
  it('renders complete card structure', () => {
    render(
      <Card data-testid="full-card">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card description text</CardDescription>
          <CardAction>
            <button>Action</button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p>Main content goes here</p>
        </CardContent>
        <CardFooter>
          <button>Footer button</button>
        </CardFooter>
      </Card>
    )

    expect(screen.getByTestId('full-card')).toBeInTheDocument()
    expect(screen.getByText('Card Title')).toBeInTheDocument()
    expect(screen.getByText('Card description text')).toBeInTheDocument()
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Main content goes here')).toBeInTheDocument()
    expect(screen.getByText('Footer button')).toBeInTheDocument()
  })
})
