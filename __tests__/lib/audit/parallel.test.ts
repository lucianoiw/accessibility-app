import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { runInParallel } from '@/lib/audit/parallel'

describe('runInParallel', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('processes empty array', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const results = await runInParallel([], fn)

    expect(results).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })

  it('processes single item', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const results = await runInParallel(['item1'], fn)

    expect(results).toEqual(['result'])
    expect(fn).toHaveBeenCalledTimes(1)
    expect(fn).toHaveBeenCalledWith('item1', 0)
  })

  it('processes multiple items in order', async () => {
    const fn = vi.fn().mockImplementation((item: string) => Promise.resolve(`processed-${item}`))
    const items = ['a', 'b', 'c', 'd', 'e']
    const results = await runInParallel(items, fn)

    expect(results).toEqual([
      'processed-a',
      'processed-b',
      'processed-c',
      'processed-d',
      'processed-e',
    ])
    expect(fn).toHaveBeenCalledTimes(5)
  })

  it('passes correct index to function', async () => {
    const fn = vi.fn().mockImplementation((item: string, index: number) =>
      Promise.resolve(`${item}-${index}`)
    )
    const items = ['a', 'b', 'c']
    const results = await runInParallel(items, fn)

    expect(results).toEqual(['a-0', 'b-1', 'c-2'])
    expect(fn).toHaveBeenCalledWith('a', 0)
    expect(fn).toHaveBeenCalledWith('b', 1)
    expect(fn).toHaveBeenCalledWith('c', 2)
  })

  it('respects default concurrency of 5', async () => {
    // Track concurrent executions
    let currentConcurrency = 0
    let maxConcurrency = 0

    const fn = vi.fn().mockImplementation(async () => {
      currentConcurrency++
      maxConcurrency = Math.max(maxConcurrency, currentConcurrency)
      await new Promise(resolve => setTimeout(resolve, 10))
      currentConcurrency--
      return 'done'
    })

    const items = Array(10).fill('item')

    // Run without fake timers for this test
    vi.useRealTimers()
    await runInParallel(items, fn)
    vi.useFakeTimers()

    expect(fn).toHaveBeenCalledTimes(10)
    expect(maxConcurrency).toBeLessThanOrEqual(5)
  })

  it('respects custom concurrency limit', async () => {
    let currentConcurrency = 0
    let maxConcurrency = 0

    const fn = vi.fn().mockImplementation(async () => {
      currentConcurrency++
      maxConcurrency = Math.max(maxConcurrency, currentConcurrency)
      await new Promise(resolve => setTimeout(resolve, 10))
      currentConcurrency--
      return 'done'
    })

    const items = Array(10).fill('item')

    vi.useRealTimers()
    await runInParallel(items, fn, 3)
    vi.useFakeTimers()

    expect(fn).toHaveBeenCalledTimes(10)
    expect(maxConcurrency).toBeLessThanOrEqual(3)
  })

  it('handles concurrency higher than item count', async () => {
    const fn = vi.fn().mockResolvedValue('result')
    const items = ['a', 'b']
    const results = await runInParallel(items, fn, 10)

    expect(results).toEqual(['result', 'result'])
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('handles errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fn = vi.fn().mockImplementation(async (item: string) => {
      if (item === 'error') {
        throw new Error('Test error')
      }
      return `processed-${item}`
    })

    const items = ['a', 'error', 'c']
    const results = await runInParallel(items, fn)

    expect(results[0]).toBe('processed-a')
    expect(results[1]).toBeUndefined()
    expect(results[2]).toBe('processed-c')
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('Error processing item 1:', expect.any(Error))

    consoleSpy.mockRestore()
  })

  it('continues processing after error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Error 1'))
      .mockRejectedValueOnce(new Error('Error 2'))
      .mockResolvedValue('success')

    const items = ['a', 'b', 'c', 'd', 'e']
    const results = await runInParallel(items, fn)

    // First two fail, rest succeed
    expect(results[0]).toBeUndefined()
    expect(results[1]).toBeUndefined()
    expect(results.filter(r => r === 'success').length).toBe(3)
    expect(consoleSpy).toHaveBeenCalledTimes(2)

    consoleSpy.mockRestore()
  })

  it('maintains order even with varying execution times', async () => {
    vi.useRealTimers()

    const fn = vi.fn().mockImplementation(async (item: number) => {
      // Vary delay based on item (reverse order)
      const delay = (10 - item) * 5
      await new Promise(resolve => setTimeout(resolve, delay))
      return `result-${item}`
    })

    const items = [1, 2, 3, 4, 5]
    const results = await runInParallel(items, fn)

    // Results should be in original order despite different completion times
    expect(results).toEqual([
      'result-1',
      'result-2',
      'result-3',
      'result-4',
      'result-5',
    ])

    vi.useFakeTimers()
  })

  it('handles async functions that return different types', async () => {
    interface Result {
      value: number
      name: string
    }

    const fn = vi.fn().mockImplementation(async (item: { id: number; label: string }): Promise<Result> => {
      return { value: item.id * 2, name: item.label.toUpperCase() }
    })

    const items = [
      { id: 1, label: 'a' },
      { id: 2, label: 'b' },
    ]
    const results = await runInParallel<typeof items[0], Result>(items, fn)

    expect(results).toEqual([
      { value: 2, name: 'A' },
      { value: 4, name: 'B' },
    ])
  })

  it('works with concurrency of 1 (sequential)', async () => {
    const order: number[] = []

    const fn = vi.fn().mockImplementation(async (item: number) => {
      order.push(item)
      return item
    })

    const items = [1, 2, 3, 4, 5]
    const results = await runInParallel(items, fn, 1)

    expect(results).toEqual([1, 2, 3, 4, 5])
    expect(order).toEqual([1, 2, 3, 4, 5])
    expect(fn).toHaveBeenCalledTimes(5)
  })

  it('handles large arrays efficiently', async () => {
    const fn = vi.fn().mockResolvedValue('done')
    const items = Array(100).fill('item')

    const startTime = Date.now()
    const results = await runInParallel(items, fn)
    const endTime = Date.now()

    expect(results.length).toBe(100)
    expect(fn).toHaveBeenCalledTimes(100)
    // Should complete quickly since mocked functions are instant
    expect(endTime - startTime).toBeLessThan(1000)
  })
})
