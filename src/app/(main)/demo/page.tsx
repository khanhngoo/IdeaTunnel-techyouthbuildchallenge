'use client'

import { createContext, useContext } from 'react'
import dynamic from 'next/dynamic'
import fanoutDemoData from '@/lib/demo-data/fanout-demo.json'
import smartRewriteDemoData from '@/lib/demo-data/smart-rewrite-demo.json'

// Create demo mode context
export const DemoModeContext = createContext({
  isDemoMode: true,
  fanoutData: fanoutDemoData,
  smartRewriteData: smartRewriteDemoData
})

export function useDemoMode() {
  return useContext(DemoModeContext)
}

// Dynamically import Canvas to avoid SSR issues with tldraw
const Canvas = dynamic(() => import('@/features/workflow/components/Canvas'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen">
      <p>Loading demo canvas...</p>
    </div>
  )
})

export default function DemoPage() {
  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode: true,
        fanoutData: fanoutDemoData,
        smartRewriteData: smartRewriteDemoData
      }}
    >
      <div className="fixed inset-0 flex flex-col">
        {/* Demo banner */}
        <div className="bg-yellow-500 text-black px-4 py-2 text-center font-semibold z-50">
          🎭 DEMO MODE - Using pre-loaded JSON data (no API calls)
        </div>
        {/* Canvas */}
        <div className="flex-1 relative">
          <Canvas persistenceKey="demo-workflow" />
        </div>
      </div>
    </DemoModeContext.Provider>
  )
}