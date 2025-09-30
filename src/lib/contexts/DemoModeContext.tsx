'use client'

import { createContext, useContext } from 'react'

interface DemoModeContextType {
  isDemoMode: boolean
  fanoutData?: any
  smartRewriteData?: any
}

// Create context with safe default values
const DemoModeContext = createContext<DemoModeContextType>({
  isDemoMode: false,
  fanoutData: undefined,
  smartRewriteData: undefined
})

// Safe hook that won't crash if context is not available
export function useDemoMode(): DemoModeContextType {
  try {
    const context = useContext(DemoModeContext)
    return context || { isDemoMode: false }
  } catch {
    return { isDemoMode: false }
  }
}

export { DemoModeContext }