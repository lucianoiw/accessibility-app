import { describe, it, expect, vi } from 'vitest'

// Mock next/font/google to return predictable font objects
vi.mock('next/font/google', () => ({
  Geist: () => ({
    variable: '--font-geist-sans',
    className: 'geist-sans-class',
  }),
  Geist_Mono: () => ({
    variable: '--font-geist-mono',
    className: 'geist-mono-class',
  }),
}))

import { geistSans, geistMono } from '@/styles/fonts'

describe('Fonts configuration', () => {
  describe('geistSans', () => {
    it('is defined', () => {
      expect(geistSans).toBeDefined()
    })

    it('has correct CSS variable', () => {
      expect(geistSans.variable).toBe('--font-geist-sans')
    })

    it('has className property', () => {
      expect(geistSans.className).toBeDefined()
    })
  })

  describe('geistMono', () => {
    it('is defined', () => {
      expect(geistMono).toBeDefined()
    })

    it('has correct CSS variable', () => {
      expect(geistMono.variable).toBe('--font-geist-mono')
    })

    it('has className property', () => {
      expect(geistMono.className).toBeDefined()
    })
  })
})
