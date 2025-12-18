import { describe, it, expect } from 'vitest'
import { cn } from '@/utils/functions/cn'

describe('cn utility function', () => {
  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })

  it('handles single class', () => {
    expect(cn('foo')).toBe('foo')
  })

  it('handles multiple classes', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
    expect(cn('foo', true && 'bar', 'baz')).toBe('foo bar baz')
  })

  it('handles undefined and null', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
    expect(cn('baz', ['foo', 'bar'])).toBe('baz foo bar')
  })

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz')
  })

  it('merges Tailwind classes correctly', () => {
    // twMerge should handle conflicting classes
    expect(cn('px-2', 'px-4')).toBe('px-4')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles complex Tailwind merging', () => {
    expect(cn('bg-red-500 text-white', 'bg-blue-500')).toBe('text-white bg-blue-500')
    expect(cn('p-4', 'px-2')).toBe('p-4 px-2')
    expect(cn('p-4', 'p-2')).toBe('p-2')
  })

  it('handles responsive classes', () => {
    expect(cn('md:px-2', 'md:px-4')).toBe('md:px-4')
    expect(cn('px-2', 'md:px-4')).toBe('px-2 md:px-4')
  })

  it('handles state variants', () => {
    expect(cn('hover:bg-red-500', 'hover:bg-blue-500')).toBe('hover:bg-blue-500')
  })

  it('handles mixed input types', () => {
    expect(
      cn(
        'base-class',
        true && 'conditional-true',
        false && 'conditional-false',
        { 'object-true': true, 'object-false': false },
        ['array-class-1', 'array-class-2'],
        undefined,
        null
      )
    ).toBe('base-class conditional-true object-true array-class-1 array-class-2')
  })

  it('handles empty strings', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar')
  })

  it('handles whitespace strings', () => {
    expect(cn('foo', '  ', 'bar')).toBe('foo bar')
  })

  it('deduplicates Tailwind classes via twMerge', () => {
    // twMerge only deduplicates Tailwind classes, not arbitrary classes
    expect(cn('bg-red-500', 'bg-red-500')).toBe('bg-red-500')
    expect(cn('p-4', 'p-4')).toBe('p-4')
  })
})
