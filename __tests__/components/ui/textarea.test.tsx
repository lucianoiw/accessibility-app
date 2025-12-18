import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '@/components/ui/textarea'

describe('Textarea component', () => {
  it('renders with default styles', () => {
    render(<Textarea data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toBeInTheDocument()
    expect(textarea).toHaveAttribute('data-slot', 'textarea')
    expect(textarea.className).toContain('rounded-md')
    expect(textarea.className).toContain('border')
  })

  it('accepts custom className', () => {
    render(<Textarea className="custom-textarea" />)
    const textarea = screen.getByRole('textbox')
    expect(textarea.className).toContain('custom-textarea')
  })

  it('handles value changes', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Textarea onChange={handleChange} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Hello world')

    expect(handleChange).toHaveBeenCalled()
    expect(textarea).toHaveValue('Hello world')
  })

  it('can be controlled', () => {
    const { rerender } = render(<Textarea value="initial" onChange={() => {}} />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveValue('initial')

    rerender(<Textarea value="updated" onChange={() => {}} />)
    expect(textarea).toHaveValue('updated')
  })

  it('can be disabled', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<Textarea disabled onChange={handleChange} />)

    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeDisabled()

    await user.type(textarea, 'test')
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('handles placeholder', () => {
    render(<Textarea placeholder="Enter your message" />)
    const textarea = screen.getByPlaceholderText('Enter your message')
    expect(textarea).toBeInTheDocument()
  })

  it('handles required attribute', () => {
    render(<Textarea required />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toBeRequired()
  })

  it('handles readonly attribute', () => {
    render(<Textarea readOnly value="readonly text" />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('readonly')
    expect(textarea).toHaveValue('readonly text')
  })

  it('handles rows attribute', () => {
    render(<Textarea rows={10} data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('rows', '10')
  })

  it('handles cols attribute', () => {
    render(<Textarea cols={50} data-testid="textarea" />)
    const textarea = screen.getByTestId('textarea')
    expect(textarea).toHaveAttribute('cols', '50')
  })

  it('handles maxLength', async () => {
    const user = userEvent.setup()
    render(<Textarea maxLength={10} />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'This is a very long text')

    expect(textarea).toHaveValue('This is a ')
  })

  it('supports aria-invalid for error states', () => {
    render(<Textarea aria-invalid="true" />)
    const textarea = screen.getByRole('textbox')
    expect(textarea).toHaveAttribute('aria-invalid', 'true')
  })

  it('handles focus and blur events', async () => {
    const user = userEvent.setup()
    const handleFocus = vi.fn()
    const handleBlur = vi.fn()
    render(<Textarea onFocus={handleFocus} onBlur={handleBlur} />)

    const textarea = screen.getByRole('textbox')

    await user.click(textarea)
    expect(handleFocus).toHaveBeenCalledTimes(1)

    await user.tab()
    expect(handleBlur).toHaveBeenCalledTimes(1)
  })

  it('passes through additional props', () => {
    render(
      <Textarea
        name="message"
        id="message-input"
        data-testid="test-textarea"
      />
    )
    const textarea = screen.getByTestId('test-textarea')
    expect(textarea).toHaveAttribute('name', 'message')
    expect(textarea).toHaveAttribute('id', 'message-input')
  })

  it('handles multiline input', async () => {
    const user = userEvent.setup()
    render(<Textarea />)

    const textarea = screen.getByRole('textbox')
    await user.type(textarea, 'Line 1{enter}Line 2{enter}Line 3')

    expect(textarea).toHaveValue('Line 1\nLine 2\nLine 3')
  })
})
