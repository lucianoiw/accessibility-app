import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next-themes
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: { children: React.ReactNode; [key: string]: unknown }) => (
    <div data-testid="theme-provider" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}))

import { ThemeProvider } from '@/components/ui/theme-provider'

describe('ThemeProvider component', () => {
  it('renders children', () => {
    render(
      <ThemeProvider>
        <div>Child content</div>
      </ThemeProvider>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('passes props to NextThemesProvider', () => {
    render(
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div>Content</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId('theme-provider')
    const props = JSON.parse(provider.getAttribute('data-props') || '{}')

    expect(props.attribute).toBe('class')
    expect(props.defaultTheme).toBe('system')
    expect(props.enableSystem).toBe(true)
    expect(props.disableTransitionOnChange).toBe(true)
  })

  it('can render multiple children', () => {
    render(
      <ThemeProvider>
        <header>Header</header>
        <main>Main content</main>
        <footer>Footer</footer>
      </ThemeProvider>
    )

    expect(screen.getByText('Header')).toBeInTheDocument()
    expect(screen.getByText('Main content')).toBeInTheDocument()
    expect(screen.getByText('Footer')).toBeInTheDocument()
  })

  it('passes through storageKey prop', () => {
    render(
      <ThemeProvider storageKey="my-theme-key">
        <div>Content</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId('theme-provider')
    const props = JSON.parse(provider.getAttribute('data-props') || '{}')

    expect(props.storageKey).toBe('my-theme-key')
  })

  it('passes through themes prop', () => {
    render(
      <ThemeProvider themes={['light', 'dark', 'sepia']}>
        <div>Content</div>
      </ThemeProvider>
    )

    const provider = screen.getByTestId('theme-provider')
    const props = JSON.parse(provider.getAttribute('data-props') || '{}')

    expect(props.themes).toEqual(['light', 'dark', 'sepia'])
  })
})
