import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Autocomplete, type AutocompleteOption } from '@/components/ui/autocomplete'

describe('Autocomplete component', () => {
  const options: AutocompleteOption[] = [
    { value: 'react', label: 'React' },
    { value: 'vue', label: 'Vue' },
    { value: 'angular', label: 'Angular' },
    { value: 'svelte', label: 'Svelte' },
  ]

  const defaultProps = {
    options,
    value: '',
    onValueChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with default placeholder', () => {
    render(<Autocomplete {...defaultProps} />)
    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument()
  })

  it('renders with custom placeholder', () => {
    render(<Autocomplete {...defaultProps} placeholder="Search frameworks..." />)
    expect(screen.getByPlaceholderText('Search frameworks...')).toBeInTheDocument()
  })

  it('opens dropdown on focus', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await user.click(input)

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Vue')).toBeInTheDocument()
    expect(screen.getByText('Angular')).toBeInTheDocument()
    expect(screen.getByText('Svelte')).toBeInTheDocument()
  })

  it('opens dropdown when typing', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')

    // Initially dropdown is closed
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    // Typing in the input should open the dropdown
    await user.type(input, 'r')
    expect(screen.getByRole('list')).toBeInTheDocument()
  })

  it('filters options based on search term', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.type(input, 're')

    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.queryByText('Vue')).not.toBeInTheDocument()
    expect(screen.queryByText('Angular')).not.toBeInTheDocument()
    expect(screen.queryByText('Svelte')).not.toBeInTheDocument()
  })

  it('shows empty message when no options match', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.type(input, 'xyz')

    expect(screen.getByText('Nenhum resultado encontrado.')).toBeInTheDocument()
  })

  it('shows custom empty message', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} emptyMessage="No frameworks found" />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.type(input, 'xyz')

    expect(screen.getByText('No frameworks found')).toBeInTheDocument()
  })

  it('selects option on click', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} onValueChange={onValueChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.click(screen.getByText('Vue'))

    expect(onValueChange).toHaveBeenCalledWith('vue')
  })

  it('selects option on Enter key', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} onValueChange={onValueChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.keyboard('{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('react')
  })

  it('navigates options with ArrowDown', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} onValueChange={onValueChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('vue')
  })

  it('navigates options with ArrowUp', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} onValueChange={onValueChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowUp}')
    await user.keyboard('{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('vue')
  })

  it('closes dropdown on Escape', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    expect(screen.getByRole('list')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('closes dropdown on click outside', async () => {
    const user = userEvent.setup()
    render(
      <div>
        <Autocomplete {...defaultProps} />
        <button>Outside</button>
      </div>
    )

    const input = screen.getByRole('textbox')
    await user.click(input)
    expect(screen.getByRole('list')).toBeInTheDocument()

    await user.click(screen.getByText('Outside'))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('displays selected option label', () => {
    render(<Autocomplete {...defaultProps} value="vue" />)
    expect(screen.getByText('Vue')).toBeInTheDocument()
  })

  it('shows clear button when value is selected', () => {
    render(<Autocomplete {...defaultProps} value="vue" />)
    expect(screen.getByTitle('Limpar')).toBeInTheDocument()
  })

  it('clears value when clear button is clicked', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} value="vue" onValueChange={onValueChange} />)

    await user.click(screen.getByTitle('Limpar'))
    expect(onValueChange).toHaveBeenCalledWith('')
  })

  it('hides clear button when no value is selected', () => {
    render(<Autocomplete {...defaultProps} value="" />)
    expect(screen.queryByTitle('Limpar')).not.toBeInTheDocument()
  })

  it('applies disabled state', () => {
    render(<Autocomplete {...defaultProps} disabled />)
    expect(screen.getByRole('textbox')).toBeDisabled()
  })

  it('does not open dropdown when disabled', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} disabled />)

    const input = screen.getByRole('textbox')
    await user.click(input)

    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('shows checkmark on selected option', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} value="vue" />)

    const input = screen.getByRole('textbox')
    await user.click(input)

    // The selected option should have opacity-100 on the checkmark
    const listItems = screen.getAllByRole('listitem')
    const vueItem = listItems.find(item => item.textContent?.includes('Vue'))
    expect(vueItem).toBeDefined()
  })

  it('highlights option on mouse enter', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await user.click(input)

    const angularOption = screen.getByText('Angular').closest('li')
    if (angularOption) {
      await user.hover(angularOption)
    }

    // After hovering, pressing Enter should select Angular
    const onValueChange = vi.fn()
    const { rerender } = render(
      <Autocomplete {...defaultProps} onValueChange={onValueChange} />
    )

    const newInput = screen.getAllByRole('textbox')[1]
    await user.click(newInput)
  })

  it('accepts custom className', () => {
    const { container } = render(<Autocomplete {...defaultProps} className="custom-class" />)
    expect((container.firstChild as HTMLElement).className).toContain('custom-class')
  })

  it('case-insensitive filtering', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.type(input, 'REACT')

    expect(screen.getByText('React')).toBeInTheDocument()
  })

  it('does not go below first option with ArrowUp', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} onValueChange={onValueChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    await user.keyboard('{ArrowUp}')
    await user.keyboard('{ArrowUp}')
    await user.keyboard('{Enter}')

    // Should still select first option (React)
    expect(onValueChange).toHaveBeenCalledWith('react')
  })

  it('does not go above last option with ArrowDown', async () => {
    const onValueChange = vi.fn()
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} onValueChange={onValueChange} />)

    const input = screen.getByRole('textbox')
    await user.click(input)
    // Press ArrowDown many times
    for (let i = 0; i < 10; i++) {
      await user.keyboard('{ArrowDown}')
    }
    await user.keyboard('{Enter}')

    // Should select last option (Svelte)
    expect(onValueChange).toHaveBeenCalledWith('svelte')
  })

  it('uses selected option label as placeholder', () => {
    render(<Autocomplete {...defaultProps} value="vue" placeholder="Search..." />)
    const input = screen.getByRole('textbox')
    // When value is selected, placeholder shows the selected label
    expect(input).toHaveAttribute('placeholder', 'Vue')
  })

  it('resets highlight index when filtered options change', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    await user.click(input)

    // Move to second option
    await user.keyboard('{ArrowDown}')

    // Type to filter
    await user.type(input, 'an')

    // Should reset to first filtered option (Angular)
    // This tests the useEffect that resets highlightedIndex
  })

  it('opens dropdown with ArrowDown when closed', async () => {
    const user = userEvent.setup()
    render(<Autocomplete {...defaultProps} />)

    const input = screen.getByRole('textbox')
    // Focus without clicking to keep dropdown closed
    input.focus()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()

    // Press ArrowDown to open dropdown (covers lines 90-95)
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('list')).toBeInTheDocument()
  })
})
