import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible'

describe('Collapsible components', () => {
  it('renders collapsed by default', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Hidden content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Toggle')).toBeInTheDocument()
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })

  it('expands content when trigger is clicked', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Expandable content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')
    await user.click(trigger)

    expect(screen.getByText('Expandable content')).toBeInTheDocument()
  })

  it('collapses content when trigger is clicked again', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')

    await user.click(trigger)
    expect(screen.getByText('Content')).toBeInTheDocument()

    await user.click(trigger)
    expect(screen.queryByText('Content')).not.toBeInTheDocument()
  })

  it('renders expanded when defaultOpen is true', () => {
    render(
      <Collapsible defaultOpen>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Initially visible</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByText('Initially visible')).toBeInTheDocument()
  })

  it('can be controlled', async () => {
    const user = userEvent.setup()
    const handleOpenChange = vi.fn()

    render(
      <Collapsible open={false} onOpenChange={handleOpenChange}>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Controlled content</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')
    await user.click(trigger)

    expect(handleOpenChange).toHaveBeenCalledWith(true)
  })

  it('trigger has correct data-slot', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger data-testid="trigger">Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByTestId('trigger')).toHaveAttribute('data-slot', 'collapsible-trigger')
  })

  it('content has correct data-slot when visible', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent data-testid="content">Content</CollapsibleContent>
      </Collapsible>
    )

    await user.click(screen.getByText('Toggle'))

    expect(screen.getByTestId('content')).toHaveAttribute('data-slot', 'collapsible-content')
  })

  it('root has correct data-slot', () => {
    render(
      <Collapsible data-testid="root">
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByTestId('root')).toHaveAttribute('data-slot', 'collapsible')
  })

  it('can be triggered via keyboard', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Keyboard accessible</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')
    trigger.focus()

    await user.keyboard('{Enter}')
    expect(screen.getByText('Keyboard accessible')).toBeInTheDocument()

    await user.keyboard('{Enter}')
    expect(screen.queryByText('Keyboard accessible')).not.toBeInTheDocument()
  })

  it('can be triggered with Space key', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Space triggered</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')
    trigger.focus()

    await user.keyboard(' ')
    expect(screen.getByText('Space triggered')).toBeInTheDocument()
  })

  it('trigger can be a button', () => {
    render(
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button>Button Toggle</button>
        </CollapsibleTrigger>
        <CollapsibleContent>Content</CollapsibleContent>
      </Collapsible>
    )

    expect(screen.getByRole('button', { name: 'Button Toggle' })).toBeInTheDocument()
  })

  it('can be disabled', async () => {
    const user = userEvent.setup()
    render(
      <Collapsible disabled>
        <CollapsibleTrigger>Toggle</CollapsibleTrigger>
        <CollapsibleContent>Should not show</CollapsibleContent>
      </Collapsible>
    )

    const trigger = screen.getByText('Toggle')
    await user.click(trigger)

    expect(screen.queryByText('Should not show')).not.toBeInTheDocument()
  })
})
