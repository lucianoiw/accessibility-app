import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock next-intl
const { mockUseTranslations } = vi.hoisted(() => ({
  mockUseTranslations: vi.fn(() => (key: string) => {
    const translations: Record<string, string> = {
      'period.label': 'Periodo',
      'period.7d': 'Ultimos 7 dias',
      'period.30d': 'Ultimos 30 dias',
      'period.90d': 'Ultimos 90 dias',
      'period.1y': 'Ultimo ano',
      'period.all': 'Todo o historico',
    }
    return translations[key] || key
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: mockUseTranslations,
}))

import { PeriodSelector } from '@/components/audit/evolution/period-selector'

describe('PeriodSelector', () => {
  const user = userEvent.setup()
  const mockOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders with 7d value selected', () => {
      render(<PeriodSelector value="7d" onChange={mockOnChange} />)
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByText('Ultimos 7 dias')).toBeInTheDocument()
    })

    it('renders with 30d value selected', () => {
      render(<PeriodSelector value="30d" onChange={mockOnChange} />)
      expect(screen.getByText('Ultimos 30 dias')).toBeInTheDocument()
    })

    it('renders with 90d value selected', () => {
      render(<PeriodSelector value="90d" onChange={mockOnChange} />)
      expect(screen.getByText('Ultimos 90 dias')).toBeInTheDocument()
    })

    it('renders with 1y value selected', () => {
      render(<PeriodSelector value="1y" onChange={mockOnChange} />)
      expect(screen.getByText('Ultimo ano')).toBeInTheDocument()
    })

    it('renders with all value selected', () => {
      render(<PeriodSelector value="all" onChange={mockOnChange} />)
      expect(screen.getByText('Todo o historico')).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('opens dropdown when clicked', async () => {
      render(<PeriodSelector value="30d" onChange={mockOnChange} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // Should show all options
      expect(screen.getAllByText('Ultimos 7 dias').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Ultimos 30 dias').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Ultimos 90 dias').length).toBeGreaterThanOrEqual(1)
    })

    it('calls onChange when option is selected', async () => {
      render(<PeriodSelector value="30d" onChange={mockOnChange} />)

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      // Find and click the 7d option
      const option = screen.getByRole('option', { name: 'Ultimos 7 dias' })
      await user.click(option)

      expect(mockOnChange).toHaveBeenCalledWith('7d')
    })
  })

  describe('custom className', () => {
    it('applies custom className to trigger', () => {
      render(
        <PeriodSelector value="30d" onChange={mockOnChange} className="custom-class" />
      )
      const combobox = screen.getByRole('combobox')
      expect(combobox.className).toContain('custom-class')
    })
  })
})
