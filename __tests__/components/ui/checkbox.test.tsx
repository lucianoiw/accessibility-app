import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Checkbox } from '@/components/ui/checkbox'

describe('Checkbox component', () => {
  it('renders unchecked by default', () => {
    render(<Checkbox aria-label="Accept terms" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('data-slot', 'checkbox')
    expect(checkbox).not.toBeChecked()
  })

  it('renders checked when defaultChecked is true', () => {
    render(<Checkbox defaultChecked aria-label="Accept terms" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('can be toggled', async () => {
    const user = userEvent.setup()
    render(<Checkbox aria-label="Accept terms" />)

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('calls onCheckedChange when toggled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Checkbox onCheckedChange={handleChange} aria-label="Accept" />)

    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    expect(handleChange).toHaveBeenCalledWith(true)

    await user.click(checkbox)
    expect(handleChange).toHaveBeenCalledWith(false)
  })

  it('can be controlled', () => {
    const { rerender } = render(<Checkbox checked={false} aria-label="Accept" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    rerender(<Checkbox checked={true} aria-label="Accept" />)
    expect(checkbox).toBeChecked()
  })

  it('can be disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Checkbox disabled onCheckedChange={handleChange} aria-label="Accept" />)

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()

    await user.click(checkbox)
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('accepts custom className', () => {
    render(<Checkbox className="custom-checkbox" aria-label="Accept" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox.className).toContain('custom-checkbox')
  })

  it('supports aria-label', () => {
    render(<Checkbox aria-label="Accept terms and conditions" />)
    const checkbox = screen.getByLabelText('Accept terms and conditions')
    expect(checkbox).toBeInTheDocument()
  })

  it('supports aria-labelledby', () => {
    render(
      <>
        <span id="terms-label">Accept terms</span>
        <Checkbox aria-labelledby="terms-label" />
      </>
    )
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-labelledby', 'terms-label')
  })

  it('supports aria-invalid for error states', () => {
    render(<Checkbox aria-invalid="true" aria-label="Accept" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
  })

  it('can be focused via keyboard', async () => {
    const user = userEvent.setup()
    render(
      <>
        <button>Before</button>
        <Checkbox aria-label="Accept" />
      </>
    )

    await user.tab()
    await user.tab()

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveFocus()
  })

  it('can be toggled via keyboard (Space)', async () => {
    const user = userEvent.setup()
    render(<Checkbox aria-label="Accept" />)

    const checkbox = screen.getByRole('checkbox')
    checkbox.focus()

    await user.keyboard(' ')
    expect(checkbox).toBeChecked()

    await user.keyboard(' ')
    expect(checkbox).not.toBeChecked()
  })

  it('passes through additional props', () => {
    render(<Checkbox id="accept-checkbox" aria-label="Accept" data-testid="my-checkbox" />)
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toHaveAttribute('id', 'accept-checkbox')
    expect(checkbox).toHaveAttribute('data-testid', 'my-checkbox')
  })
})
