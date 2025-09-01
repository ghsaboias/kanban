import { render, type RenderOptions } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ThemeProvider } from '../theme/ThemeProvider'
import { UIProvider } from '../ui/UIProvider'

// Wrapper component with all necessary providers
const AllTheProviders = ({ children }: { children: ReactNode }) => {
    return (
        <div data-testid="clerk-provider">
            <ThemeProvider>
                <UIProvider>
                    {children}
                </UIProvider>
            </ThemeProvider>
        </div>
    )
}

// Custom render function that includes all providers
const customRender = (
    ui: React.ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from testing-library
export * from '@testing-library/react'

// Override render method
export { customRender as render }
