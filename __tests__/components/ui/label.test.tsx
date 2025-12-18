import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Label } from '@/components/ui/label'

describe('Label component', () => {
  it('renders with default styles', () => {
    render(<Label>Username</Label>)
    const label = screen.getByText('Username')
    expect(label).toBeInTheDocument()
    expect(label).toHaveAttribute('data-slot', 'label')
    expect(label.className).toContain('text-sm')
    expect(label.className).toContain('font-medium')
  })

  it('accepts custom className', () => {
    render(<Label className="custom-label">Label</Label>)
    const label = screen.getByText('Label')
    expect(label.className).toContain('custom-label')
  })

  it('renders children correctly', () => {
    render(
      <Label>
        <span data-testid="icon">*</span>
        Required Field
      </Label>
    )
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Required Field')).toBeInTheDocument()
  })

  it('associates with input via htmlFor', () => {
    render(
      <>
        <Label htmlFor="email">Email</Label>
        <input id="email" type="email" />
      </>
    )
    const label = screen.getByText('Email')
    expect(label).toHaveAttribute('for', 'email')
  })

  it('passes through additional props', () => {
    render(<Label data-testid="test-label" id="my-label">Test</Label>)
    const label = screen.getByTestId('test-label')
    expect(label).toHaveAttribute('id', 'my-label')
  })

  it('can wrap input element', () => {
    render(
      <Label>
        Username
        <input type="text" data-testid="wrapped-input" />
      </Label>
    )
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(screen.getByTestId('wrapped-input')).toBeInTheDocument()
  })
})
