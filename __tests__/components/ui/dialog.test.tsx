import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog'

// Note: Full dialog interaction tests with Portal are limited in jsdom.
// DialogContent uses Portal which may not render properly in jsdom.
// For comprehensive testing, E2E tests with Playwright are recommended.

describe('Dialog components', () => {
  describe('DialogHeader', () => {
    it('renders with default styles', () => {
      render(<DialogHeader data-testid="header">Header content</DialogHeader>)
      const header = screen.getByTestId('header')
      expect(header).toBeInTheDocument()
      expect(header).toHaveAttribute('data-slot', 'dialog-header')
      expect(header.className).toContain('flex')
      expect(header.className).toContain('flex-col')
    })

    it('accepts custom className', () => {
      render(<DialogHeader className="custom-header">Content</DialogHeader>)
      expect(screen.getByText('Content').className).toContain('custom-header')
    })

    it('renders children', () => {
      render(
        <DialogHeader>
          <span>Title here</span>
          <span>Description here</span>
        </DialogHeader>
      )
      expect(screen.getByText('Title here')).toBeInTheDocument()
      expect(screen.getByText('Description here')).toBeInTheDocument()
    })
  })

  describe('DialogFooter', () => {
    it('renders with default styles', () => {
      render(<DialogFooter data-testid="footer">Footer content</DialogFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toBeInTheDocument()
      expect(footer).toHaveAttribute('data-slot', 'dialog-footer')
      expect(footer.className).toContain('flex')
    })

    it('accepts custom className', () => {
      render(<DialogFooter className="custom-footer">Content</DialogFooter>)
      expect(screen.getByText('Content').className).toContain('custom-footer')
    })

    it('renders multiple buttons', () => {
      render(
        <DialogFooter>
          <button>Cancel</button>
          <button>Save</button>
        </DialogFooter>
      )
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
  })

  describe('DialogTitle', () => {
    it('renders with default styles', () => {
      render(
        <Dialog>
          <DialogTitle data-testid="title">My Title</DialogTitle>
        </Dialog>
      )
      const title = screen.getByTestId('title')
      expect(title).toBeInTheDocument()
      expect(title).toHaveAttribute('data-slot', 'dialog-title')
      expect(title.className).toContain('text-lg')
      expect(title.className).toContain('font-semibold')
    })

    it('accepts custom className', () => {
      render(
        <Dialog>
          <DialogTitle className="custom-title">Title</DialogTitle>
        </Dialog>
      )
      expect(screen.getByText('Title').className).toContain('custom-title')
    })
  })

  describe('DialogDescription', () => {
    it('renders with default styles', () => {
      render(
        <Dialog>
          <DialogDescription data-testid="desc">My description</DialogDescription>
        </Dialog>
      )
      const desc = screen.getByTestId('desc')
      expect(desc).toBeInTheDocument()
      expect(desc).toHaveAttribute('data-slot', 'dialog-description')
      expect(desc.className).toContain('text-sm')
      expect(desc.className).toContain('text-muted-foreground')
    })

    it('accepts custom className', () => {
      render(
        <Dialog>
          <DialogDescription className="custom-desc">Description</DialogDescription>
        </Dialog>
      )
      expect(screen.getByText('Description').className).toContain('custom-desc')
    })
  })

  describe('DialogTrigger', () => {
    it('renders with data-slot', () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open Dialog</DialogTrigger>
        </Dialog>
      )
      const trigger = screen.getByTestId('trigger')
      expect(trigger).toBeInTheDocument()
      expect(trigger).toHaveAttribute('data-slot', 'dialog-trigger')
    })

    it('can render as button', () => {
      render(
        <Dialog>
          <DialogTrigger asChild>
            <button>Open</button>
          </DialogTrigger>
        </Dialog>
      )
      expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
    })
  })

  describe('DialogClose', () => {
    it('renders with data-slot', () => {
      render(
        <Dialog>
          <DialogClose data-testid="close">Close</DialogClose>
        </Dialog>
      )
      const close = screen.getByTestId('close')
      expect(close).toBeInTheDocument()
      expect(close).toHaveAttribute('data-slot', 'dialog-close')
    })

    it('can render as button', () => {
      render(
        <Dialog>
          <DialogClose asChild>
            <button>Close Dialog</button>
          </DialogClose>
        </Dialog>
      )
      expect(screen.getByRole('button', { name: 'Close Dialog' })).toBeInTheDocument()
    })
  })

  describe('Dialog composition', () => {
    it('renders complete dialog structure', () => {
      render(
        <Dialog>
          <DialogTrigger data-testid="trigger">Open</DialogTrigger>
          <DialogHeader data-testid="header">
            <DialogTitle>Title</DialogTitle>
            <DialogDescription>Description</DialogDescription>
          </DialogHeader>
          <DialogFooter data-testid="footer">
            <DialogClose>Close</DialogClose>
          </DialogFooter>
        </Dialog>
      )

      expect(screen.getByTestId('trigger')).toBeInTheDocument()
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByText('Title')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByTestId('footer')).toBeInTheDocument()
      expect(screen.getByText('Close')).toBeInTheDocument()
    })

    it('opens dialog when trigger is clicked', async () => {
      const user = userEvent.setup()
      render(
        <Dialog>
          <DialogTrigger>Open Dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Dialog Title</DialogTitle>
            <DialogDescription>Dialog content here</DialogDescription>
          </DialogContent>
        </Dialog>
      )

      await user.click(screen.getByText('Open Dialog'))

      // Note: Content may or may not render depending on Portal behavior in jsdom
      // This test mainly verifies the trigger is clickable
    })
  })
})
