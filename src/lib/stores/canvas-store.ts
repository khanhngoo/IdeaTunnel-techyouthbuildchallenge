import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CanvasData {
  id: string
  title: string
  summary: string
  data: any // Tldraw document data
  createdAt: number
  updatedAt: number
}

interface CanvasStore {
  canvases: Record<string, CanvasData>
  currentCanvasId: string | null
  
  // Actions
  createCanvas: (title?: string) => string
  switchCanvas: (canvasId: string) => void
  updateCanvas: (canvasId: string, updates: Partial<CanvasData>) => void
  updateCanvasData: (canvasId: string, data: any) => void
  deleteCanvas: (canvasId: string) => void
  getCurrentCanvas: () => CanvasData | null
  getCanvasById: (canvasId: string) => CanvasData | null
  getAllCanvases: () => CanvasData[]
}

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set, get) => ({
      canvases: {},
      currentCanvasId: null,

      createCanvas: (title = 'New Chat') => {
        const id = `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        const now = Date.now()
        
        const newCanvas: CanvasData = {
          id,
          title,
          summary: 'New conversation started',
          data: null,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          canvases: {
            ...state.canvases,
            [id]: newCanvas,
          },
          currentCanvasId: id,
        }))

        return id
      },

      switchCanvas: (canvasId: string) => {
        const canvas = get().canvases[canvasId]
        if (canvas) {
          set({ currentCanvasId: canvasId })
        }
      },

      updateCanvas: (canvasId: string, updates: Partial<CanvasData>) => {
        set((state) => {
          const canvas = state.canvases[canvasId]
          if (!canvas) return state

          return {
            canvases: {
              ...state.canvases,
              [canvasId]: {
                ...canvas,
                ...updates,
                updatedAt: Date.now(),
              },
            },
          }
        })
      },

      updateCanvasData: (canvasId: string, data: any) => {
        set((state) => {
          const canvas = state.canvases[canvasId]
          if (!canvas) return state

          return {
            canvases: {
              ...state.canvases,
              [canvasId]: {
                ...canvas,
                data,
                updatedAt: Date.now(),
              },
            },
          }
        })
      },

      deleteCanvas: (canvasId: string) => {
        set((state) => {
          const newCanvases = { ...state.canvases }
          delete newCanvases[canvasId]
          
          let newCurrentId = state.currentCanvasId
          if (state.currentCanvasId === canvasId) {
            const remainingIds = Object.keys(newCanvases)
            newCurrentId = remainingIds.length > 0 ? remainingIds[0] : null
          }

          return {
            canvases: newCanvases,
            currentCanvasId: newCurrentId,
          }
        })
      },

      getCurrentCanvas: () => {
        const state = get()
        return state.currentCanvasId ? state.canvases[state.currentCanvasId] : null
      },

      getCanvasById: (canvasId: string) => {
        return get().canvases[canvasId] || null
      },

      getAllCanvases: () => {
        return Object.values(get().canvases).sort((a, b) => b.updatedAt - a.updatedAt)
      },
    }),
    {
      name: 'canvas-store',
      // Chỉ persist những field cần thiết
      partialize: (state) => ({
        canvases: state.canvases,
        currentCanvasId: state.currentCanvasId,
      }),
    }
  )
)
