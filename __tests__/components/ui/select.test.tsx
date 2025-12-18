import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
} from '@/components/ui/select'

// Note: Full select interaction tests with Portal are limited in jsdom.
// SelectContent uses Portal which may not render properly.
// For comprehensive testing, E2E tests with Playwright are recommended.

describe('Select components', () => {
  describe('SelectTrigger', () => {
    it('renders with default styles', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      )
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'select-trigger')
      expect(trigger.className).toContain('rounded-md')
      expect(trigger.className).toContain('border')
    })

    it('renders with default size', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveAttribute('data-size', 'default')
    })

    it('renders with small size', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger" size="sm">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toHaveAttribute('data-size', 'sm')
    })

    it('accepts custom className', () => {
      render(
        <Select>
          <SelectTrigger className="custom-trigger" data-testid="trigger">
            <SelectValue />
          </SelectTrigger>
        </Select>
      )
      expect(screen.getByTestId('trigger').className).toContain('custom-trigger')
    })

    it('shows chevron icon', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
        </Select>
      )
      // Chevron icon should be present
      const trigger = screen.getByTestId('trigger')
      const svg = trigger.querySelector('svg')
      expect(svg).toBeInTheDocument()
    })
  })

  describe('SelectValue', () => {
    it('renders with data-slot', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue data-testid="value" placeholder="Select an option" />
          </SelectTrigger>
        </Select>
      )
      const value = screen.getByTestId('value')
      expect(value).toBeInTheDocument()
      expect(value).toHaveAttribute('data-slot', 'select-value')
    })

    it('shows placeholder text', () => {
      render(
        <Select>
          <SelectTrigger>
            <SelectValue placeholder="Pick something" />
          </SelectTrigger>
        </Select>
      )
      expect(screen.getByText('Pick something')).toBeInTheDocument()
    })
  })

  describe('SelectGroup', () => {
    it('renders with data-slot', () => {
      render(
        <Select>
          <SelectGroup data-testid="group">
            <span>Group content</span>
          </SelectGroup>
        </Select>
      )
      const group = screen.getByTestId('group')
      expect(group).toBeInTheDocument()
      expect(group).toHaveAttribute('data-slot', 'select-group')
    })

    it('renders children', () => {
      render(
        <Select>
          <SelectGroup>
            <span>Item 1</span>
            <span>Item 2</span>
          </SelectGroup>
        </Select>
      )
      expect(screen.getByText('Item 1')).toBeInTheDocument()
      expect(screen.getByText('Item 2')).toBeInTheDocument()
    })
  })

  describe('SelectLabel', () => {
    it('renders with default styles', () => {
      render(
        <Select>
          <SelectGroup>
            <SelectLabel data-testid="label">Fruits</SelectLabel>
          </SelectGroup>
        </Select>
      )
      const label = screen.getByTestId('label')
      expect(label).toBeInTheDocument()
      expect(label).toHaveAttribute('data-slot', 'select-label')
      expect(label.className).toContain('text-xs')
    })

    it('accepts custom className', () => {
      render(
        <Select>
          <SelectGroup>
            <SelectLabel className="custom-label">Label</SelectLabel>
          </SelectGroup>
        </Select>
      )
      expect(screen.getByText('Label').className).toContain('custom-label')
    })
  })

  describe('SelectSeparator', () => {
    it('renders with data-slot', () => {
      render(
        <Select>
          <SelectSeparator data-testid="separator" />
        </Select>
      )
      const separator = screen.getByTestId('separator')
      expect(separator).toBeInTheDocument()
      expect(separator).toHaveAttribute('data-slot', 'select-separator')
    })

    it('has default styles', () => {
      render(
        <Select>
          <SelectSeparator data-testid="separator" />
        </Select>
      )
      const separator = screen.getByTestId('separator')
      expect(separator.className).toContain('bg-border')
      expect(separator.className).toContain('h-px')
    })

    it('accepts custom className', () => {
      render(
        <Select>
          <SelectSeparator className="custom-separator" data-testid="separator" />
        </Select>
      )
      expect(screen.getByTestId('separator').className).toContain('custom-separator')
    })
  })

  describe('Select composition', () => {
    it('renders complete select structure', () => {
      render(
        <Select>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Select a fruit" />
          </SelectTrigger>
          <SelectGroup data-testid="group">
            <SelectLabel>Fruits</SelectLabel>
            <SelectSeparator data-testid="separator" />
          </SelectGroup>
        </Select>
      )

      expect(screen.getByTestId('trigger')).toBeInTheDocument()
      expect(screen.getByText('Select a fruit')).toBeInTheDocument()
      expect(screen.getByTestId('group')).toBeInTheDocument()
      expect(screen.getByText('Fruits')).toBeInTheDocument()
      expect(screen.getByTestId('separator')).toBeInTheDocument()
    })

    it('can be disabled', () => {
      render(
        <Select disabled>
          <SelectTrigger data-testid="trigger">
            <SelectValue placeholder="Disabled" />
          </SelectTrigger>
        </Select>
      )

      expect(screen.getByTestId('trigger')).toBeDisabled()
    })
  })
})
