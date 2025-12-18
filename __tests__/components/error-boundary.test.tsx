import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '@/components/error-boundary'

// Component that throws an error
function ThrowError({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for cleaner test output
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })

  afterEach(() => {
    console.error = originalError
  })

  describe('rendering', () => {
    it('renders children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Test content')).toBeInTheDocument()
    })

    it('renders error UI when error is caught', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
      expect(
        screen.getByText('Ocorreu um erro inesperado. Por favor, tente recarregar a página.')
      ).toBeInTheDocument()
    })

    it('renders AlertTriangle icon when error occurs', () => {
      const { container } = render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      // Icon should be in the DOM (Lucide renders as SVG with lucide-triangle-alert class)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveClass('lucide-triangle-alert')
    })

    it('renders reload button when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const button = screen.getByRole('button', { name: /recarregar página/i })
      expect(button).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('reloads page when reload button is clicked', async () => {
      const user = userEvent.setup()
      const reloadMock = vi.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      })

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const button = screen.getByRole('button', { name: /recarregar página/i })
      await user.click(button)

      expect(reloadMock).toHaveBeenCalledOnce()
    })
  })

  describe('error handling', () => {
    it('logs error to console when error is caught', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error')

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('does not render error UI when child does not throw', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Algo deu errado')).not.toBeInTheDocument()
      expect(screen.getByText('No error')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper heading hierarchy', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const heading = screen.getByRole('heading', { name: /algo deu errado/i })
      expect(heading).toBeInTheDocument()
      expect(heading.tagName).toBe('H2')
    })

    it('has accessible button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )

      const button = screen.getByRole('button', { name: /recarregar página/i })
      expect(button).toBeEnabled()
    })
  })
})
