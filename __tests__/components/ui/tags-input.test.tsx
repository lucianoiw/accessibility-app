import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TagsInput } from '@/components/ui/tags-input'

describe('TagsInput component', () => {
  const defaultProps = {
    value: [] as string[],
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default placeholder', () => {
    render(<TagsInput {...defaultProps} />)
    expect(screen.getByPlaceholderText('Digite e pressione Enter...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<TagsInput {...defaultProps} placeholder="Add tags here" />)
    expect(screen.getByPlaceholderText('Add tags here')).toBeInTheDocument()
  })

  it('renders existing tags', () => {
    render(<TagsInput {...defaultProps} value={['react', 'typescript', 'nextjs']} />)
    expect(screen.getByText('react')).toBeInTheDocument()
    expect(screen.getByText('typescript')).toBeInTheDocument()
    expect(screen.getByText('nextjs')).toBeInTheDocument()
  })

  it('adds tag when pressing Enter', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'newtag{enter}')

    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  it('adds tag when pressing comma', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'newtag,')

    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  it('adds tag on blur', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'newtag')
    await user.tab()

    expect(onChange).toHaveBeenCalledWith(['newtag'])
  })

  it('trims and lowercases tags', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '  MyTag  {enter}')

    expect(onChange).toHaveBeenCalledWith(['mytag'])
  })

  it('does not add empty tags', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, '   {enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not add duplicate tags', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={['existing']} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'existing{enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes tag when clicking X button', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={['react', 'typescript']} onChange={onChange} />)

    const removeButton = screen.getByRole('button', { name: 'Remover react' })
    await user.click(removeButton)

    expect(onChange).toHaveBeenCalledWith(['typescript'])
  })

  it('removes last tag on Backspace when input is empty', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={['react', 'typescript']} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.keyboard('{Backspace}')

    expect(onChange).toHaveBeenCalledWith(['react'])
  })

  it('does not remove tag on Backspace when input has text', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={['react']} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'test')
    await user.keyboard('{Backspace}')

    // Should only remove character, not call onChange for tag removal
    expect(onChange).not.toHaveBeenCalled()
  })

  it('respects maxTags limit', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={['one', 'two']} onChange={onChange} maxTags={2} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'three{enter}')

    expect(onChange).not.toHaveBeenCalled()
  })

  it('disables input when maxTags is reached', () => {
    render(<TagsInput value={['one', 'two']} onChange={vi.fn()} maxTags={2} />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('applies disabled state to container', () => {
    const { container } = render(<TagsInput {...defaultProps} disabled />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('cursor-not-allowed')
    expect(wrapper.className).toContain('opacity-50')
  })

  it('disables input when disabled prop is true', () => {
    render(<TagsInput {...defaultProps} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('hides remove buttons when disabled', () => {
    render(<TagsInput value={['react']} onChange={vi.fn()} disabled />)
    expect(screen.queryByRole('button', { name: 'Remover react' })).not.toBeInTheDocument()
  })

  it('hides placeholder when tags exist', () => {
    render(<TagsInput value={['react']} onChange={vi.fn()} placeholder="Add tags" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', '')
  })

  it('accepts custom className', () => {
    const { container } = render(<TagsInput {...defaultProps} className="custom-class" />)
    expect((container.firstChild as HTMLElement).className).toContain('custom-class')
  })

  it('clears input after adding tag', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<TagsInput value={[]} onChange={onChange} />)

    const input = screen.getByRole('textbox')
    await user.type(input, 'newtag{enter}')

    expect(input).toHaveValue('')
  })

  it('renders tags as badges with secondary variant', () => {
    render(<TagsInput value={['react']} onChange={vi.fn()} />)
    const badge = screen.getByText('react').closest('[data-slot="badge"]')
    expect(badge).toBeInTheDocument()
  })
})
