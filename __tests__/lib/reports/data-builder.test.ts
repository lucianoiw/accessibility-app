import { describe, it, expect } from 'vitest'
import { generateReportFileName } from '@/lib/reports/data-builder'

describe('generateReportFileName', () => {
  describe('project name sanitization', () => {
    it('converts project name to lowercase', () => {
      const result = generateReportFileName('MyProject', 'executive_pdf')
      expect(result).toContain('myproject')
    })

    it('replaces spaces with hyphens', () => {
      const result = generateReportFileName('My Project Name', 'executive_pdf')
      expect(result).toContain('my-project-name')
    })

    it('replaces special characters with hyphens', () => {
      const result = generateReportFileName('Project@#$Test', 'executive_pdf')
      expect(result).toContain('project-test')
    })

    it('removes leading hyphens', () => {
      const result = generateReportFileName('---Project', 'executive_pdf')
      expect(result).not.toMatch(/--project/)
    })

    it('removes trailing hyphens', () => {
      const result = generateReportFileName('Project---', 'executive_pdf')
      expect(result).not.toMatch(/project--/)
    })

    it('handles accented characters', () => {
      const result = generateReportFileName('Projeto Árvore', 'executive_pdf')
      // Accented characters are removed and replaced with hyphens
      expect(result).toMatch(/relatorio-executivo-projeto-/)
    })
  })

  describe('date formatting', () => {
    it('uses provided date in ISO format (YYYY-MM-DD)', () => {
      const date = new Date('2024-06-15T10:30:00Z')
      const result = generateReportFileName('Project', 'executive_pdf', date)
      expect(result).toContain('2024-06-15')
    })

    it('uses current date when not provided', () => {
      const result = generateReportFileName('Project', 'executive_pdf')
      const today = new Date().toISOString().split('T')[0]
      expect(result).toContain(today)
    })
  })

  describe('report type labels', () => {
    it('uses "executivo" for executive_pdf', () => {
      const result = generateReportFileName('Project', 'executive_pdf')
      expect(result).toContain('relatorio-executivo')
    })

    it('uses "tecnico" for technical_pdf', () => {
      const result = generateReportFileName('Project', 'technical_pdf')
      expect(result).toContain('relatorio-tecnico')
    })

    it('uses "dados" for csv', () => {
      const result = generateReportFileName('Project', 'csv')
      expect(result).toContain('relatorio-dados')
    })

    it('uses "dados" for json', () => {
      const result = generateReportFileName('Project', 'json')
      expect(result).toContain('relatorio-dados')
    })
  })

  describe('file extensions', () => {
    it('uses .pdf extension for executive_pdf', () => {
      const result = generateReportFileName('Project', 'executive_pdf')
      expect(result).toMatch(/\.pdf$/)
    })

    it('uses .pdf extension for technical_pdf', () => {
      const result = generateReportFileName('Project', 'technical_pdf')
      expect(result).toMatch(/\.pdf$/)
    })

    it('uses .csv extension for csv', () => {
      const result = generateReportFileName('Project', 'csv')
      expect(result).toMatch(/\.csv$/)
    })

    it('uses .json extension for json', () => {
      const result = generateReportFileName('Project', 'json')
      expect(result).toMatch(/\.json$/)
    })
  })

  describe('full filename format', () => {
    it('generates correct full filename pattern', () => {
      const date = new Date('2024-03-20')
      const result = generateReportFileName('My Website', 'executive_pdf', date)
      expect(result).toBe('relatorio-executivo-my-website-2024-03-20.pdf')
    })

    it('generates correct filename for technical report', () => {
      const date = new Date('2024-03-20')
      const result = generateReportFileName('Test Site', 'technical_pdf', date)
      expect(result).toBe('relatorio-tecnico-test-site-2024-03-20.pdf')
    })

    it('generates correct filename for CSV export', () => {
      const date = new Date('2024-03-20')
      const result = generateReportFileName('Example', 'csv', date)
      expect(result).toBe('relatorio-dados-example-2024-03-20.csv')
    })

    it('generates correct filename for JSON export', () => {
      const date = new Date('2024-03-20')
      const result = generateReportFileName('Site Test', 'json', date)
      expect(result).toBe('relatorio-dados-site-test-2024-03-20.json')
    })
  })

  describe('edge cases', () => {
    it('handles empty project name', () => {
      const result = generateReportFileName('', 'executive_pdf')
      expect(result).toMatch(/^relatorio-executivo--/)
    })

    it('handles project name with only special characters', () => {
      const result = generateReportFileName('@#$%^&*()', 'executive_pdf')
      expect(result).toMatch(/^relatorio-executivo--/)
    })

    it('handles very long project names', () => {
      const longName = 'a'.repeat(100)
      const result = generateReportFileName(longName, 'executive_pdf')
      expect(result).toContain(longName)
    })

    it('handles project name with numbers', () => {
      const result = generateReportFileName('Project 123 Test', 'executive_pdf')
      expect(result).toContain('project-123-test')
    })

    it('handles project name with consecutive special characters', () => {
      const result = generateReportFileName('Project---Test', 'executive_pdf')
      // Multiple hyphens should be collapsed to single hyphen
      expect(result).not.toMatch(/--/)
    })
  })
})
