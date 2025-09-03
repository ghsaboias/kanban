import { render, type RenderOptions } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ToastProvider } from '../ui/ToastProvider'
import { AppearanceProvider } from '../appearance'

// Wrapper component with all necessary providers
export const AllTheProviders = ({ children }: { children: ReactNode }) => {
    return (
        <div data-testid="clerk-provider">
            <AppearanceProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AppearanceProvider>
        </div>
    )
}

// Custom render function that includes all providers
const customRender = (
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from testing-library
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react'

// Override render method
// eslint-disable-next-line react-refresh/only-export-components
export { customRender as render }
