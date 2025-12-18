import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
} from '@/components/ui/dropdown-menu'

// Note: Full dropdown menu interaction tests with Portal are limited in jsdom.
// DropdownMenuContent uses Portal which may not render properly.
// For comprehensive testing, E2E tests with Playwright are recommended.

describe('DropdownMenu components', () => {
  describe('DropdownMenuTrigger', () => {
    it('renders with data-slot', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="trigger">Open Menu</DropdownMenuTrigger>
        </DropdownMenu>
      )
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'dropdown-menu-trigger')
    })

    it('can render as button', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button>Open</button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      )
      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    })

    it('passes through additional props', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="trigger" id="my-trigger">
            Trigger
          </DropdownMenuTrigger>
        </DropdownMenu>
      )
      expect(screen.getByTestId('trigger')).toHaveAttribute('id', 'my-trigger')
    })
  })

  describe('DropdownMenuGroup', () => {
    it('renders with data-slot', () => {
      render(
        <DropdownMenu>
          <DropdownMenuGroup data-testid="group">
            <span>Group content</span>
          </DropdownMenuGroup>
        </DropdownMenu>
      )
      const group = screen.getByTestId('group')
      expect(group).toBeInTheDocument()
      expect(group).toHaveAttribute('data-slot', 'dropdown-menu-group')
    })

    it('renders children', () => {
      render(
        <DropdownMenu>
          <DropdownMenuGroup>
            <span>Item 1</span>
            <span>Item 2</span>
          </DropdownMenuGroup>
        </DropdownMenu>
      )
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
  })

  describe('DropdownMenuLabel', () => {
    it('renders with default styles', () => {
      render(
        <DropdownMenu>
          <DropdownMenuLabel data-testid="label">Actions</DropdownMenuLabel>
        </DropdownMenu>
      )
      const label = screen.getByTestId('label')
      expect(label).toBeInTheDocument()
      expect(label).toHaveAttribute('data-slot', 'dropdown-menu-label')
      expect(label.className).toContain('text-sm')
      expect(label.className).toContain('font-medium')
    })

    it('accepts custom className', () => {
      render(
        <DropdownMenu>
          <DropdownMenuLabel className="custom-label">Label</DropdownMenuLabel>
        </DropdownMenu>
      )
      expect(screen.getByText('Label').className).toContain('custom-label')
    })

    it('supports inset prop', () => {
      render(
        <DropdownMenu>
          <DropdownMenuLabel data-testid="label" inset>
            Inset Label
          </DropdownMenuLabel>
        </DropdownMenu>
      )
      const label = screen.getByTestId('label')
      expect(label).toHaveAttribute('data-inset', 'true')
    })

    it('has padding when inset is true', () => {
      render(
        <DropdownMenu>
          <DropdownMenuLabel inset>Label</DropdownMenuLabel>
        </DropdownMenu>
      )
      const label = screen.getByText('Label')
      expect(label.className).toContain('data-[inset]:pl-8')
    })
  })

  describe('DropdownMenuSeparator', () => {
    it('renders with data-slot', () => {
      render(
        <DropdownMenu>
          <DropdownMenuSeparator data-testid="separator" />
        </DropdownMenu>
      )
      const separator = screen.getByTestId('separator')
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveAttribute('data-slot', 'dropdown-menu-separator')
    })

    it('has default styles', () => {
      render(
        <DropdownMenu>
          <DropdownMenuSeparator data-testid="separator" />
        </DropdownMenu>
      )
      const separator = screen.getByTestId('separator')
      expect(separator.className).toContain('bg-border')
      expect(separator.className).toContain('h-px')
    })

    it('accepts custom className', () => {
      render(
        <DropdownMenu>
          <DropdownMenuSeparator className="custom-separator" data-testid="separator" />
        </DropdownMenu>
      )
      expect(screen.getByTestId('separator').className).toContain('custom-separator')
    })
  })

  describe('DropdownMenuShortcut', () => {
    it('renders with default styles', () => {
      render(
        <DropdownMenu>
          <DropdownMenuShortcut data-testid="shortcut">⌘K</DropdownMenuShortcut>
        </DropdownMenu>
      )
      const shortcut = screen.getByTestId('shortcut')
      expect(shortcut).toBeInTheDocument()
      expect(shortcut).toHaveAttribute('data-slot', 'dropdown-menu-shortcut')
      expect(shortcut.className).toContain('text-muted-foreground')
      expect(shortcut.className).toContain('text-xs')
      expect(shortcut.className).toContain('ml-auto')
    })

    it('renders shortcut text', () => {
      render(
        <DropdownMenu>
          <DropdownMenuShortcut>Ctrl+S</DropdownMenuShortcut>
        </DropdownMenu>
      )
      expect(screen.getByText('Ctrl+S')).toBeInTheDocument()
    })

    it('accepts custom className', () => {
      render(
        <DropdownMenu>
          <DropdownMenuShortcut className="custom-shortcut">⌘P</DropdownMenuShortcut>
        </DropdownMenu>
      )
      expect(screen.getByText('⌘P').className).toContain('custom-shortcut')
    })
  })

  describe('DropdownMenuSub', () => {
    it('renders children (Sub is a context provider, not a DOM element)', () => {
      render(
        <DropdownMenu>
          <DropdownMenuSub>
            <span>Submenu content</span>
          </DropdownMenuSub>
        </DropdownMenu>
      )
      // DropdownMenuSub is a context provider, not a DOM element
      // It renders its children directly
      expect(screen.getByText('Submenu content')).toBeInTheDocument()
    })
  })

  describe('DropdownMenu composition', () => {
    it('renders complete menu structure', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger data-testid="trigger">Open</DropdownMenuTrigger>
          <DropdownMenuGroup data-testid="group">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator data-testid="separator" />
            <div>
              Profile
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </div>
          </DropdownMenuGroup>
        </DropdownMenu>
      )

      expect(screen.getByTestId('trigger')).toBeInTheDocument()
      expect(screen.getByTestId('group')).toBeInTheDocument()
      expect(screen.getByText('My Account')).toBeInTheDocument()
      expect(screen.getByTestId('separator')).toBeInTheDocument()
      expect(screen.getByText('Profile')).toBeInTheDocument()
      expect(screen.getByText('⇧⌘P')).toBeInTheDocument()
    })

    it('renders multiple groups with labels', () => {
      render(
        <DropdownMenu>
          <DropdownMenuGroup>
            <DropdownMenuLabel>Group 1</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator data-testid="sep" />
          <DropdownMenuGroup>
            <DropdownMenuLabel>Group 2</DropdownMenuLabel>
          </DropdownMenuGroup>
        </DropdownMenu>
      )

      expect(screen.getByText('Group 1')).toBeInTheDocument()
      expect(screen.getByText('Group 2')).toBeInTheDocument()
      expect(screen.getByTestId('sep')).toBeInTheDocument()
    })
  })
})
