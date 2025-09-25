import { useCanvasStore } from '../canvas-store'

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('Canvas Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useCanvasStore.setState({
      canvases: {},
      currentCanvasId: null,
    })
    localStorageMock.clear()
  })

  test('should create a new canvas', () => {
    const canvasId = useCanvasStore.getState().createCanvas('Test Canvas')
    
    expect(canvasId).toBeDefined()
    expect(canvasId).toMatch(/^canvas_\d+_[a-z0-9]+$/)
    
    const canvas = useCanvasStore.getState().getCanvasById(canvasId)
    expect(canvas).toBeDefined()
    expect(canvas?.title).toBe('Test Canvas')
    expect(canvas?.summary).toBe('New conversation started')
  })

  test('should switch between canvases', () => {
    const canvas1Id = useCanvasStore.getState().createCanvas('Canvas 1')
    const canvas2Id = useCanvasStore.getState().createCanvas('Canvas 2')
    
    // Should start with canvas2 as current (last created)
    expect(useCanvasStore.getState().currentCanvasId).toBe(canvas2Id)
    
    // Switch to canvas1
    useCanvasStore.getState().switchCanvas(canvas1Id)
    expect(useCanvasStore.getState().currentCanvasId).toBe(canvas1Id)
  })

  test('should update canvas data', () => {
    const canvasId = useCanvasStore.getState().createCanvas('Test Canvas')
    const testData = { shapes: [], bindings: [] }
    
    useCanvasStore.getState().updateCanvasData(canvasId, testData)
    
    const canvas = useCanvasStore.getState().getCanvasById(canvasId)
    expect(canvas?.data).toEqual(testData)
  })

  test('should update canvas metadata', () => {
    const canvasId = useCanvasStore.getState().createCanvas('Original Title')
    
    useCanvasStore.getState().updateCanvas(canvasId, {
      title: 'Updated Title',
      summary: 'Updated summary'
    })
    
    const canvas = useCanvasStore.getState().getCanvasById(canvasId)
    expect(canvas?.title).toBe('Updated Title')
    expect(canvas?.summary).toBe('Updated summary')
  })

  test('should delete canvas', () => {
    const canvas1Id = useCanvasStore.getState().createCanvas('Canvas 1')
    const canvas2Id = useCanvasStore.getState().createCanvas('Canvas 2')
    
    // Delete canvas1
    useCanvasStore.getState().deleteCanvas(canvas1Id)
    
    expect(useCanvasStore.getState().getCanvasById(canvas1Id)).toBeNull()
    expect(useCanvasStore.getState().getCanvasById(canvas2Id)).toBeDefined()
    // Should switch to remaining canvas
    expect(useCanvasStore.getState().currentCanvasId).toBe(canvas2Id)
  })

  test('should get all canvases sorted by updatedAt', () => {
    const canvas1Id = useCanvasStore.getState().createCanvas('Canvas 1')
    // Wait a bit to ensure different timestamps
    setTimeout(() => {
      const canvas2Id = useCanvasStore.getState().createCanvas('Canvas 2')
      
      const allCanvases = useCanvasStore.getState().getAllCanvases()
      expect(allCanvases).toHaveLength(2)
      expect(allCanvases[0].id).toBe(canvas2Id) // Most recent first
      expect(allCanvases[1].id).toBe(canvas1Id)
    }, 10)
  })

  test('should get current canvas', () => {
    expect(useCanvasStore.getState().getCurrentCanvas()).toBeNull()
    
    const canvasId = useCanvasStore.getState().createCanvas('Test Canvas')
    const currentCanvas = useCanvasStore.getState().getCurrentCanvas()
    
    expect(currentCanvas).toBeDefined()
    expect(currentCanvas?.id).toBe(canvasId)
  })
})
