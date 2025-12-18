import { render, RenderOptions } from '@testing-library/react'
import { ReactElement, ReactNode } from 'react'
import userEvent from '@testing-library/user-event'

// Add any providers your app needs here
function AllProviders({ children }: { children: ReactNode }) {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllProviders, ...options }),
  }
}

// Re-export everything from testing-library
export * from '@testing-library/react'
export { customRender as render }
export { userEvent }
