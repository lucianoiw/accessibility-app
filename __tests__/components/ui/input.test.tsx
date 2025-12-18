import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'

describe('Input component', () => {
  it('renders with default styles', () => {
    render(<Input data-testid="input" />)
    const input = screen.getByTestId('input')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('data-slot', 'input')
    expect(input.className).toContain('rounded-md')
    expect(input.className).toContain('border')
  })

  it('renders with text type by default', () => {
    render(<Input />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
  })

  it('renders with different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')

    rerender(<Input type="password" data-testid="password" />)
    expect(screen.getByTestId('password')).toHaveAttribute('type', 'password')

    rerender(<Input type="number" data-testid="number" />)
    expect(screen.getByTestId('number')).toHaveAttribute('type', 'number')

    rerender(<Input type="search" />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()

    rerender(<Input type="tel" data-testid="tel" />)
    expect(screen.getByTestId('tel')).toHaveAttribute('type', 'tel')

    rerender(<Input type="url" data-testid="url" />)
    expect(screen.getByTestId('url')).toHaveAttribute('type', 'url')
  })

  it('accepts custom className', () => {
    render(<Input className="custom-input" />)
    const input = screen.getByRole('textbox')
    expect(input.className).toContain('custom-input')
  })

  it('handles value changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'hello')

    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('hello')
  })

  it('can be controlled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    const { rerender } = render(<Input value="initial" onChange={handleChange} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveValue('initial')

    rerender(<Input value="updated" onChange={handleChange} />)
    expect(input).toHaveValue('updated')
  })

  it('can be disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Input disabled onChange={handleChange} />)

    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()

    await user.type(input, 'test')
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('handles placeholder', () => {
    render(<Input placeholder="Enter your name" />)
    const input = screen.getByPlaceholderText('Enter your name')
    expect(input).toBeInTheDocument()
  })

  it('handles required attribute', () => {
    render(<Input required />)
    const input = screen.getByRole('textbox')
    expect(input).toBeRequired()
  })

  it('handles readonly attribute', () => {
    render(<Input readOnly value="readonly value" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('readonly')
    expect(input).toHaveValue('readonly value')
  })

  it('handles focus and blur events', async () => {
    const user = userEvent.setup()
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    render(<Input onFocus={handleFocus} onBlur={handleBlur} />)

    const input = screen.getByRole('textbox')

    await user.click(input)
    expect(handleFocus).toHaveBeenCalledTimes(1)

    await user.tab()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('supports aria-invalid for error states', () => {
    render(<Input aria-invalid="true" />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('supports aria-describedby for error messages', () => {
    render(
      <>
        <Input aria-describedby="error-message" aria-invalid="true" />
        <span id="error-message">This field is required</span>
      </>
    )
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('aria-describedby', 'error-message')
  })

  it('handles maxLength', async () => {
    const user = userEvent.setup()
    render(<Input maxLength={5} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'hello world')

    expect(input).toHaveValue('hello')
  })

  it('handles minLength', () => {
    render(<Input minLength={3} />)
    const input = screen.getByRole('textbox')
    expect(input).toHaveAttribute('minlength', '3')
  })

  it('passes through additional props', () => {
    render(
      <Input
        name="username"
        id="username-input"
        autoComplete="username"
        data-testid="test-input"
      />
    )
    const input = screen.getByTestId('test-input')
    expect(input).toHaveAttribute('name', 'username')
    expect(input).toHaveAttribute('id', 'username-input')
    expect(input).toHaveAttribute('autocomplete', 'username')
  })

  it('renders file input', () => {
    render(<Input type="file" data-testid="file-input" />)
    const input = screen.getByTestId('file-input')
    expect(input).toHaveAttribute('type', 'file')
  })

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup()
    render(
      <>
        <Input data-testid="input-1" />
        <Input data-testid="input-2" />
      </>
    )

    const input1 = screen.getByTestId('input-1')
    const input2 = screen.getByTestId('input-2')

    await user.click(input1)
    expect(input1).toHaveFocus()

    await user.tab()
    expect(input2).toHaveFocus()
  })
})
