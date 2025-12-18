/**
 * Executa tarefas em paralelo com limite de concorrência
 */
export async function runInParallel<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = []
  let currentIndex = 0

  async function worker(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++
      const item = items[index]
      try {
        results[index] = await fn(item, index)
      } catch (error) {
        console.error(`Error processing item ${index}:`, error)
        results[index] = undefined as R
      }
    }
  }

  // Criar workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker())

  await Promise.all(workers)

  return results
}
