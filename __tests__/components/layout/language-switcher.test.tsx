import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-intl and navigation
const { mockUseLocale, mockUseRouter, mockUsePathname } = vi.hoisted(() => ({
  mockUseLocale: vi.fn(() => 'pt-BR'),
  mockUseRouter: vi.fn(() => ({
    replace: vi.fn(),
    push: vi.fn(),
  })),
  mockUsePathname: vi.fn(() => '/projects'),
}))

vi.mock('next-intl', () => ({
  useLocale: mockUseLocale,
}))

vi.mock('@/i18n/navigation', () => ({
  useRouter: mockUseRouter,
  usePathname: mockUsePathname,
}))

import { LanguageSwitcher } from '@/components/layout/language-switcher'

describe('LanguageSwitcher', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders globe icon button', () => {
      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()

      // Check for Globe icon
      const icon = document.querySelector('.lucide-globe')
      expect(icon).toBeInTheDocument()
    })

    it('opens dropdown menu when clicked', async () => {
      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      // Check for all locale options
      expect(screen.getByText('Português')).toBeInTheDocument()
      expect(screen.getByText('English')).toBeInTheDocument()
      expect(screen.getByText('Español')).toBeInTheDocument()
    })

    it('displays flags for each locale', async () => {
      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      expect(screen.getByText('🇧🇷')).toBeInTheDocument()
      expect(screen.getByText('🇺🇸')).toBeInTheDocument()
      expect(screen.getByText('🇪🇸')).toBeInTheDocument()
    })

    it('highlights current locale', async () => {
      mockUseLocale.mockReturnValue('en')
      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const englishItem = screen.getByText('English').closest('[role="menuitem"]')
      expect(englishItem).toHaveClass('bg-accent')
    })
  })

  describe('interactions', () => {
    it('changes locale to English when clicked', async () => {
      const mockReplace = vi.fn()
      mockUseRouter.mockReturnValue({ replace: mockReplace })
      mockUseLocale.mockReturnValue('pt-BR')
      mockUsePathname.mockReturnValue('/projects')

      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const englishItem = screen.getByText('English')
      await user.click(englishItem)

      expect(mockReplace).toHaveBeenCalledWith('/projects', { locale: 'en' })
    })

    it('changes locale to Spanish when clicked', async () => {
      const mockReplace = vi.fn()
      mockUseRouter.mockReturnValue({ replace: mockReplace })
      mockUseLocale.mockReturnValue('pt-BR')
      mockUsePathname.mockReturnValue('/dashboard')

      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const spanishItem = screen.getByText('Español')
      await user.click(spanishItem)

      expect(mockReplace).toHaveBeenCalledWith('/dashboard', { locale: 'es' })
    })

    it('preserves current pathname when changing locale', async () => {
      const mockReplace = vi.fn()
      mockUseRouter.mockReturnValue({ replace: mockReplace })
      mockUsePathname.mockReturnValue('/projects/123/audits')

      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const englishItem = screen.getByText('English')
      await user.click(englishItem)

      expect(mockReplace).toHaveBeenCalledWith('/projects/123/audits', { locale: 'en' })
    })
  })

  describe('accessibility', () => {
    it('has proper button role', () => {
      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      expect(button).toBeEnabled()
    })

    it('menu items have proper role', async () => {
      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')
      await user.click(button)

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(3)
    })

    it('can be navigated with keyboard', async () => {
      render(<LanguageSwitcher />)

      const button = screen.getByRole('button')

      // Focus button
      button.focus()
      expect(button).toHaveFocus()

      // Open with Enter
      await user.keyboard('{Enter}')
      expect(screen.getByText('Português')).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('falls back to pt-BR if locale is unknown', () => {
      mockUseLocale.mockReturnValue('unknown-locale')
      render(<LanguageSwitcher />)

      // Should not crash and should render
      const button = screen.getByRole('button')
      expect(button).toBeInTheDocument()
    })

    it('handles all supported locales', async () => {
      const locales = ['pt-BR', 'en', 'es']

      for (const locale of locales) {
        mockUseLocale.mockReturnValue(locale)
        const { unmount } = render(<LanguageSwitcher />)

        const button = screen.getByRole('button')
        expect(button).toBeInTheDocument()

        unmount()
      }
    })
  })
})
