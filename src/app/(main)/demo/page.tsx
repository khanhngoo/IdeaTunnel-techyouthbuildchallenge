'use client'

import dynamic from 'next/dynamic'
import fanoutDemoData from '@/lib/demo-data/fanout-demo.json'
import smartRewriteDemoData from '@/lib/demo-data/smart-rewrite-demo.json'
import { DemoModeContext } from '@/lib/contexts/DemoModeContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'

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
      <div className="fixed inset-0">
        <ErrorBoundary>
          <Canvas persistenceKey="demo-workflow" />
        </ErrorBoundary>
      </div>
    </DemoModeContext.Provider>
  )
}